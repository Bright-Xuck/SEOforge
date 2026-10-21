// @forge/optimization-orchestrator
// Adapter: wraps @forge/execution-engine into the Engine interface

import type { Engine } from "../types.js";
import type { OptimizationContext } from "../context.js";
import { execute } from "@forge/execution-engine";
import type { ExecutionResult } from "@forge/execution-engine";
import type { WriteProvider } from "@forge/core";
import type { ReviewSession } from "@forge/review-engine";
import { buildExecutionPlanFromReview } from "./review-to-execution.js";

/**
 * Options for creating the execution engine adapter.
 * The adapter needs a WriteProvider to execute writes against (e.g. WordPress).
 */
export interface ExecutionAdapterOptions {
  provider?: WriteProvider;
  dryRun?: boolean;
  /** Resolve a content patch against raw provider content (Elementor/Gutenberg). */
  domEngine?: { resolve: (rawContent: string, patch: unknown) => Promise<string> };
  /** Read the raw provider content a patch must be resolved against. */
  fetchResource?: (resourceType: string, resourceId: string | number) => Promise<string>;
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
      let plan = context.executionPlan as any;

      // The composer produces bundles/dependencies, not executable actions.
      // When no actionable plan exists, translate the reviewed session into
      // actions. Only items the reviewer approved can become actions.
      if (!plan || !Array.isArray(plan.actions) || plan.actions.length === 0) {
        const session = context.reviewSession as ReviewSession | undefined;
        const pageId = context.pageId ?? context.target?.pageId;
        if (session && typeof pageId === "number") {
          plan = buildExecutionPlanFromReview(session, {
            pageId,
            url: context.pageUrl ?? context.project,
          });
          context.executionPlan = plan;
        }
      }

      if (!plan) {
        // No execution plan — skip
        return ctx;
      }

      const dryRun = options.dryRun ?? true;
      const provider = options.provider;

      // Normalize to a real ExecutionPlan. Composed plans deliberately have no
      // actions, so never fabricate an empty plan from them.
      const executionPlan = {
        url: plan.url ?? context.pageUrl ?? context.project,
        generatedAt: plan.generatedAt ?? new Date().toISOString(),
        actions: plan.actions ?? [],
        approvalQueue: plan.approvalQueue ?? [],
        summary:
          plan.summary ?? {
            total: (plan.actions ?? []).length,
            automatable: (plan.actions ?? []).filter((a: { automatable?: boolean }) => a.automatable).length,
            requiresApproval: (plan.actions ?? []).filter((a: { requiresApproval?: boolean }) => a.requiresApproval).length,
            byRisk: { safe: 0, moderate: 0, high: 0, critical: 0 },
          },
        estimatedDuration: plan.estimatedDuration ?? "0m",
        riskSummary: plan.riskSummary ?? { safe: 0, moderate: 0, high: 0, critical: 0 },
      };

      let result: ExecutionResult;

      if (!provider) {
        // No provider — dry run only
        result = await execute(executionPlan as any, null as any, {
          dryRun: true,
          stopOnBlocked: true,
          domEngine: options.domEngine,
          fetchResource: options.fetchResource,
        });
      } else {
        result = await execute(executionPlan as any, provider, {
          dryRun,
          stopOnBlocked: true,
          domEngine: options.domEngine,
          fetchResource: options.fetchResource,
        });
      }

      context.executionHistory = [result];
      context.executionResult = result;

      return context;
    },
  };
}