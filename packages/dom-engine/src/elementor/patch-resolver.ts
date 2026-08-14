// @forge/dom-engine
// Elementor patch resolution (Sprint 25).
//
// Given a ContentPatch, resolve the concrete Elementor target before any
// mutation occurs:
//
//   project → page → UniversalPage → target node → provider representation
//   → editable field → current value
//
// Resolution is deterministic and conservative. Failure produces a typed code:
//   PATCH_TARGET_NOT_FOUND      — the element/setting does not exist
//   PATCH_TARGET_AMBIGUOUS      — multiple targets match a semantic intent
//   PATCH_TARGET_NOT_EDITABLE   — the target exists but is not an editable field
//   PATCH_STALE                 — current content no longer matches the patch
//   PATCH_UNSUPPORTED_WIDGET    — the widget type is unknown or refused
//   PATCH_UNSUPPORTED_VERSION   — the Elementor document version is unsupported
//   PATCH_INVALID_TARGET        — the patch carries no usable target
//
// Stale patches are never silently applied.

import type { ContentNode } from "../types.js";
import type { ElementorDocument } from "./document.js";
import { checkElementorDocumentSupport } from "./document.js";
import { findNodeById } from "../tree/tree-node.js";
import {
  normalizeElementorWidgetType,
  isKnownElementorWidget,
  resolveElementorSettingsKey,
  ELEMENTOR_UNSUPPORTED_WIDGETS,
  isElementorRichTextSetting,
} from "./widget-schema.js";
import { resolveElementorSettingPath, getNestedSetting } from "./setting-path.js";
import { textContentOfRichText, normalizeText } from "./rich-text.js";

/**
 * Error codes produced by patch resolution.
 */
export type ElementorPatchResolutionCode =
  | "PATCH_TARGET_NOT_FOUND"
  | "PATCH_TARGET_AMBIGUOUS"
  | "PATCH_TARGET_NOT_EDITABLE"
  | "PATCH_STALE"
  | "PATCH_UNSUPPORTED_WIDGET"
  | "PATCH_UNSUPPORTED_VERSION"
  | "PATCH_INVALID_TARGET";

/**
 * How a target was located within the document.
 */
export type ElementorTargetStrategy = "element-id" | "semantic-intent" | "text-anchor";

/**
 * A fully resolved, validated patch target.
 */
export interface ResolvedElementorTarget {
  /** Elementor element id. */
  readonly elementId: string;
  /** Elementor widget type (normalized), when the target is a widget. */
  readonly widgetType?: string;
  /** Elementor element type (container/section/column/widget). */
  readonly elType: string;
  /** Human label for the editable setting (e.g. "title", "editor"). */
  readonly settingsKey: string;
  /** Path into `settings` (handles nested controls like image.alt). */
  readonly settingsPath: string[];
  /** Current value captured at resolution time. */
  readonly currentValue: unknown;
  /** Proposed value from the patch. */
  readonly proposedValue: unknown;
  /** Whether the control expects rich text. */
  readonly richText: boolean;
  /** How the target was located. */
  readonly strategy: ElementorTargetStrategy;
  /** Breadcrumb of element types from the document root (for preview). */
  readonly elementPath: string[];
}

/**
 * Successful resolution.
 */
export interface ElementorPatchResolutionOk {
  readonly ok: true;
  readonly targets: ResolvedElementorTarget[];
}

/**
 * Failed resolution.
 */
