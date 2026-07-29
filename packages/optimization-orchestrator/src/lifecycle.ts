// @forge/optimization-orchestrator
// Lifecycle hooks for the optimization orchestrator

import type { OptimizationContext } from "./context.js";
import type { OptimizationEventPayload } from "./types.js";
import { OptimizationState } from "./state-machine.js";

export type LifecycleHook = (
  context: OptimizationContext,
  event?: OptimizationEventPayload,
) => void | Promise<void>;

export class LifecycleManager {
  private hooks: Map<OptimizationState, LifecycleHook[]> = new Map();

  on(state: OptimizationState, hook: LifecycleHook): void {
    if (!this.hooks.has(state)) {
      this.hooks.set(state, []);
    }
    this.hooks.get(state)!.push(hook);
  }

  async runHooks(
    state: OptimizationState,
    context: OptimizationContext,
    event?: OptimizationEventPayload,
  ): Promise<void> {
    const hooks = this.hooks.get(state);
    if (!hooks) return;
    for (const hook of hooks) {
      await hook(context, event);
    }
  }

  clear(): void {
    this.hooks.clear();
  }
}