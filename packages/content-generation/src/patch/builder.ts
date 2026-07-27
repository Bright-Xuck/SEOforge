// @forge/content-generation
// Builds self-contained ContentPatch objects from generated sections.

import type { GeneratedSection, ValidationReport } from "../types.js";
import type { ContentPatch, PatchOperation, PatchSummary, SectionPatch, PatchTarget, SemanticIntent } from "./types.js";
import { buildSectionDiff } from "../diff/builder.js";

let patchCounter = 0;

function nextPatchId(sectionId: string): string {
  patchCounter += 1;
  return `patch-${sectionId}-${patchCounter}`;
}

/**
 * Build a self-contained ContentPatch for a generated section.
 */
export function buildPatch(
  generated: GeneratedSection,
  operation: PatchOperation,
  selector: string,
  validation: ValidationReport,
  options: {
    readonly provider: string;
    readonly model?: string;
    readonly promptVersion: string;
    readonly generatedBy: string;
    readonly target?: PatchTarget;
    readonly semanticIntent?: SemanticIntent;
  },
): ContentPatch {
  const diff = buildSectionDiff(generated.sectionId, generated.currentSection, generated.generatedSection);
  return {
    id: nextPatchId(generated.sectionId),
    sectionId: generated.sectionId,
    operation,
    selector,
    currentContent: generated.currentSection,
    proposedContent: generated.generatedSection,
    diff,
    validation,
    confidence: generated.confidence.score,
    estimatedImpact: generated.expectedSeoImpact,
    warnings: generated.warnings.messages,
    generatedBy: options.generatedBy,
    provider: options.provider,
    model: options.model,
    promptVersion: options.promptVersion,
    createdAt: new Date().toISOString(),
    target: options.target,
    semanticIntent: options.semanticIntent,
  };
}

/**
 * Build a section-scoped patch (carries sectionKind).
 */
export function buildSectionPatch(
  generated: GeneratedSection,
  operation: PatchOperation,
  selector: string,
  validation: ValidationReport,
  options: {
    readonly provider: string;
    readonly model?: string;
    readonly promptVersion: string;
    readonly generatedBy: string;
    readonly target?: PatchTarget;
    readonly semanticIntent?: SemanticIntent;
  },
): SectionPatch {
  const patch = buildPatch(generated, operation, selector, validation, options);
  return {
    ...patch,
    sectionKind: generated.sectionKind,
  };
}

/**
 * Summarize a set of patches.
 */
export function summarizePatches(patches: readonly ContentPatch[]): PatchSummary {
  const byOperation = {
    replace: 0,
    append: 0,
    prepend: 0,
    "insert-after": 0,
    "insert-before": 0,
    merge: 0,
  } as Record<PatchOperation, number>;
  let valid = 0;
  let invalid = 0;
  for (const patch of patches) {
    byOperation[patch.operation] += 1;
    if (patch.validation.valid) valid += 1;
    else invalid += 1;
  }
  return {
    total: patches.length,
    byOperation,
    valid,
    invalid,
  };
}
