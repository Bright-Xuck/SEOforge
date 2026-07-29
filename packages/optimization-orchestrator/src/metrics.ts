// @forge/optimization-orchestrator
// Runtime metrics collection

import type { OptimizationMetrics, IMetricsCollector } from "./types.js";

export class MetricsCollector implements IMetricsCollector {
  private workflowId: string;
  private project: string;
  private startTime: number;
  private stepDurations: Record<string, number> = {};
  private tokensUsed = 0;
  private aiCost = 0;
  private provider = "";
  private sectionsAnalysed = 0;
  private patchesGenerated = 0;
  private patchesApproved = 0;
  private patchesRejected = 0;
  private executionSuccess = false;
  private rollbackCount = 0;
  private stateTransitions = 0;

  constructor(workflowId: string, project: string) {
    this.workflowId = workflowId;
    this.project = project;
    this.startTime = Date.now();
  }

  recordStepDuration(stepId: string, duration: number): void {
    this.stepDurations[stepId] = duration;
  }

  recordTokens(count: number): void {
    this.tokensUsed += count;
  }

  recordCost(cost: number): void {
    this.aiCost += cost;
  }

  recordProvider(provider: string): void {
    this.provider = provider;
  }

  recordSectionsAnalysed(count: number): void {
    this.sectionsAnalysed = count;
  }

  recordPatchesGenerated(count: number): void {
    this.patchesGenerated = count;
  }

  recordPatchesApproved(count: number): void {
    this.patchesApproved = count;
  }

  recordPatchesRejected(count: number): void {
    this.patchesRejected = count;
  }

  recordExecutionSuccess(success: boolean): void {
    this.executionSuccess = success;
  }

  recordRollback(): void {
    this.rollbackCount++;
  }

  getMetrics(): OptimizationMetrics {
    return {
      workflowId: this.workflowId,
      project: this.project,
      duration: Date.now() - this.startTime,
      stepDurations: { ...this.stepDurations },
      tokensUsed: this.tokensUsed,
      aiCost: this.aiCost,
      provider: this.provider,
      sectionsAnalysed: this.sectionsAnalysed,
      patchesGenerated: this.patchesGenerated,
      patchesApproved: this.patchesApproved,
      patchesRejected: this.patchesRejected,
      executionSuccess: this.executionSuccess,
      rollbackCount: this.rollbackCount,
      stateTransitions: this.stateTransitions,
    };
  }

  reset(): void {
    this.stepDurations = {};
    this.tokensUsed = 0;
    this.aiCost = 0;
    this.provider = "";
    this.sectionsAnalysed = 0;
    this.patchesGenerated = 0;
    this.patchesApproved = 0;
    this.patchesRejected = 0;
    this.executionSuccess = false;
    this.rollbackCount = 0;
    this.stateTransitions = 0;
    this.startTime = Date.now();
  }
}