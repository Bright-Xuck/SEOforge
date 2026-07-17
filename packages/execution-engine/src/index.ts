// @forge/execution-engine
// Dry-run execution engine with rollback framework and history.

export { execute, getRollbackOperations } from "./engine.js";
export { RollbackStore } from "./rollback.js";
export { ExecutionHistory } from "./history.js";
export type {
  ExecutionResult,
  RollbackOperation,
  ExecutionHistoryEntry,
} from "./types.js";
export type { ExecutionEngineOptions } from "./engine.js";