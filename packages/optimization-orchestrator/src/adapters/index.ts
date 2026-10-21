// @forge/optimization-orchestrator
// Adapters barrel export — wraps real engines into the Engine interface

export { createContentIntelligenceEngine } from "./content-intelligence-adapter.js";
export { createSiteIntelligenceEngine } from "./site-intelligence-adapter.js";
export { createContentGenerationEngine } from "./content-generation-adapter.js";
export type { ContentGenerationAdapterOptions, SectionTarget } from "./content-generation-adapter.js";
export { createReviewEngine } from "./review-adapter.js";
export type { ReviewAdapterOptions } from "./review-adapter.js";
export { createComposerEngine } from "./composer-adapter.js";
export { createExecutionEngine } from "./execution-adapter.js";
export type { ExecutionAdapterOptions } from "./execution-adapter.js";
export {
  buildExecutionPlanFromReview,
  isExecutablePatch,
} from "./review-to-execution.js";
export type { ReviewExecutionOptions } from "./review-to-execution.js";

import type { Engine } from "../types.js";
import { createContentIntelligenceEngine } from "./content-intelligence-adapter.js";
import { createSiteIntelligenceEngine } from "./site-intelligence-adapter.js";
import { createComposerEngine } from "./composer-adapter.js";
import { createReviewEngine } from "./review-adapter.js";

/**
 * Create the default set of deterministic engines (no AI, no provider required).
 * Returns engines for: content-intelligence, review, composer, execution (dry-run).
 *
 * Content generation is excluded because it requires AIEngine + PromptRegistry.
 * Execution is dry-run only (no provider).
 */
export function createDefaultEngines(): Engine[] {
  return [
    createContentIntelligenceEngine(),
    createSiteIntelligenceEngine(),
    createReviewEngine(),
    createComposerEngine(),
  ];
}