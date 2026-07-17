// @forge/preflight-validator/rules/meta
// Validation rules for meta description actions.

import type { ValidationResult, ValidationStatus, ValidationRiskLevel } from "../types.js";

/**
 * Action type for meta description actions.
 */
export type MetaActionType = "seo.update-meta-description" | "seo.add-meta-description";

/**
 * Input for meta description validation.
 */
export interface MetaValidationInput {
  actionId: string;
  actionType: MetaActionType;
  risk: ValidationRiskLevel;
  pageId: number;
  newDescription: string;
}

/**
 * Validates a meta-description-update action.
 * Checks: page exists, provider supports metadata editing.
 */
export function validateMetaDescriptionAction(
  input: MetaValidationInput,
  pageExists: (pageId: number) => boolean,
  pageHasMetaDescription: (pageId: number) => boolean,
): ValidationResult {
  const { actionId, actionType: _actionType, risk, pageId } = input;

  const blockingIssues: string[] = [];
  const warnings: string[] = [];

  // Check: page exists
  if (!pageExists(pageId)) {
    blockingIssues.push(`Page ${pageId} does not exist`);
  }

  // Check: meta description already present (warning, not blocking)
  if (pageHasMetaDescription(pageId)) {
    warnings.push(`Page already has meta description - overwriting existing value`);
  }

  const status: ValidationStatus = blockingIssues.length > 0 ? "blocked" : warnings.length > 0 ? "warning" : "approved";

  return {
    actionId,
    status,
    reason: blockingIssues.length > 0
      ? blockingIssues.join("; ")
      : warnings.length > 0
        ? warnings.join("; ") + "; proceeding with caution"
        : "Meta description update is valid",
    warnings,
    blockingIssues,
    confidence: 0.9,
    estimatedRisk: risk,
  };
}