export interface ElementorPatchResolutionError {
  readonly ok: false;
  readonly code: ElementorPatchResolutionCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export type ElementorPatchResolution = ElementorPatchResolutionOk | ElementorPatchResolutionError;

/**
 * Minimal patch shape accepted by the resolver (structural, provider-neutral).
 * Compatible with both @forge/content-generation and @forge/dom-engine patches.
 */
export interface ElementorPatchLike {
  readonly id?: string;
  readonly currentContent?: string;
  readonly proposedContent: string;
  readonly target?: { readonly format: "elementor"; readonly elementId: string; readonly settingsKey: string };
  readonly semanticIntent?: { readonly kind: string; readonly value?: string; readonly sectionKind?: string };
  /** Optional captured document fingerprint — extra stale protection. */
  readonly sourceFingerprint?: string;
}

export interface ElementorResolveOptions {
  /** If provided, the document fingerprint captured when the patch was created. */
  readonly expectedFingerprint?: string;
}

/**
 * Resolve a ContentPatch against an ElementorDocument.
 *
 * Resolution performs:
 * 1. Document format/version gate (unsupported → PATCH_UNSUPPORTED_VERSION).
 * 2. Target location (element-id or semantic-intent).
 * 3. Editable-field mapping (conservative widget schema).
 * 4. Stale-patch check (current value vs patch.currentContent).
 */
export function resolveElementorPatch(
  document: ElementorDocument | null,
  patch: ElementorPatchLike,
  options: ElementorResolveOptions = {},
): ElementorPatchResolution {
  const support = checkElementorDocumentSupport(document);
  if (!support.supported) {
    return {
      ok: false,
      code: "PATCH_UNSUPPORTED_VERSION",
      message: support.reason,
      details: { code: support.code },
    };
  }
  if (!document) {
    return { ok: false, code: "PATCH_UNSUPPORTED_VERSION", message: "Elementor document is unavailable." };
  }
  const doc = document;

  // Fingerprint-level staleness (strong signal when the patch captured one).
  if (options.expectedFingerprint && options.expectedFingerprint !== doc.fingerprint) {
    return {
      ok: false,
      code: "PATCH_STALE",
      message: "The Elementor document changed since the patch was created (fingerprint mismatch).",
      details: { expected: options.expectedFingerprint, actual: doc.fingerprint },
    };
  }

  if (patch.target) {
    const single = resolveByElementId(doc, patch, patch.target.elementId, patch.target.settingsKey);
    if (!single.ok) return single;
    return { ok: true, targets: [single.target] };
  }

  if (patch.semanticIntent) {
    return resolveBySemanticIntent(doc, patch);
  }

  return {
    ok: false,
    code: "PATCH_INVALID_TARGET",
    message: "Patch has neither an Elementor target nor a semantic intent.",
  };
}

function resolveByElementId(
  doc: ElementorDocument,
  patch: ElementorPatchLike,
  elementId: string,
  settingsKey: string,
): { ok: true; target: ResolvedElementorTarget } | ElementorPatchResolutionError {
  const node = findNodeById(doc.root, elementId);
  if (!node) {
    return {
      ok: false,
      code: "PATCH_TARGET_NOT_FOUND",
      message: `Elementor element ${elementId} not found in the document.`,
      details: { elementId },
    };
  }

  return resolveNode(doc, patch, node, settingsKey, "element-id");
}

function resolveBySemanticIntent(
  doc: ElementorDocument,
  patch: ElementorPatchLike,
): ElementorPatchResolution {
  const intent = patch.semanticIntent;
  if (!intent) {
    return { ok: false, code: "PATCH_INVALID_TARGET", message: "Missing semantic intent." };
  }
  const kind = intent.kind;
  const candidates = findCandidateNodes(doc.root, kind);

  if (candidates.length === 0) {
    return {
      ok: false,
      code: "PATCH_TARGET_NOT_FOUND",
      message: `No Elementor widget matches semantic intent "${kind}".`,
      details: { kind },
    };
  }

  if (candidates.length > 1) {
    return {
      ok: false,
      code: "PATCH_TARGET_AMBIGUOUS",
      message: `Semantic intent "${kind}" matches ${candidates.length} widgets; the target is ambiguous.`,
      details: { kind, elementIds: candidates.map((c) => c.id) },
    };
  }

  const node = candidates[0];
  if (!node) {
    return { ok: false, code: "PATCH_TARGET_NOT_FOUND", message: `No Elementor widget matches semantic intent "${kind}".` };
  }
  const settingsKey = resolveElementorSettingsKey(node.widgetType, kind);
  if (!settingsKey) {
    return {
      ok: false,
      code: "PATCH_TARGET_NOT_EDITABLE",
      message: `Widget ${node.widgetType} has no editable setting for semantic intent "${kind}".`,
      details: { kind, elementId: node.id, widgetType: node.widgetType },
    };
  }
  const resolved = resolveNode(doc, patch, node, settingsKey, "semantic-intent");
  if (!resolved.ok) return resolved;
  return { ok: true, targets: [resolved.target] };
}

function resolveNode(
  doc: ElementorDocument,
  patch: ElementorPatchLike,
  node: ContentNode,
  settingsKey: string,
  strategy: ElementorTargetStrategy,
): { ok: true; target: ResolvedElementorTarget } | ElementorPatchResolutionError {
  const widgetType = node.widgetType ? normalizeElementorWidgetType(node.widgetType) : undefined;

  if (!node.widgetType || node.type === "container" || node.type === "section" || node.type === "column") {
    return {
      ok: false,
      code: "PATCH_TARGET_NOT_EDITABLE",
      message: `Element ${node.id} (${node.type}) is a layout element, not an editable widget.`,
      details: { elementId: node.id, elType: node.type },
    };
  }

  if (widgetType && ELEMENTOR_UNSUPPORTED_WIDGETS.has(widgetType)) {
    return {
      ok: false,
      code: "PATCH_UNSUPPORTED_WIDGET",
      message: `Widget type "${widgetType}" is unsupported for content patching.`,
      details: { elementId: node.id, widgetType },
    };
  }

  if (!widgetType || !isKnownElementorWidget(widgetType)) {
    return {
      ok: false,
      code: "PATCH_UNSUPPORTED_WIDGET",
      message: `Widget type "${widgetType ?? "unknown"}" is not in the conservative widget schema.`,
      details: { elementId: node.id, widgetType: widgetType ?? null },
    };
  }

  const settingsPath = resolveElementorSettingPath(widgetType, settingsKey);
  const currentValue = getNestedSetting(node.settings, settingsPath);

  // The setting must exist (or be creatable only where the schema says so).
  if (currentValue === undefined && !isNestedCreateAllowed(widgetType, settingsPath)) {
    return {
      ok: false,
      code: "PATCH_TARGET_NOT_FOUND",
      message: `Elementor element ${node.id} has no setting at ${settingsPath.join(".")}.`,
      details: { elementId: node.id, settingsPath },
    };
  }

  // Stale-patch protection: the current content must still match the content
  // the patch was generated against.
  if (patch.currentContent !== undefined) {
    const expected = normalizeText(patch.currentContent);
    const actual = normalizeCurrentValue(currentValue, settingsPath);
    if (expected.length > 0 && actual !== expected) {
      return {
        ok: false,
        code: "PATCH_STALE",
        message: `Target content changed since the patch was created. Expected "${expected}", found "${actual}".`,
        details: { elementId: node.id, settingsPath, expected, actual },
      };
    }
  }

  const richText = isElementorRichTextSetting(widgetType, settingsKey);

  return {
    ok: true,
    target: {
      elementId: node.id,
      widgetType,
      elType: node.type,
      settingsKey,
      settingsPath,
      currentValue,
      proposedValue: patch.proposedContent,
      richText,
      strategy,
      elementPath: buildElementPath(doc.root, node.id),
    },
  };
}

function findCandidateNodes(root: ContentNode, semanticKind: string): ContentNode[] {
  const candidates: ContentNode[] = [];
  const walk = (node: ContentNode): void => {
    if (node.widgetType && matchesSemanticIntent(node.widgetType, semanticKind)) {
      candidates.push(node);
    }
    for (const child of node.children) walk(child);
  };
  walk(root);
  return candidates;
}

function matchesSemanticIntent(widgetTypeRaw: string, semanticKind: string): boolean {
  const widgetType = normalizeElementorWidgetType(widgetTypeRaw);
  const mapping: Record<string, string[]> = {
    heading: ["heading-text"],
    button: ["button-text", "button-link"],
    "text-editor": ["text-content"],
    image: ["image-alt", "image-caption"],
    "text-path": ["text-content"],
    icon: ["icon-text"],
    "icon-list": ["icon-list-text"],
  };
  const intents = mapping[widgetType ?? ""];
  if (!intents) return false;
  return intents.includes(semanticKind);
}

function buildElementPath(root: ContentNode, targetId: string): string[] {
  const path: string[] = [];
  const walk = (node: ContentNode, trail: string[]): boolean => {
    if (node.id === targetId) {
      path.push(...trail, node.type);
      return true;
    }
    for (const child of node.children) {
      if (walk(child, [...trail, node.type])) return true;
    }
    return false;
  };
  walk(root, []);
  return path;
}

function normalizeCurrentValue(value: unknown, settingsPath: string[]): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") {
    const key = settingsPath[settingsPath.length - 1];
    // Rich-text-like settings compare on visible text.
    if (key === "editor" || key === "title") {
      return textContentOfRichText(value);
    }
    return normalizeText(value);
  }
  return normalizeText(String(value));
}

function isNestedCreateAllowed(widgetType: string, settingsPath: string[]): boolean {
  // Only the image widget's nested `image` control is created on demand.
  return widgetType === "image" && settingsPath[0] === "image";
}

// Re-export nested-setting helpers for the mutator.
export { getNestedSetting, setNestedSetting } from "./setting-path.js";
