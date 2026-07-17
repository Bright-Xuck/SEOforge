// @forge/execution-engine/policies
// Execution policies for determining auto-execution vs. approval requirements.

import type { ActionType, RiskLevel } from "@forge/action-engine";

/**
 * Execution policy level.
 * - safe: Execute automatically
 * - moderate: Requires approval
 * - high: Blocked unless approved
 * - critical: Never auto execute
 */
export type PolicyLevel = "safe" | "moderate" | "high" | "critical";

/**
 * Policy decision for an action.
 */
export interface PolicyDecision {
  readonly actionId: string;
  readonly actionType: ActionType;
  readonly risk: RiskLevel;
  readonly policy: PolicyLevel;
  readonly canAutoExecute: boolean;
  readonly requiresApproval: boolean;
  readonly blocked: boolean;
  readonly reason: string;
}

/**
 * Default execution policies mapping action types to policy levels.
 * These are deterministic and configurable.
 */
const DEFAULT_POLICIES: Record<string, PolicyLevel> = {
  "seo.add-title": "moderate",
  "seo.update-title": "high",
  "seo.add-meta-description": "safe",
  "seo.update-meta-description": "moderate",
  "seo.add-canonical": "moderate",
  "seo.add-h1": "moderate",
  "seo.fix-heading-hierarchy": "moderate",
  "seo.remove-noindex": "high",
  "seo.update-slug": "critical",
  "accessibility.add-alt": "safe",
  "accessibility.update-alt": "safe",
  "metadata.add-og": "safe",
  "technical.add-jsonld": "moderate",
  "content.update-content": "critical",
  "content.add-internal-link": "safe",
};

/**
 * Risk-based fallback policies when no specific action type policy exists.
 */
const RISK_FALLBACK: Record<RiskLevel, PolicyLevel> = {
  safe: "safe",
  moderate: "moderate",
  high: "high",
  critical: "critical",
};

/**
 * Policy engine for determining execution policies.
 */
export class PolicyEngine {
  private policies: Record<string, PolicyLevel>;

  constructor(customPolicies?: Record<string, PolicyLevel>) {
    this.policies = { ...DEFAULT_POLICIES, ...customPolicies };
  }

  /**
   * Evaluate the policy for a given action type and risk level.
   */
  evaluate(actionId: string, actionType: ActionType, risk: RiskLevel): PolicyDecision {
    const policy = this.policies[actionType] ?? RISK_FALLBACK[risk] ?? "moderate";

    const canAutoExecute = policy === "safe";
    const requiresApproval = policy === "moderate" || policy === "high";
    const blocked = policy === "critical";

    const reasons: Record<PolicyLevel, string> = {
      safe: "Action is safe — can auto-execute",
      moderate: "Action requires approval before execution",
      high: "Action is high risk — blocked unless explicitly approved",
      critical: "Action is critical — never auto-execute",
    };

    return {
      actionId,
      actionType,
      risk,
      policy,
      canAutoExecute,
      requiresApproval,
      blocked,
      reason: reasons[policy],
    };
  }

  /**
   * Evaluate policies for multiple actions.
   */
  evaluateBatch(
    actions: Array<{ id: string; type: ActionType; risk: RiskLevel }>,
  ): PolicyDecision[] {
    return actions.map((a) => this.evaluate(a.id, a.type, a.risk));
  }

  /**
   * Get the current policy configuration.
   */
  getPolicies(): Record<string, PolicyLevel> {
    return { ...this.policies };
  }

  /**
   * Override a specific policy.
   */
  setPolicy(actionType: string, level: PolicyLevel): void {
    this.policies[actionType] = level;
  }
}