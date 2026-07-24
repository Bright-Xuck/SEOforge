// @forge/content-generation
// Public API for the Section Content Generation Engine (Sprint 17 + Sprint 20).

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

// Sprint 20 — Content Brief
export { buildContentBrief } from "./brief/builder.js";
export type { ContentBrief } from "./brief/builder.js";

// Sprint 20 — Brand Voice
export { detectVoiceProfile } from "./brand/voice.js";
export type { VoiceProfile, VoiceType, VoiceMetrics } from "./brand/voice.js";

// Sprint 20 — Validators
export { validateSEO } from "./validator/seo.js";
export type { SEOValidationReport } from "./validator/seo.js";

// Sprint 20 — Scoring
export { scoreContent } from "./scoring/scorer.js";
export type { ContentQualityReport } from "./scoring/scorer.js";