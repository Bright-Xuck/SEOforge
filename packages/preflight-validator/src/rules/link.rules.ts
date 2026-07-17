// @forge/preflight-validator/rules/link
// Validation rules for internal link actions.

import type { ValidationResult, ValidationStatus, ValidationRiskLevel } from "../types.js";

/**
 * Action type for link actions.
 */
export type LinkActionType = "content.add-internal-link";

/**
 * Input for internal link validation.
 */
export interface LinkValidationInput {
  actionId: string;
  actionType: LinkActionType;
  risk: ValidationRiskLevel;
  sourcePageId: number;
  destinationUrl: string;
  anchorText: string;
}

/**
 * Validates an internal-link-add action.
 * Checks: destination page exists, anchor valid, link not duplicate.
 */
export function validateLinkAction(
  input: LinkValidationInput,
  pageExists: (pageId: number) => boolean,
  destinationExists: (url: string) => boolean,
  isDuplicateLink: (sourcePageId: number, destinationUrl: string) => boolean,
): ValidationResult {
  const { actionId, actionType: _actionType, risk, sourcePageId, destinationUrl, anchorText } = input;

  const blockingIssues: string[] = [];
  const warnings: string[] = [];

  // Check: source page exists
  if (!pageExists(sourcePageId)) {
    blockingIssues.push(`Source page ${sourcePageId} does not exist`);
  }

  // Check: destination page exists
  if (!destinationExists(destinationUrl)) {
    blockingIssues.push(`Destination page "${destinationUrl}" does not exist`);
  }

  // Check: anchor text is valid (non-empty, reasonable length)
  if (!anchorText || anchorText.trim().length === 0) {
    blockingIssues.push(`Anchor text is empty`);
  } else if (anchorText.length > 300) {
    warnings.push(`Anchor text is very long (${anchorText.length} characters) — consider shortening`);
  }

  // Check: not a duplicate link
  if (isDuplicateLink(sourcePageId, destinationUrl)) {
    warnings.push(`Link to "${destinationUrl}" already exists on source page — duplicate link`);
  }

  // Check: anchor text is descriptive (not generic)
  const genericAnchors = ["click here", "read more", "learn more", "here", "this", "link"];
  if (genericAnchors.includes(anchorText.trim().toLowerCase())) {
    warnings.push(`Anchor text "${anchorText}" is generic — use descriptive text for SEO`);
  }

  const status: ValidationStatus = blockingIssues.length > 0 ? "blocked" : warnings.length > 0 ? "warning" : "approved";

  return {
    actionId,
    status,
    reason: blockingIssues.length > 0
      ? blockingIssues.join("; ")
      : "Internal link addition is valid",
    warnings,
    blockingIssues,
    confidence: blockingIssues.length > 0 ? 0 : 0.9,
    estimatedRisk: risk,
  };
}