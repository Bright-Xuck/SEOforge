export { createKnowledgeGraph, updateKnowledgeGraph, mergeKnowledgeGraphs, exportKnowledgeGraph, importKnowledgeGraph } from "./engine.js";
export { ensureProjectStorage, loadKnowledge, saveKnowledge, readProjectBundle } from "./storage.js";
export { detectChanges } from "./change-detector.js";
export { createProjectProfile } from "./project-profile.js";
export type { KnowledgeGraph, KnowledgePatch, KnowledgeVersion, ReviewStats } from "./types.js";
export type { ChangeReport, SnapshotLike } from "./change-detector.js";
export type { ProjectProfile, MemorySummaryLike } from "./project-profile.js";
