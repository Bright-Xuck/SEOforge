// @forge/optimization-orchestrator
// Adapter: wraps @forge/execution-engine into the Engine interface

import type { Engine } from "../types.js";
import type { OptimizationContext } from "../context.js";
import { execute } from "@forge/execution-engine";
import type { ExecutionResult } from "@forge/execution-engine";
import type { WriteProvider } from "@forge/core";

/**
 * Options for creating the execution engine adapter.
 * The adapter needs a WriteProvider to execute writes against (e.g. WordPress).
 */
export interface ExecutionAdapterOptions {
  provider?: WriteProvider;
  dryRun?: boolean;
}

/**
 * Execution Engine adapter.
 *
 * Reads: executionPlan (composed plan) from context
 * Writes: executionHistory to context
 *
 * Execution ONLY executes approved actions.
 * Never generates content. Never plans. Never reviews.
 */
export function createExecutionEngine(options: ExecutionAdapterOptions = {}): Engine {
  return {
    type: "execution",
    async execute(ctx: Record<string, unknown>): Promise<Record<string, unknown>> {
      const context = ctx as OptimizationContext;
      const plan = context.executionPlan as any;

      if (!plan) {
        // No execution plan — skip
        return ctx;
      }

      const dryRun = options.dryRun ?? true;
      const provider = options.provider;

      // Build a minimal execution plan from the composed plan
      const executionPlan = {
        url: context.project,
        generatedAt: new Date().toISOString(),
        actions: plan.actions ?? [],
        approvalQueue: plan.approvalQueue ?? [],
        summary: plan.summary ?? { total: 0, automatable: 0, requiresApproval: 0, byRisk: {} },
        estimatedDuration: plan.estimatedDuration ?? "0m",
        riskSummary: plan.riskSummary ?? { safe: 0, moderate: 0, high: 0, critical: 0 },
      };

      let result: ExecutionResult;

      if (!provider) {
        // No provider — dry run only
        result = await execute(executionPlan as any, null as any, { dryRun: true, stopOnBlocked: true });
      } else {
        result = await execute(executionPlan as any, provider, { dryRun, stopOnBlocked: true });
      }

      context.executionHistory = [result];

      return context;
    },
  };
}