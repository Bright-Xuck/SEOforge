// @forge/preflight-validator/validator
// Preflight validator engine.

import type { Action } from "@forge/action-engine";
import type { ValidationReport, ValidationResult, ValidationRiskLevel } from "./types.js";
import type { TitleValidationInput, MetaValidationInput, AltValidationInput, CanonicalValidationInput, SchemaValidationInput } from "./rules/index.js";
import { validateTitleAction, validateMetaDescriptionAction, validateAltTextAction, validateCanonicalAction, validateSchemaAction } from "./rules/index.js";

/**
 * Context interface for provider lookups during validation.
 */
export interface ValidationContext {
  pageExists: (pageId: number) => boolean;
  imageExists: (mediaId: number) => boolean;
  getCurrentTitle: (pageId: number) => string | undefined;
  pageHasMetaDescription: (pageId: number) => boolean;
  imageHasAltText: (mediaId: number) => boolean;
  slugExists: (slug: string) => boolean;
  pageHasSchema: (pageId: number) => boolean;
}

/**
 * Create a default validation context.
 */
export function createDefaultContext(): ValidationContext {
  return {
    pageExists: () => true,
    imageExists: () => true,
    getCurrentTitle: () => undefined,
    pageHasMetaDescription: () => false,
    imageHasAltText: () => false,
    slugExists: () => false,
    pageHasSchema: () => false,
  };
}

/**
 * Validate a single action based on its type.
 */
function validateSingleAction(
  action: Action,
  context: ValidationContext,
): ValidationResult {
  const actionType = action.type;
  const risk = action.risk as ValidationRiskLevel;

  switch (actionType) {
    case "seo.update-title":
    case "seo.add-title": {
      const input: TitleValidationInput = {
        actionId: action.id,
        actionType: actionType as "seo.update-title" | "seo.add-title",
        risk,
        pageId: action.payload.pageId as number,
        newTitle: action.payload.newTitle as string,
      };
      return validateTitleAction(input, context.pageExists, context.getCurrentTitle);
    }

    case "seo.update-meta-description":
    case "seo.add-meta-description": {
      const input: MetaValidationInput = {
        actionId: action.id,
        actionType: actionType as "seo.update-meta-description" | "seo.add-meta-description",
        risk,
        pageId: action.payload.pageId as number,
        newDescription: action.payload.newDescription as string,
      };
      return validateMetaDescriptionAction(input, context.pageExists, context.pageHasMetaDescription);
    }

    case "accessibility.update-alt":
    case "accessibility.add-alt": {
      const input: AltValidationInput = {
        actionId: action.id,
        actionType: actionType as "accessibility.update-alt" | "accessibility.add-alt",
        risk,
        mediaId: action.payload.mediaId as number,
        newAlt: action.payload.newAlt as string,
      };
      return validateAltTextAction(input, context.imageExists, context.imageHasAltText);
    }

    case "seo.add-canonical": {
      const input: CanonicalValidationInput = {
        actionId: action.id,
        actionType: "seo.add-canonical",
        risk,
        pageId: action.payload.pageId as number,
        newCanonical: action.payload.newCanonical as string,
      };
      return validateCanonicalAction(input, context.pageExists);
    }

    case "technical.add-jsonld": {
      const input: SchemaValidationInput = {
        actionId: action.id,
        actionType: "technical.add-jsonld",
        risk,
        pageId: action.payload.pageId as number,
        schema: action.payload.schema as Record<string, unknown>,
      };
      return validateSchemaAction(input, context.pageExists, context.pageHasSchema);
    }

    default: {
      return {
        actionId: action.id,
        status: "warning",
        reason: `Unknown action type: ${actionType}`,
        warnings: [`No validation rule for action type: ${actionType}`],
        blockingIssues: [],
        confidence: 0.5,
        estimatedRisk: risk,
      };
    }
  }
}

/**
 * Preflight validator for execution plans.
 * Validates all actions before execution.
 */
export function validateExecutionPlan(
  plan: { url: string; actions: Action[] },
  _provider: unknown,
  context?: ValidationContext,
): ValidationReport {
  const validationContext = context ?? createDefaultContext();
  const validatedAt = new Date().toISOString();

  const results: ValidationResult[] = plan.actions.map((action) =>
    validateSingleAction(action, validationContext),
  );

  const approvedActions = results.filter((r) => r.status === "approved");
  const warningActions = results.filter((r) => r.status === "warning");
  const blockedActions = results.filter((r) => r.status === "blocked");

  const warnings: string[] = [];
  const errors: string[] = blockedActions.length > 0 ? ["Some actions are blocked and cannot be executed"] : [];

  // Aggregate warnings from warning-level results
  for (const result of warningActions) {
    warnings.push(...result.warnings);
  }

  // Calculate risk summary
  const riskSummary = {
    safe: results.filter((r) => r.estimatedRisk === "safe").length,
    moderate: results.filter((r) => r.estimatedRisk === "moderate").length,
    high: results.filter((r) => r.estimatedRisk === "high").length,
    critical: results.filter((r) => r.estimatedRisk === "critical").length,
  };

  return {
    url: plan.url,
    validatedAt,
    approvedActions,
    warningActions,
    blockedActions,
    warnings,
    errors,
    riskSummary,
  };
}