// @forge/optimization-orchestrator
// Declarative workflow definitions

import type { WorkflowDefinition } from "./types.js";
import { OptimizationState } from "./state-machine.js";

// ─── Built-in Workflow Definitions ──────────────────────────

export const WORKFLOWS: Record<string, WorkflowDefinition> = {
  "homepage-optimization": {
    id: "homepage-optimization",
    name: "Homepage Optimization",
    description: "Analyze, generate, review, compose, and execute homepage improvements",
    steps: [
      { id: "analyse", engine: "content-intelligence", phase: OptimizationState.Analysing },
      { id: "generate", engine: "content-generation", phase: OptimizationState.Generating },
      { id: "review", engine: "review", phase: OptimizationState.Reviewing },
      { id: "compose", engine: "composer", phase: OptimizationState.Composing },
      { id: "execute", engine: "execution", phase: OptimizationState.Executing },
    ],
  },
  "blog-optimization": {
    id: "blog-optimization",
    name: "Blog Optimization",
    description: "Analyze, generate, review, compose, and execute blog section improvements",
    steps: [
      { id: "analyse", engine: "content-intelligence", phase: OptimizationState.Analysing },
      { id: "generate", engine: "content-generation", phase: OptimizationState.Generating },
      { id: "review", engine: "review", phase: OptimizationState.Reviewing },
      { id: "compose", engine: "composer", phase: OptimizationState.Composing },
      { id: "execute", engine: "execution", phase: OptimizationState.Executing },
    ],
  },
  "landing-page-optimization": {
    id: "landing-page-optimization",
    name: "Landing Page Optimization",
    description: "Optimize landing page sections",
    steps: [
      { id: "analyse", engine: "content-intelligence", phase: OptimizationState.Analysing },
      { id: "generate", engine: "content-generation", phase: OptimizationState.Generating },
      { id: "review", engine: "review", phase: OptimizationState.Reviewing },
      { id: "compose", engine: "composer", phase: OptimizationState.Composing },
      { id: "execute", engine: "execution", phase: OptimizationState.Executing },
    ],
  },
  "product-page-optimization": {
    id: "product-page-optimization",
    name: "Product Page Optimization",
    description: "Optimize product page sections",
    steps: [
      { id: "analyse", engine: "content-intelligence", phase: OptimizationState.Analysing },
      { id: "generate", engine: "content-generation", phase: OptimizationState.Generating },
      { id: "review", engine: "review", phase: OptimizationState.Reviewing },
      { id: "compose", engine: "composer", phase: OptimizationState.Composing },
      { id: "execute", engine: "execution", phase: OptimizationState.Executing },
    ],
  },
  "category-optimization": {
    id: "category-optimization",
    name: "Category Optimization",
    description: "Optimize category page sections",
    steps: [
      { id: "analyse", engine: "content-intelligence", phase: OptimizationState.Analysing },
      { id: "generate", engine: "content-generation", phase: OptimizationState.Generating },
      { id: "review", engine: "review", phase: OptimizationState.Reviewing },
      { id: "compose", engine: "composer", phase: OptimizationState.Composing },
      { id: "execute", engine: "execution", phase: OptimizationState.Executing },
    ],
  },
  "content-refresh": {
    id: "content-refresh",
    name: "Content Refresh",
    description: "Review existing content, compose improvements, and execute",
    steps: [
      { id: "analyse", engine: "content-intelligence", phase: OptimizationState.Analysing },
      { id: "review", engine: "review", phase: OptimizationState.Reviewing },
      { id: "compose", engine: "composer", phase: OptimizationState.Composing },
      { id: "execute", engine: "execution", phase: OptimizationState.Executing },
    ],
  },
};

/**
 * Get a workflow definition by ID.
 * Throws if the workflow does not exist.
 */
export function getWorkflow(id: string): WorkflowDefinition {
  const workflow = WORKFLOWS[id];
  if (!workflow) {
    throw new Error(`Unknown workflow: ${id}. Available: ${Object.keys(WORKFLOWS).join(", ")}`);
  }
  return workflow;
}

/**
 * Register a custom workflow definition.
 */
export function registerWorkflow(definition: WorkflowDefinition): void {
  WORKFLOWS[definition.id] = definition;
}

/**
 * List all registered workflow IDs.
 */
export function listWorkflows(): string[] {
  return Object.keys(WORKFLOWS);
}