// @forge/preflight-validator/rules/schema
// Validation rules for schema (JSON-LD) actions.

import type { ValidationResult, ValidationStatus, ValidationRiskLevel } from "../types.js";

/**
 * Action type for schema actions.
 */
export type SchemaActionType = "technical.add-jsonld";

/**
 * Input for schema validation.
 */
export interface SchemaValidationInput {
  actionId: string;
  actionType: SchemaActionType;
  risk: ValidationRiskLevel;
  pageId: number;
  schema: Record<string, unknown>;
}

/**
 * Validates a schema-update action.
 * Checks: page exists, valid JSON-LD, schema not already present.
 */
export function validateSchemaAction(
  input: SchemaValidationInput,
  pageExists: (pageId: number) => boolean,
  pageHasSchema: (pageId: number) => boolean,
): ValidationResult {
  const { actionId, actionType: _actionType, risk, pageId, schema } = input;

  const blockingIssues: string[] = [];
  const warnings: string[] = [];

  // Check: page exists
  if (!pageExists(pageId)) {
    blockingIssues.push(`Page ${pageId} does not exist`);
  }

  // Check: schema format validity
  if (!schema || typeof schema !== "object") {
    blockingIssues.push(`Invalid schema payload`);
  } else if (!schema["@context"] || !schema["@type"]) {
    blockingIssues.push(`Schema missing required @context or @type field`);
  }

  // Check: schema already present
  if (pageHasSchema(pageId)) {
    warnings.push(`Page already has schema markup - will be replaced`);
  }

  const status: ValidationStatus = blockingIssues.length > 0 ? "blocked" : warnings.length > 0 ? "warning" : "approved";

  return {
    actionId,
    status,
    reason: blockingIssues.length > 0
      ? blockingIssues.join("; ")
      : warnings.length > 0
        ? "Schema will be added (replacing existing markup)"
        : "Schema addition is valid",
    warnings,
    blockingIssues,
    confidence: blockingIssues.length > 0 ? 0 : 0.9,
    estimatedRisk: risk,
  };
}