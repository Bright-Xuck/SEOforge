// @forge/dom-engine
// Elementor mutation & verification (Sprint 25).
//
// The safest mutation model:
//   original Elementor JSON → clone → modify only approved settings →
//   preserve everything else → write
//
// Unknown settings must survive a read → modify → write round trip. This
// module never reconstructs the document from known fields — it operates on a
// clone of the parsed tree and touches only the targeted leaves.

import type { ContentNode } from "../types.js";
import { findNodeById } from "../tree/tree-node.js";
import type { ElementorDocument } from "./document.js";
import { cloneElementorDocument } from "./document.js";
import type { ResolvedElementorTarget } from "./patch-resolver.js";
import { setNestedSetting } from "./setting-path.js";
import { sanitizeElementorRichText } from "./rich-text.js";

/**
 * A single setting-level change produced by a mutation.
 */
export interface ElementorSettingDiff {
  readonly elementId: string;
  readonly settingsKey: string;
  readonly settingsPath: string[];
  readonly before: unknown;
  readonly after: unknown;
}

/**
 * Result of applying approved mutations to an Elementor document.
 */
export interface ElementorMutation {
  readonly document: ElementorDocument;
  readonly diffs: ElementorSettingDiff[];
}

/**
 * Apply approved, resolved targets to a document clone.
 *
 * - Rich-text settings are sanitized (allowlist preserved, unsafe markup removed).
 * - Plain-text settings reject markup at resolution time; mutation enforces it.
 * - Everything not targeted is preserved verbatim.
 */
export function applyElementorMutations(
  document: ElementorDocument,
  targets: ResolvedElementorTarget[],
): ElementorMutation {
  let root: ContentNode = document.root;
  const diffs: ElementorSettingDiff[] = [];

  for (const target of targets) {
    const node = findNodeById(root, target.elementId);
    if (!node) continue;

    let proposed = target.proposedValue;
    if (target.richText && typeof proposed === "string") {
      proposed = sanitizeElementorRichText(proposed);
    }

    const before = getSettingByPath(node.settings, target.settingsPath);
    root = updateNodeSettings(root, target.elementId, (settings) =>
      setNestedSetting(settings, target.settingsPath, proposed),
    );

    diffs.push({
      elementId: target.elementId,
      settingsKey: target.settingsKey,
      settingsPath: target.settingsPath,
      before,
      after: proposed,
    });
  }

  return {
    document: cloneElementorDocument(document, root),
    diffs,
  };
}

/**
 * Immutably update a node's settings by element id, returning a new tree.
 */
function updateNodeSettings(
  node: ContentNode,
  elementId: string,
  updater: (settings: Record<string, unknown>) => Record<string, unknown>,
): ContentNode {
  if (node.id === elementId) {
    return { ...node, settings: updater(node.settings) };
  }
  return { ...node, children: node.children.map((child) => updateNodeSettings(child, elementId, updater)) };
}

/**
 * Verification result after applying a mutation.
 */
export interface ElementorMutationVerification {
  readonly ok: boolean;
  /** Every targeted setting changed to the proposed value. */
  readonly targetedChanged: boolean;
  /** No unrelated settings changed. */
  readonly unrelatedUnchanged: boolean;
  readonly errors: string[];
}

/**
 * Verify a mutation: the targeted settings changed correctly AND unrelated
 * Elementor structure/settings remain unchanged.
 *
 * `original` is the document read before mutation; `mutated` is the local
 * result. Comparison is structural (normalized) — never string equality of the
 * whole document (JSON key ordering must not matter).
 */
export function verifyElementorMutation(
  original: ElementorDocument,
  mutated: ElementorDocument,
  targets: ResolvedElementorTarget[],
): ElementorMutationVerification {
  const errors: string[] = [];

  const targetedChanged = targets.every((target) => {
    const node = findNodeById(mutated.root, target.elementId);
    if (!node) return false;
    const value = getSettingByPath(node.settings, target.settingsPath);
    return deepEqual(value, target.proposedValue);
  });
  if (!targetedChanged) {
    errors.push("One or more targeted settings did not change to the proposed value.");
  }

  const unrelatedUnchanged = compareUnrelated(original.root, mutated.root, targets, errors);
  if (!unrelatedUnchanged) {
    errors.push("Unrelated Elementor settings changed during mutation.");
  }

  return {
    ok: errors.length === 0,
    targetedChanged,
    unrelatedUnchanged,
    errors,
  };
}

function compareUnrelated(
  before: ContentNode,
  after: ContentNode,
  targets: ResolvedElementorTarget[],
  errors: string[],
): boolean {
  if (before.id !== after.id || before.type !== after.type) {
    errors.push(`Element structure changed at ${before.id}: ${before.type} → ${after.type}`);
    return false;
  }
  if (before.widgetType !== after.widgetType) {
    errors.push(`Widget type changed at ${before.id}.`);
    return false;
  }

  const targetedKeys = new Set(targets.filter((t) => t.elementId === before.id).map((t) => t.settingsPath.join(".")));

  for (const key of Object.keys(before.settings)) {
    if (targetedKeys.has(key)) continue;
    if (!deepEqual(before.settings[key], after.settings[key])) {
      errors.push(`Unrelated setting "${key}" changed at ${before.id}.`);
      return false;
    }
  }
  for (const key of Object.keys(after.settings)) {
    if (targetedKeys.has(key)) continue;
    if (!(key in before.settings)) {
      errors.push(`Setting "${key}" was added at ${before.id}.`);
      return false;
    }
  }

  if (before.children.length !== after.children.length) {
    errors.push(`Child count changed at ${before.id}.`);
    return false;
  }
  for (let i = 0; i < before.children.length; i++) {
    const beforeChild = before.children[i];
    const afterChild = after.children[i];
    if (!beforeChild || !afterChild) {
      errors.push(`Child structure diverged at ${before.id}.`);
      return false;
    }
    const ok = compareUnrelated(beforeChild, afterChild, targets, errors);
    if (!ok) return false;
  }
  return true;
}

function getSettingByPath(settings: Record<string, unknown>, path: string[]): unknown {
  let current: unknown = settings;
  for (const key of path) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/**
 * Deep equality for JSON-safe values (deterministic, ordering-insensitive for
 * plain objects).
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }
  if (typeof a === "object" && typeof b === "object") {
    const aKeys = Object.keys(a as Record<string, unknown>);
    const bKeys = Object.keys(b as Record<string, unknown>);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key) => deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]));
  }
  return false;
}
