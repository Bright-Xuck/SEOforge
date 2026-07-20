// @forge/content-generation
// Public API for the Section Content Generation Engine (Sprint 17).

export * from "./types.js";
export * from "./patch/types.js";
export * from "./diff/types.js";
export { buildPatch, buildSectionPatch, summarizePatches } from "./patch/builder.js";
export { buildSectionDiff } from "./diff/builder.js";
export { PromptBuilder } from "./prompt/builder.js";
export { buildProjectContext } from "./context/project-context.js";
export { validateGeneratedSection } from "./validation/validator.js";
export { generateContent } from "./generate.js";
export { runGenerator, registeredSectionKinds } from "./generators/registry.js";
export type { SectionGeneratorInput } from "./generators/types.js";
export { generateSection } from "./generators/orchestrator.js";
