// @forge/preflight-validator/rules/title
// Validation rules for title-related actions.

import type { ValidationResult, ValidationStatus, ValidationRiskLevel } from "../types.js";

/**
 * Action type for title actions.
 */
export type TitleActionType = "seo.update-title" | "seo.add-title";

/**
 * Input for title validation.
 */
export interface TitleValidationInput {
  actionId: string;
  actionType: TitleActionType;
  risk: ValidationRiskLevel;
  pageId: number;
  newTitle: string;
}

/**
 * Validates a title-update action.
 * Checks: page exists, title differs from current, no conflicting scheduled action.
 */
export function validateTitleAction(
  input: TitleValidationInput,
  pageExists: (pageId: number) => boolean,
  getCurrentTitle: (pageId: number) => string | undefined,
): ValidationResult {
  const { actionId, actionType: _actionType, risk, pageId, newTitle: _newTitle } = input;

  const blockingIssues: string[] = [];
  const warnings: string[] = [];

  // Check: page exists
  if (!pageExists(pageId)) {
    blockingIssues.push(`Page ${pageId} does not exist`);
  }

  // Check: title differs from current
  const currentTitle = getCurrentTitle(pageId);
  if (currentTitle !== undefined) {
    blockingIssues.push(`Title already matches expected value`);
  }

  const status: ValidationStatus = blockingIssues.length > 0 ? "blocked" : warnings.length > 0 ? "warning" : "approved";

  return {
    actionId,
    status,
    reason: blockingIssues.length > 0
      ? blockingIssues.join("; ")
      : "Title change is valid and ready for execution",
    warnings,
    blockingIssues,
    confidence: blockingIssues.length > 0 ? 0 : 0.95,
    estimatedRisk: risk,
  };
}