// @forge/preflight-validator/rules/alt
// Validation rules for alt text actions.

import type { ValidationResult, ValidationStatus, ValidationRiskLevel } from "../types.js";

/**
 * Action type for alt text actions.
 */
export type AltActionType = "accessibility.update-alt" | "accessibility.add-alt";

/**
 * Input for alt text validation.
 */
export interface AltValidationInput {
  actionId: string;
  actionType: AltActionType;
  risk: ValidationRiskLevel;
  mediaId: number;
  newAlt: string;
}

/**
 * Validates an alt-text-update action.
 * Checks: image exists, alt currently empty.
 */
export function validateAltTextAction(
  input: AltValidationInput,
  imageExists: (mediaId: number) => boolean,
  imageHasAltText: (mediaId: number) => boolean,
): ValidationResult {
  const { actionId, actionType: _actionType, risk, mediaId } = input;

  const blockingIssues: string[] = [];
  const warnings: string[] = [];

  // Check: image exists
  if (!imageExists(mediaId)) {
    blockingIssues.push(`Media ${mediaId} does not exist`);
  }

  // Check: alt text already present
  if (imageHasAltText(mediaId)) {
    warnings.push(`Image already has alt text - overwriting existing value`);
  }

  const status: ValidationStatus = blockingIssues.length > 0 ? "blocked" : warnings.length > 0 ? "warning" : "approved";

  return {
    actionId,
    status,
    reason: blockingIssues.length > 0
      ? blockingIssues.join("; ")
      : warnings.length > 0
        ? "Alt text will be updated (existing value will be replaced)"
        : "Alt text addition is valid",
    warnings,
    blockingIssues,
    confidence: 0.95,
    estimatedRisk: risk,
  };
}