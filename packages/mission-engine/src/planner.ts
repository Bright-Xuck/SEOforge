import { StrategyBuilder, validateStrategy } from "@forge/strategy-engine";
import type { MissionContext, MissionDefinition, MissionPlan, MissionStep, MissionSummary } from "./types.js";
import { createMissionRegistry } from "./registry.js";

function keywordMatches(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function selectAgents(context: MissionContext): string[] {
  const text = `${context.currentTask ?? ""} ${context.missionTemplateId ?? ""} ${context.knowledge.primaryKeywords.join(" ")}`.toLowerCase();
  const missionRegistry = createMissionRegistry();
  const template = context.missionTemplateId ? missionRegistry.get(context.missionTemplateId) : undefined;
  const templateAgents = template?.agentIds ?? [];
  if (templateAgents.length > 0) return templateAgents;
  if (keywordMatches(text, ["accessibility", "alt", "heading"])) return ["accessibility-agent", "content-agent"];
  if (keywordMatches(text, ["technical", "performance", "audit"])) return ["performance-agent", "seo-agent"];
  if (keywordMatches(text, ["metadata", "title", "description"])) return ["seo-agent", "content-agent"];
  if (keywordMatches(text, ["store", "product", "commerce"])) return ["content-agent", "linking-agent"];
  return context.availableAgents.slice(0, 2).map((agent) => agent.id);
}

function buildMissionSteps(context: MissionContext, agentIds: string[]): MissionStep[] {
  const builder = new StrategyBuilder();
  return agentIds.map((agentId, index) => {
    const strategy = builder.build({
      ...context.strategyContext,
      currentTask: context.currentTask ?? `Mission step ${index + 1}`,
      agentId,
    });
    validateStrategy(strategy, context.strategyContext);
    return {
      id: `mission-step-${index + 1}`,
      name: `${agentId} step`,
      description: `Execute mission work using ${agentId}.`,
      order: index + 1,
      dependencies: index === 0 ? [] : [`mission-step-${index}`],
      agentId,
      strategy,
      pipelines: strategy.selectedPipelines,
      selectedSkills: strategy.selectedSkills,
      estimatedTokens: strategy.estimatedTokens,
      estimatedDurationMs: strategy.estimatedDurationMs,
      riskLevel: strategy.riskLevel,
      approvalRequired: strategy.approvalRequired,
      expectedOutcomes: strategy.expectedOutcomes,
    };
  });
}

function summarizeMission(steps: MissionStep[]): MissionSummary {
  const riskOrder: Record<MissionSummary["riskLevel"], number> = { low: 0, moderate: 1, high: 2, critical: 3 };
  const riskLevel = steps.reduce<MissionSummary["riskLevel"]>(
    (current, step) => (riskOrder[step.riskLevel] > riskOrder[current] ? step.riskLevel : current),
    "low",
  );
  return {
    totalSteps: steps.length,
    totalAgents: new Set(steps.map((step) => step.agentId)).size,
    totalStrategies: steps.length,
    totalPipelines: new Set(steps.flatMap((step) => step.pipelines)).size,
    estimatedTokens: steps.reduce((sum, step) => sum + step.estimatedTokens, 0),
    estimatedDurationMs: steps.reduce((sum, step) => sum + step.estimatedDurationMs, 0),
    riskLevel,
    approvalRequired: steps.some((step) => step.approvalRequired),
  };
}

export class MissionPlanner {
  plan(context: MissionContext): MissionPlan {
    const agentIds = selectAgents(context);
    const steps = buildMissionSteps(context, agentIds);
    const summary = summarizeMission(steps);
    const mission: MissionDefinition = {
      metadata: {
        id: `mission-${context.project}-${new Date().toISOString()}`,
        name: context.missionTemplateId ?? `Mission for ${context.project}`,
        version: "1.0.0",
        description: context.currentTask ?? "Mission plan generated from context.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "draft",
        source: context.missionTemplateId ? "template" : "manual",
      },
      goal: {
        id: `goal-${context.project}`,
        title: context.currentTask ?? `Improve ${context.project}`,
        description: context.currentTask ?? `Mission for ${context.project}`,
      },
      objectives: [context.currentTask ?? `Improve ${context.project}`],
      agentIds,
      steps,
      summary,
      estimate: {
        steps: steps.length,
        tokens: summary.estimatedTokens,
        durationMs: summary.estimatedDurationMs,
        riskLevel: summary.riskLevel,
        approvalRequired: summary.approvalRequired,
      },
      expectedOutcomes: steps.flatMap((step) => step.expectedOutcomes),
      templateId: context.missionTemplateId,
    };
    return {
      mission,
      strategies: steps.map((step) => step.strategy),
      strategySteps: steps.flatMap((step) => step.strategy.steps),
      estimate: mission.estimate,
      executionOrder: steps.map((step) => step.id),
    };
  }
}

export function createMissionPlan(context: MissionContext): MissionPlan {
  return new MissionPlanner().plan(context);
}
