// @forge/execution-engine
// Dry-run execution engine with rollback framework and history.

export { execute, executeWithValidation, getRollbackOperations, rollbackExecution } from "./engine.js";
export { RollbackStore } from "./rollback.js";
export { ExecutionHistory } from "./history.js";
export { PolicyEngine } from "./policies.js";
export type {
  ExecutionResult,
  RollbackOperation,
  ExecutionHistoryEntry,
} from "./types.js";
export type { ExecutionEngineOptions } from "./engine.js";
export type { PolicyEngine as PolicyEngineType, PolicyDecision, PolicyLevel } from "./policies.js";
