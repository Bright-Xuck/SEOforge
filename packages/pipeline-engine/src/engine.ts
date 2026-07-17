import type { PipelineContext, PipelineDefinition, PipelineResult, PipelineStepDefinition, PipelineStepResult, PipelineEvent } from "./types.js";

function now(): string {
  return new Date().toISOString();
}

function resolveDependencies(steps: PipelineStepDefinition[]): PipelineStepDefinition[] {
  const resolved: PipelineStepDefinition[] = [];
  const remaining = new Map(steps.map((step) => [step.id, step]));
  const visiting = new Set<string>();

  const visit = (step: PipelineStepDefinition): void => {
    if (resolved.some((item) => item.id === step.id)) return;
    if (visiting.has(step.id)) {
      throw new Error(`Circular pipeline dependency detected for step "${step.id}"`);
    }
    visiting.add(step.id);
    for (const dependencyId of step.dependencies) {
      const dependency = remaining.get(dependencyId);
      if (!dependency) {
        throw new Error(`Missing pipeline dependency "${dependencyId}" for step "${step.id}"`);
      }
      visit(dependency);
    }
    visiting.delete(step.id);
    resolved.push(step);
  };

  for (const step of steps) visit(step);
  return resolved;
}

export async function executePipeline(
  definition: PipelineDefinition,
  context: PipelineContext = {},
): Promise<PipelineResult> {
  const startedAt = Date.now();
  const events: PipelineEvent[] = [];
  const stepResults: PipelineStepResult[] = [];
  const executed: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];
  const outputs: Record<string, unknown> = {};

  const orderedSteps = resolveDependencies(definition.steps);
  events.push({ type: "PipelineStarted", pipelineId: definition.id, pipelineName: definition.name, timestamp: now() });

  for (const step of orderedSteps) {
    const stepStarted = Date.now();
    events.push({ type: "StepStarted", pipelineId: definition.id, pipelineName: definition.name, timestamp: now(), stepId: step.id });
    try {
      const output = await step.execute(context);
      executed.push(step.id);
      outputs[step.id] = output as unknown;
      (context.outputs ??= {})[step.id] = output as unknown;
      stepResults.push({
        stepId: step.id,
        status: "completed",
        startedAt: new Date(stepStarted).toISOString(),
        finishedAt: now(),
        durationMs: Date.now() - stepStarted,
        output,
        warnings: [],
        errors: [],
      });
      events.push({ type: "StepCompleted", pipelineId: definition.id, pipelineName: definition.name, timestamp: now(), stepId: step.id });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown step failure";
      errors.push(message);
      stepResults.push({
        stepId: step.id,
        status: "failed",
        startedAt: new Date(stepStarted).toISOString(),
        finishedAt: now(),
        durationMs: Date.now() - stepStarted,
        warnings: [],
        errors: [message],
      });
      events.push({ type: "StepFailed", pipelineId: definition.id, pipelineName: definition.name, timestamp: now(), stepId: step.id, error: message });
      const failedIndex = orderedSteps.findIndex((candidate) => candidate.id === step.id);
      for (const pending of orderedSteps.slice(failedIndex + 1)) {
        skipped.push(pending.id);
      }
      break;
    }
  }

  events.push({ type: "PipelineCompleted", pipelineId: definition.id, pipelineName: definition.name, timestamp: now() });

  const status = errors.length > 0 ? (executed.length > 0 ? "partial" : "failed") : "success";
  return {
    status,
    pipelineId: definition.id,
    pipelineName: definition.name,
    stepsExecuted: executed,
    stepsSkipped: skipped,
    durationMs: Date.now() - startedAt,
    errors,
    outputs,
    events,
    stepResults,
  };
}
