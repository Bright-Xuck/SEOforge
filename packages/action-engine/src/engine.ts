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
  const approvalQueue: string[] = [];

  // Use mutable intermediate type for calculation
  const mutableRisk: MutableRiskSummary = { safe: 0, moderate: 0, high: 0, critical: 0 };

  for (const rec of report.recommendations) {
    const action = createActionFromRecommendation(rec);
    actions.push(action);

    // Count risk levels on mutable object
    mutableRisk[action.risk] += 1;

    if (action.requiresApproval) {
      approvalQueue.push(action.id);
    }
  }

  // Convert to readonly type for output
  const riskSummary: RiskSummary = {
    safe: mutableRisk.safe,
    moderate: mutableRisk.moderate,
    high: mutableRisk.high,
    critical: mutableRisk.critical,
  };

  const summary: ActionSummary = {
    total: actions.length,
    automatable: actions.filter((a) => a.automatable).length,
    requiresApproval: actions.filter((a) => a.requiresApproval).length,
    byRisk: riskSummary,
  };

  const estimatedDuration = formatEstimatedDuration(calculateTotalMinutes(actions));

  return {
    url: report.url,
    generatedAt: new Date().toISOString(),
    actions,
    approvalQueue,
    summary,
    estimatedDuration,
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