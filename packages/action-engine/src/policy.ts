// @forge/action-engine/policy
// Automation policy engine for risk classification.

import type { FindingId } from "@forge/core";
import type { RiskLevel, ActionType } from "./types.js";

/**
 * Default risk policies for action types.
 */
const DEFAULT_RISK_POLICIES: Record<string, RiskLevel> = {
  // Safe - can be auto-executed
  "seo.missing_title": "safe",
  "seo.missing_meta_description": "safe",
  "metadata.missing_og": "safe",
  "accessibility.missing_lang": "safe",
  "technical.missing_jsonld": "safe",

  // Moderate - requires approval
  "seo.missing_canonical": "moderate",
  "seo.missing_h1": "moderate",

  // High - requires approval
  "seo.title_too_short": "high",
  "seo.title_too_long": "high",
  "seo.multiple_h1": "high",
  "accessibility.missing_alt": "high",
  "accessibility.empty_alt": "high",

  // Critical - requires approval
  "seo.robots_noindex": "critical",
};

/**
 * Maps finding IDs to action types.
 */
const FINDING_TO_ACTION: Record<string, ActionType> = {
  "seo.missing_title": "seo.add-title",
  "seo.missing_meta_description": "seo.add-meta-description",
  "seo.title_too_short": "seo.update-title",
  "seo.title_too_long": "seo.update-title",
  "seo.missing_h1": "seo.add-h1",
  "seo.multiple_h1": "seo.fix-heading-hierarchy",
  "metadata.missing_og": "metadata.add-og",
  "seo.missing_canonical": "seo.add-canonical",
  "accessibility.missing_lang": "metadata.add-og",
  "accessibility.missing_alt": "accessibility.add-alt",
  "accessibility.empty_alt": "accessibility.update-alt",
  "technical.missing_jsonld": "technical.add-jsonld",
  "seo.robots_noindex": "seo.remove-noindex",
};

/**
 * Determine risk level for a finding.
 */
export function getRiskLevel(findingId: FindingId): RiskLevel {
  return DEFAULT_RISK_POLICIES[findingId] ?? "moderate";
}

/**
 * Determine action type for a finding.
 */
export function getActionType(findingId: FindingId): ActionType | undefined {
  return FINDING_TO_ACTION[findingId];
}

/**
 * Check if an action is automatable based on risk.
 */
export function isAutomatable(risk: RiskLevel): boolean {
  return risk === "safe";
}

/**
 * Check if an action requires approval.
 */
export function requiresApproval(risk: RiskLevel): boolean {
  return risk !== "safe";
}