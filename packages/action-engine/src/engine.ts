// @forge/action-engine/engine
// Execution planning engine for Sprint 5.

import type { RecommendationReport, FindingId, Priority } from "@forge/core";
import type { Action, ExecutionPlan, ActionStatus, RiskSummary, ActionSummary } from "./types.js";
import { getRiskLevel, getActionType, isAutomatable, requiresApproval } from "./policy.js";

/**
 * Mutable risk summary for calculation.
 */
interface MutableRiskSummary {
  safe: number;
  moderate: number;
  high: number;
  critical: number;
}

/**
 * Generate execution plan from recommendation report.
 */
export function generateExecutionPlan(report: RecommendationReport): ExecutionPlan {
  const actions: Action[] = [];

  // Use mutable intermediate type for calculation
  const mutableRisk: MutableRiskSummary = { safe: 0, moderate: 0, high: 0, critical: 0 };

  for (const rec of report.recommendations) {
    const action = createActionFromRecommendation(rec);
    actions.push(action);

    // Count risk levels on mutable object
    mutableRisk[action.risk] += 1;
  }

  // Convert to readonly type for output
  const riskSummary: RiskSummary = {
    safe: mutableRisk.safe,
    moderate: mutableRisk.moderate,
    high: mutableRisk.high,
    critical: mutableRisk.critical,
  };

  return buildExecutionPlan(actions, report.url, riskSummary);
}

/**
 * Assemble an ExecutionPlan from already-decided actions.
 *
 * Review → execution needs this: the review session is the plan source, so
 * execution must not regenerate actions from a recommendation report (that was
 * the Sprint 18/22 breakage — passing `{ actions }` where a
 * RecommendationReport was expected). Statuses are preserved, so only actions
 * explicitly approved by the reviewer can reach a real write.
 */
export function buildExecutionPlan(
  actions: Action[],
  url: string,
  riskSummaryInput?: RiskSummary,
): ExecutionPlan {
  const computedRisk = { safe: 0, moderate: 0, high: 0, critical: 0 };
  if (!riskSummaryInput) {
    for (const action of actions) computedRisk[action.risk] += 1;
  }
  const riskSummary: RiskSummary = riskSummaryInput ?? computedRisk;

  const summary: ActionSummary = {
    total: actions.length,
    automatable: actions.filter((action) => action.automatable).length,
    requiresApproval: actions.filter((action) => action.requiresApproval).length,
    byRisk: riskSummary,
  };

  return {
    url,
    generatedAt: new Date().toISOString(),
    actions,
    approvalQueue: actions.filter((action) => action.requiresApproval).map((action) => action.id),
    summary,
    estimatedDuration: formatEstimatedDuration(calculateTotalMinutes(actions)),
    riskSummary,
  };
}

/**
 * Create an action from a recommendation.
 */
function createActionFromRecommendation(rec: {
  id: string;
  findingId: string;
  title: string;
  description: string;
  priority: Priority;
  reason: string;
  implementationSteps: Array<{ order: number; description: string }>;
  references: string[];
  estimatedTime: string;
}): Action {
  const findingId = rec.findingId as FindingId;
  const risk = getRiskLevel(findingId);
  const actionType = getActionType(findingId);

  return {
    id: `action_${findingId}_${Date.now()}`,
    recommendationId: rec.id,
    findingId,
    type: actionType ?? "seo.update-title",
    title: rec.title,
    description: rec.description,
    priority: rec.priority,
    risk,
    automatable: isAutomatable(risk),
    requiresApproval: requiresApproval(risk),
    rollbackSupported: true,
    estimatedDuration: rec.estimatedTime,
    requiredProvider: "website-reader",
    payload: {
      reason: rec.reason,
      implementationSteps: rec.implementationSteps,
      references: rec.references,
    },
    status: "pending" as ActionStatus,
  };
}

/**
 * Calculate total minutes from actions.
 */
function calculateTotalMinutes(actions: Action[]): number {
  let total = 0;
  for (const action of actions) {
    const match = action.estimatedDuration.match(/(\d+)/);
    if (match?.[1]) {
      total += parseInt(match[1], 10);
    }
  }
  return total;
}

/**
 * Format estimated duration in human-readable form.
 */
function formatEstimatedDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minutes`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours} hour${hours > 1 ? "s" : ""}`;
  }
  return `${hours} hour${hours > 1 ? "s" : ""} ${remainingMinutes} minutes`;
}