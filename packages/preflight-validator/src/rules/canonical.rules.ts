// @forge/preflight-validator/rules/canonical
// Validation rules for canonical URL actions.

import type { ValidationResult, ValidationStatus, ValidationRiskLevel } from "../types.js";

/**
 * Action type for canonical actions.
 */
export type CanonicalActionType = "seo.add-canonical";

/**
 * Input for canonical validation.
 */
export interface CanonicalValidationInput {
  actionId: string;
  actionType: CanonicalActionType;
  risk: ValidationRiskLevel;
  pageId: number;
  newCanonical: string;
}

/**
 * Validates a canonical-update action.
 * Checks: page exists, canonical format valid.
 */
export function validateCanonicalAction(
  input: CanonicalValidationInput,
  pageExists: (pageId: number) => boolean,
): ValidationResult {
  const { actionId, risk, pageId, newCanonical } = input;

  const blockingIssues: string[] = [];
  const warnings: string[] = [];

  // Check: page exists
  if (!pageExists(pageId)) {
    blockingIssues.push(`Page ${pageId} does not exist`);
  }

  // Check: canonical format validity
  try {
    new URL(newCanonical);
  } catch {
    blockingIssues.push(`Invalid canonical URL format: ${newCanonical}`);
  }

  // Check: redirect requirement (warning for canonical changes)
  warnings.push(`Canonical change may require redirect setup - verify redirect handling`);

  const status: ValidationStatus = blockingIssues.length > 0 ? "blocked" : warnings.length > 0 ? "warning" : "approved";

  return {
    actionId,
    status,
    reason: blockingIssues.length > 0
      ? blockingIssues.join("; ")
      : "Canonical URL update is valid - verify redirect handling",
    warnings,
    blockingIssues,
    confidence: blockingIssues.length > 0 ? 0 : 0.85,
    estimatedRisk: risk,
  };
}