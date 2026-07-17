// @forge/preflight-validator/types
// Validation models for preflight validation.

/**
 * Validation status for an action.
 */
export type ValidationStatus = "approved" | "warning" | "blocked";

/**
 * Risk levels for validation.
 */
export type ValidationRiskLevel = "safe" | "moderate" | "high" | "critical";

/**
 * A validation result for a single action.
 */
export interface ValidationResult {
  readonly actionId: string;
  readonly status: ValidationStatus;
  readonly reason: string;
  readonly warnings: string[];
  readonly blockingIssues: string[];
  readonly confidence: number; // 0-1
  readonly estimatedRisk: ValidationRiskLevel;
}

/**
 * Risk summary for validation report.
 */
export interface ValidationRiskSummary {
  readonly safe: number;
  readonly moderate: number;
  readonly high: number;
  readonly critical: number;
}

/**
 * Validation report for an execution plan.
 */
export interface ValidationReport {
  readonly url: string;
  readonly validatedAt: string;
  readonly approvedActions: ValidationResult[];
  readonly warningActions: ValidationResult[];
  readonly blockedActions: ValidationResult[];
  readonly warnings: string[];
  readonly errors: string[];
  readonly riskSummary: ValidationRiskSummary;
}