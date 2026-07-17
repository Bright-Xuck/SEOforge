import { ContextBuildError } from "@forge/ai-engine";
import type { AIContext } from "@forge/context-builder";
import type { Strategy, StrategyContext, StrategyDecision, StrategyEstimate, StrategyGoal, StrategyRisk, StrategyStep } from "./types.js";

function summarizeText(context: StrategyContext): string {
  return [
    context.currentTask ?? "",
    JSON.stringify(context.latestFindings ?? []),
    JSON.stringify(context.recommendations ?? []),
    JSON.stringify(context.executionPlans ?? []),
    JSON.stringify(context.validationReports ?? []),
    JSON.stringify(context.executionHistory ?? []),
  ]
    .join(" ")
    .toLowerCase();
}

function inferRisk(text: string): StrategyRisk {
  if (text.includes("critical")) return "critical";
  if (text.includes("high")) return "high";
  if (text.includes("moderate")) return "moderate";
  return "low";
}

function inferPipelines(context: StrategyContext, text: string): string[] {
  const allPipelines = context.pipelineRegistry.listPipelines().map((pipeline) => pipeline.id);
  if (text.includes("validate")) {
    const candidates = allPipelines.filter((id) => id.includes("validation"));
    return candidates.length > 0 ? candidates : ["validation-only"];
  }
  if (text.includes("weekly")) {
    const candidates = allPipelines.filter((id) => id.includes("weekly"));
    return candidates.length > 0 ? candidates : ["weekly-optimization"];
  }
  const candidates = allPipelines.filter((id) => id.includes("audit"));
  return candidates.length > 0 ? candidates : ["website-audit"];
}

function inferSkills(context: StrategyContext, text: string): string[] {
  const allSkills = context.skillRegistry.list().map((skill) => skill.id);
  if (text.includes("schema")) {
    const candidates = allSkills.filter((id) => id.includes("schema"));
    return candidates.length > 0 ? candidates : ["skill.generate-faq-schema"];
  }
  if (text.includes("link")) {
    const candidates = allSkills.filter((id) => id.includes("link"));
    return candidates.length > 0 ? candidates : ["skill.generate-internal-links"];
  }
  if (text.includes("access")) {
    const candidates = allSkills.filter((id) => id.includes("alt") || id.includes("heading"));
    return candidates.length > 0 ? candidates : ["skill.generate-alt"];
  }
  if (text.includes("performance")) {
    const candidates = allSkills.filter((id) => id.includes("expand"));
    return candidates.length > 0 ? candidates : ["skill.expand-thin-content"];
  }
  const candidates = allSkills.filter((id) => id.includes("title") || id.includes("description"));
  return candidates.length > 0 ? candidates : ["skill.generate-title"];
}

function buildSteps(selectedPipelines: string[], selectedSkills: string[], riskLevel: StrategyRisk): StrategyStep[] {
  return selectedPipelines.map((pipelineId, index) => ({
    id: `step-${index + 1}`,
    name: `Execute ${pipelineId}`,
    description: `Resolve and execute pipeline ${pipelineId}.`,
    order: index + 1,
    dependencies: index === 0 ? [] : [`step-${index}`],
    selectedPipelines: [pipelineId],
    selectedSkills: selectedSkills.slice(),
    estimatedWork: [pipelineId, ...selectedSkills],
    estimatedTokens: 500 + selectedSkills.length * 100,
    estimatedDurationMs: 5_000 + selectedSkills.length * 1_000,
    riskLevel,
    approvalRequired: riskLevel !== "low",
    expectedOutcomes: [`Completed ${pipelineId}`],
  }));
}

function createStrategyDecision(agentId: string | undefined, riskLevel: StrategyRisk): StrategyDecision {
  return {
    agentId: agentId ?? "agent",
    rationale: "Strategy generated deterministically from agent context.",
    continueExecution: riskLevel === "low",
    stopExecution: false,
    escalateForApproval: riskLevel !== "low",
  };
}

export class StrategyBuilder {
  build(context: StrategyContext): Strategy {
    if (!context.project.trim()) {
      throw new ContextBuildError("Strategy requires a project identifier.");
    }

    const text = summarizeText(context);
    const selectedPipelines = inferPipelines(context, text);
    const selectedSkills = inferSkills(context, text);
    const riskLevel = inferRisk(text);
    const steps = buildSteps(selectedPipelines, selectedSkills, riskLevel);
    const estimate: StrategyEstimate = {
      workItems: steps.length,
      tokens: steps.reduce((sum, step) => sum + step.estimatedTokens, 0),
      durationMs: steps.reduce((sum, step) => sum + step.estimatedDurationMs, 0),
    };
    const goal: StrategyGoal = {
      id: `goal-${context.project}`,
      title: `Improve ${context.project}`,
      description: context.currentTask ?? "Generate an execution strategy.",
    };
    const now = new Date().toISOString();
    const strategy: Strategy = {
      metadata: {
        id: `strategy-${context.project}-${now}`,
        name: `Strategy for ${context.project}`,
        version: "1.2.0-beta.1",
        description: "Deterministic strategy generated from agent context.",
        createdAt: now,
        updatedAt: now,
        status: "draft",
        sourceAgentId: context.agentId ?? "agent",
      },
      goal,
      objectives: [goal.title, goal.description],
      priority: riskLevel === "critical" ? 1 : riskLevel === "high" ? 2 : riskLevel === "moderate" ? 3 : 4,
      steps,
      selectedPipelines,
      selectedSkills,
      estimatedWork: steps.flatMap((step) => step.estimatedWork),
      estimatedTokens: estimate.tokens,
      estimatedDurationMs: estimate.durationMs,
      riskLevel,
      approvalRequired: riskLevel !== "low",
      expectedOutcomes: steps.flatMap((step) => step.expectedOutcomes),
      summary: {
        totalPipelines: selectedPipelines.length,
        totalSkills: selectedSkills.length,
        totalSteps: steps.length,
        riskLevel,
        approvalRequired: riskLevel !== "low",
        estimatedTokens: estimate.tokens,
        estimatedDurationMs: estimate.durationMs,
      },
      decision: createStrategyDecision(context.agentId, riskLevel),
    };

    return strategy;
  }
}

export function createStrategyFromContext(context: StrategyContext): Strategy {
  return new StrategyBuilder().build(context);
}

export function summarizeStrategyDecision(context: StrategyContext): StrategyDecision {
  const text = summarizeText(context);
  return createStrategyDecision(context.agentId, inferRisk(text));
}

export function toAIContext(strategy: Strategy): AIContext {
  return {
    project: strategy.goal.id,
    currentTask: strategy.goal.title,
    knowledgeSummary: JSON.stringify(strategy.objectives),
    memorySummary: JSON.stringify(strategy.summary),
    projectProfileSummary: JSON.stringify(strategy.metadata),
    findingsSummary: JSON.stringify(strategy.steps),
    recommendationsSummary: JSON.stringify(strategy.expectedOutcomes),
    executionPlanSummary: JSON.stringify(strategy.selectedPipelines),
    validationReportSummary: JSON.stringify(strategy.riskLevel),
    metadata: { strategyId: strategy.metadata.id, priority: strategy.priority },
  };
}
