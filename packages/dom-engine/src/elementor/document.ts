// @forge/dom-engine
// Elementor document model (Sprint 25).
// Wraps the existing ContentNode parser/serializer with document-level metadata:
// post id, Elementor version, edit mode, and a stable source fingerprint.
//
// HTML ≠ Elementor source data. Elementor stores page structure as structured
// JSON in `_elementor_data` post meta. This model is the provider-neutral
// representation of that source data. Nothing here knows WordPress meta names,
// REST endpoints, or authentication.

import type { ContentNode } from "../types.js";
import { parseElementorData } from "./elementor-parser.js";
import { serializeElementorData as _serialize } from "./elementor-serializer.js";

// Re-export parser/serializer under stable names.
export { parseElementorData } from "./elementor-parser.js";
export { serializeElementorData } from "./elementor-serializer.js";

/**
 * Document-level metadata attached to an Elementor document.
 * Provider-neutral — meta key names live in the provider layer, not here.
 */
export interface ElementorDocumentMeta {
  /** WordPress post/page ID (if known at parse time). */
  readonly postId?: number | string;
  /** Page title (if known). */
  readonly title?: string;
  /** Elementor plugin version, e.g. "3.24.0". */
  readonly elementorVersion?: string;
  /** Elementor edit mode marker ("true" or "builder"). */
  readonly editMode?: string;
  /** Last-modified timestamp (if known). */
  readonly modified?: string;
  /** Where the document came from (audit trail). */
  readonly source?: "companion-endpoint" | "rest-meta" | "file" | "test";
}

/**
 * A parsed Elementor document.
 *
 * `root` is the existing ContentNode tree (reuses the Sprint 21 parser).
 * `rawData` is the original `_elementor_data` JSON string — preserved so a
 * read → modify → write round trip never reconstructs the document from
 * known fields alone.
 */
export interface ElementorDocument {
  readonly root: ContentNode;
  readonly meta: ElementorDocumentMeta;
  /** Stable fingerprint of the document structure (excluding unknown meta). */
  readonly fingerprint: string;
  /** Original `_elementor_data` JSON string. */
  readonly rawData: string;
}

/**
 * Elementor document format support check.
 */
export type ElementorDocumentSupport =
  | { readonly supported: true; readonly version?: string; readonly layout: string[] }
  | {
      readonly supported: false;
      readonly code: "unsupported_document_version" | "invalid_document_data";
      readonly reason: string;
    };

/** Elementor versions >= this major are considered "current" (container era). */
export const ELEMENTOR_CURRENT_VERSION_MAJOR = 3;
/** Minimum accepted Elementor version major (legacy section/column is still parseable). */
export const ELEMENTOR_MIN_VERSION_MAJOR = 2;

/**
 * Compute a stable structural fingerprint for a ContentNode tree.
 * Deterministic: identical documents always produce identical fingerprints.
 */
export function fingerprintElementorTree(root: ContentNode): string {
  const walk = (node: ContentNode): unknown => ({
    id: node.id,
    type: node.type,
    widgetType: node.widgetType,
    settings: normalizeSettings(node.settings),
    children: node.children.map(walk),
  });
  return hashJson(JSON.stringify(walk(root)));
}

/**
 * Deeply normalize settings for fingerprinting: object keys are sorted
 * recursively (arrays keep their order) so the fingerprint is a *structural*
 * property. This makes fingerprint comparison tolerant of JSON reformatting
 * (e.g. Elementor re-serializing the document after a native save) while
 * remaining sensitive to any value change.
 */
function normalizeSettings(settings: Record<string, unknown>): Record<string, unknown> {
  return sortObjectKeys(settings) as Record<string, unknown>;
}

function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys);
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = sortObjectKeys((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

function hashJson(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Parse a raw `_elementor_data` JSON string into an ElementorDocument.
 * Returns null if the data is not a JSON array of elements.
 */
export function parseElementorDocument(rawData: string, meta: ElementorDocumentMeta = {}): ElementorDocument | null {
  const root = parseElementorData(rawData);
  if (!root) return null;
  return {
    root,
    meta,
    fingerprint: fingerprintElementorTree(root),
    rawData,
  };
}

/**
 * Serialize an ElementorDocument back to `_elementor_data` JSON.
 * Lossless except for the targeted fields that were patched.
 */
export function serializeElementorDocument(document: ElementorDocument): string {
  return _serialize(document.root);
}

/**
 * Clone an ElementorDocument with a new tree (immutable mutation helper).
 */
export function cloneElementorDocument(document: ElementorDocument, root: ContentNode): ElementorDocument {
  return {
    root,
    meta: { ...document.meta },
    fingerprint: fingerprintElementorTree(root),
    rawData: serializeElementorDocument({ ...document, root }),
  };
}

/**
 * Check whether an ElementorDocument is safe to patch.
 *
 * - `invalid_document_data`: the document did not parse (not a JSON array).
 * - `unsupported_document_version`: an explicit version older than the
 *   minimum is never guessed at; the caller must stop.
 */
export function checkElementorDocumentSupport(document: ElementorDocument | null): ElementorDocumentSupport {
  if (!document) {
    return { supported: false, code: "invalid_document_data", reason: "Elementor document data did not parse as an element array." };
  }
  const version = document.meta.elementorVersion;
  if (version) {
    const major = Number.parseInt(version.split(".")[0] ?? "", 10);
    if (Number.isNaN(major) || major < ELEMENTOR_MIN_VERSION_MAJOR) {
      return {
        supported: false,
        code: "unsupported_document_version",
        reason: `Elementor document version ${version} is outside the supported range (>= ${ELEMENTOR_MIN_VERSION_MAJOR}.x).`,
      };
    }
  }
  return {
    supported: true,
    version,
    layout: collectLayouts(document.root),
  };
}

function collectLayouts(root: ContentNode): string[] {
  const layouts = new Set<string>();
  const walk = (node: ContentNode): void => {
    layouts.add(node.type);
    for (const child of node.children) walk(child);
  };
  walk(root);
  return [...layouts];
}
