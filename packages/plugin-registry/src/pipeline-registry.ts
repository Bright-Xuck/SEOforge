import { PipelineNotFoundError, PipelineStepNotFoundError } from "./pipeline-errors.js";
import type {
  PipelineContract,
  PipelineRegistryEntry,
  PipelineStepContract,
  PipelineStepRegistryEntry,
} from "./pipeline-types.js";

export class PipelineRegistry {
  private pipelines = new Map<string, PipelineRegistryEntry>();
  private steps = new Map<string, PipelineStepRegistryEntry>();

  registerPipeline(pipeline: PipelineContract): void {
    this.pipelines.set(pipeline.id, { pipeline, registeredAt: new Date().toISOString() });
  }

  registerStep(step: PipelineStepContract): void {
    this.steps.set(step.id, { step, registeredAt: new Date().toISOString() });
  }

  listPipelines(): PipelineContract[] {
    return Array.from(this.pipelines.values()).map((entry) => entry.pipeline);
  }

  listSteps(): PipelineStepContract[] {
    return Array.from(this.steps.values()).map((entry) => entry.step);
  }

  resolvePipeline(id: string): PipelineContract {
    const entry = this.pipelines.get(id);
    if (!entry) {
      throw new PipelineNotFoundError(id);
    }
    return entry.pipeline;
  }

  validatePipeline(id: string): { valid: boolean; issues: string[] } {
    const pipeline = this.resolvePipeline(id);
    const issues: string[] = [];
    const knownSteps = new Set(this.steps.keys());
    const pipelineStepIds = new Set<string>();

    for (const step of pipeline.steps) {
      pipelineStepIds.add(step.id);
      if (!knownSteps.has(step.id)) {
        issues.push(`Step not registered: ${step.id}`);
      }
      for (const dependency of step.dependencies) {
        if (!pipelineStepIds.has(dependency) && !pipeline.steps.some((item) => item.id === dependency)) {
          issues.push(`Missing dependency "${dependency}" for step "${step.id}"`);
        }
      }
    }

    return { valid: issues.length === 0, issues };
  }

  resolveStep(id: string): PipelineStepContract {
    const entry = this.steps.get(id);
    if (!entry) {
      throw new PipelineStepNotFoundError(id);
    }
    return entry.step;
  }

  clear(): void {
    this.pipelines.clear();
    this.steps.clear();
  }
}
