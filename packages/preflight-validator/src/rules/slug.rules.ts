// @forge/preflight-validator/rules/slug
// Validation rules for slug-related actions.

import type { ValidationResult, ValidationStatus, ValidationRiskLevel } from "../types.js";

/**
 * Action type for slug actions.
 */
export type SlugActionType = "seo.update-slug";

/**
 * Input for slug validation.
 */
export interface SlugValidationInput {
  actionId: string;
  actionType: SlugActionType;
  risk: ValidationRiskLevel;
  pageId: number;
  newSlug: string;
  currentSlug: string;
}

/**
 * Validates a slug-update action.
 * Checks: slug unique, redirect required, redirect possible, permalink structure preserved.
 */
export function validateSlugAction(
  input: SlugValidationInput,
  pageExists: (pageId: number) => boolean,
  slugExists: (slug: string) => boolean,
  redirectPossible: () => boolean,
): ValidationResult {
  const { actionId, actionType: _actionType, risk, pageId, newSlug, currentSlug } = input;

  const blockingIssues: string[] = [];
  const warnings: string[] = [];

  // Check: page exists
  if (!pageExists(pageId)) {
    blockingIssues.push(`Page ${pageId} does not exist`);
  }

  // Check: newSlug is provided
  if (!newSlug || typeof newSlug !== "string" || newSlug.trim() === "") {
    blockingIssues.push(`New slug is empty or invalid`);
  }

  // Check: currentSlug is provided
  if (!currentSlug || typeof currentSlug !== "string" || currentSlug.trim() === "") {
    blockingIssues.push(`Current slug is empty or invalid`);
  }

  // Check: slug actually changed
  if (newSlug && currentSlug && typeof newSlug === "string" && typeof currentSlug === "string" && newSlug === currentSlug) {
    blockingIssues.push(`New slug is identical to current slug — no change needed`);
  }

  // Check: slug uniqueness (only if newSlug is valid)
  if (newSlug && typeof newSlug === "string" && slugExists(newSlug)) {
    blockingIssues.push(`Slug "${newSlug}" is already in use by another page`);
  }

  // Check: redirect required (slug change always requires redirect)
  warnings.push(`Slug change requires a 301 redirect from old slug to new slug`);

  // Check: redirect possible
  if (!redirectPossible()) {
    blockingIssues.push(`Redirect setup is not supported by the current provider`);
  }

  // Check: permalink structure
  if (newSlug && typeof newSlug === "string" && (newSlug.includes("/") || newSlug.includes("\\"))) {
    warnings.push(`Slug contains path separators — verify permalink structure is preserved`);
  }

  const status: ValidationStatus = blockingIssues.length > 0 ? "blocked" : warnings.length > 0 ? "warning" : "approved";

  return {
    actionId,
    status,
    reason: blockingIssues.length > 0
      ? blockingIssues.join("; ")
      : "Slug change is valid — redirect will be required",
    warnings,
    blockingIssues,
    confidence: blockingIssues.length > 0 ? 0 : 0.8,
    estimatedRisk: risk,
  };
}