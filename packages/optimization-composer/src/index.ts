export { OptimizationComposer } from "./composer.js";
export { PatchDAG } from "./graph.js";
export { ConflictDetector } from "./conflict.js";
export { PatchBundler } from "./bundler.js";
export { GoalAssigner, COMMON_GOALS } from "./goals.js";
export { PreviewGenerator } from "./preview.js";
export { BatchValidator } from "./validator.js";
export { RollbackManager } from "./rollback.js";
export type {
  ContentPatchRef,
  PatchBundle,
  PatchGraph,
  PatchNode,
  PatchEdge,
  PatchConflict,
  ConflictResult,
  ComposedPlan,
  OptimizationGoal,
  OptimizationPreview,
  ValidationResult,
  ValidationError,
  RollbackGroup,
  PatchPriority,
} from "./types.js";
export { PRIORITY_RANK } from "./types.js";