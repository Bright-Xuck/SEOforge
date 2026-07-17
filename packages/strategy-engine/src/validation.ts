import type { Strategy, StrategyContext, StrategyRisk } from "./types.js";

export interface StrategyValidationResult {
  readonly valid: boolean;
  readonly issues: string[];
}

function hasCircularDependencies(strategy: Strategy): boolean {
  const visited = new Set<string>();
  const stack = new Set<string>();

  const visit = (stepId: string): boolean => {
    if (stack.has(stepId)) return true;
    if (visited.has(stepId)) return false;
    visited.add(stepId);
    stack.add(stepId);
    const step = strategy.steps.find((item) => item.id === stepId);
    if (!step) return false;
    for (const dependency of step.dependencies) {
      if (visit(dependency)) return true;
    }
    stack.delete(stepId);
    return false;
  };

  return strategy.steps.some((step) => visit(step.id));
}

export function validateStrategy(strategy: Strategy, context: StrategyContext): StrategyValidationResult {
  const issues: string[] = [];

  const pipelineIds = strategy.selectedPipelines;
  if (new Set(pipelineIds).size !== pipelineIds.length) {
    issues.push("Duplicate pipelines are not allowed.");
  }

  for (const pipelineId of strategy.selectedPipelines) {
    if (!context.pipelineRegistry.exists(pipelineId)) {
      issues.push(`Missing pipeline: ${pipelineId}`);
    }
  }

  for (const skillId of strategy.selectedSkills) {
    if (!context.skillRegistry.exists(skillId)) {
      issues.push(`Missing skill: ${skillId}`);
    }
  }

  for (const provider of context.providerRegistry.list()) {
    if (!context.providerRegistry.exists(provider.id)) {
      issues.push(`Missing provider: ${provider.id}`);
    }
  }

  if (hasCircularDependencies(strategy)) {
    issues.push("Circular dependencies detected.");
  }

  if (strategy.estimatedTokens <= 0 || strategy.estimatedDurationMs <= 0) {
    issues.push("Invalid estimates.");
  }

  const riskConsistency: Record<StrategyRisk, number> = {
    low: 0,
    moderate: 1,
    high: 2,
    critical: 3,
  };
  const stepRisk = Math.max(...strategy.steps.map((step) => riskConsistency[step.riskLevel]), 0);
  if (riskConsistency[strategy.riskLevel] < stepRisk) {
    issues.push("Risk consistency violation.");
  }

  return { valid: issues.length === 0, issues };
}
