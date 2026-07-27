// @forge/content-generation
// Self-contained content patches (Sprint 17).
// Every AI output becomes a ContentPatch for review in Sprint 18.
// Sprint 21: extended with optional target and semanticIntent for DOM-aware patching.

import type { ValidationReport } from "../types.js";

/**
 * How a patch applies to the target section.
 */
export type PatchOperation =
  | "replace"
  | "append"
  | "prepend"
  | "insert-after"
  | "insert-before"
  | "merge";

/**
 * Semantic intent carried by a ContentPatch when the meaning is unambiguous.
 * Used by dom-engine to translate AI output into a concrete PatchTarget.
 */
export interface SemanticIntent {
  readonly kind: string;
  readonly value: string;
  readonly sectionKind?: string;
}

/**
 * Patch target types for DOM-aware patching (Sprint 21).
 */
export interface ElementorPatchTarget {
  readonly format: "elementor";
  readonly elementId: string;
  readonly settingsKey: string;
}

export interface GutenbergPatchTarget {
  readonly format: "gutenberg";
  readonly blockPath: number[];
  readonly fingerprint: unknown;
  readonly field: string;
}

export interface GenericHtmlPatchTarget {
  readonly format: "generic-html";
  readonly resolvedSelector: unknown;
}

export type PatchTarget = ElementorPatchTarget | GutenbergPatchTarget | GenericHtmlPatchTarget;

/**
 * A self-contained patch describing a proposed content change.
 * Rich enough for Sprint 18 review/apply without re-running generation.
 * Sprint 21: extended with optional target and semanticIntent for DOM-aware patching.
 */
export interface ContentPatch {
  readonly id: string;
  readonly sectionId: string;
  readonly operation: PatchOperation;
  readonly selector: string;
  readonly currentContent: string;
  readonly proposedContent: string;
  readonly diff: import("../diff/types.js").SectionDiff;
  readonly validation: ValidationReport;
  readonly confidence: number;
  readonly estimatedImpact: string;
  readonly warnings: string[];
  readonly generatedBy: string;
  readonly provider: string;
  readonly model?: string;
  readonly promptVersion: string;
  readonly createdAt: string;
  readonly target?: PatchTarget;
  readonly semanticIntent?: SemanticIntent;
}

/**
 * A patch scoped to a single section (alias for clarity in section workflows).
 */
export interface SectionPatch extends ContentPatch {
  readonly sectionKind: string;
}

/**
 * Aggregate summary of a set of patches.
 */
export interface PatchSummary {
  readonly total: number;
  readonly byOperation: Record<PatchOperation, number>;
  readonly valid: number;
  readonly invalid: number;
}
