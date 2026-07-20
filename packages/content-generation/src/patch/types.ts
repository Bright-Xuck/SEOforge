// @forge/content-generation
// Self-contained content patches (Sprint 17).
// Every AI output becomes a ContentPatch for review in Sprint 18.

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
 * A self-contained patch describing a proposed section change.
 * Rich enough for Sprint 18 review/apply without re-running generation.
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
