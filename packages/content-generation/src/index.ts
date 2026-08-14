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
export type { SiteBriefContext } from "./brief/builder.js";
export type { ContentBrief } from "./brief/builder.js";

// Sprint 20 — Brand
export { buildBrandProfile } from "./brand/profile.js";
export type { BrandProfileInput } from "./brand/profile.js";
export { detectVoiceProfile } from "./brand/voice.js";
export type { VoiceProfile, VoiceType, VoiceMetrics } from "./brand/voice.js";
export { extractTerminology } from "./brand/terminology.js";
export type { TerminologyResult } from "./brand/terminology.js";
export { checkProhibitedWords } from "./brand/prohibited.js";
export type { ProhibitedWordsResult } from "./brand/prohibited.js";

// Sprint 20 — Prompts
export { PromptComposer } from "./prompts/composer.js";
export { resolveVariable, resolveAllVariables, renderTemplate } from "./prompts/variables.js";
export type { PromptVariables } from "./prompts/variables.js";
export { createPromptTemplate, mergeTemplates } from "./prompts/templates.js";
export type { PromptTemplate } from "./prompts/templates.js";

// Sprint 20 — Writers
export { BaseSectionWriter } from "./writers/base.js";
export type { BaseSectionWriterInput, BaseSectionWriterResult } from "./writers/base.js";
export { writeHero } from "./writers/hero.js";
export type { HeroWriterInput } from "./writers/hero.js";
export { writeBenefits } from "./writers/benefits.js";
export type { BenefitsWriterInput } from "./writers/benefits.js";
export { writeFeatures } from "./writers/features.js";
export type { FeaturesWriterInput } from "./writers/features.js";
export { writeServices } from "./writers/services.js";
export type { ServicesWriterInput } from "./writers/services.js";
export { writeProducts } from "./writers/products.js";
export type { ProductsWriterInput } from "./writers/products.js";
export { writeAbout } from "./writers/about.js";
export type { AboutWriterInput } from "./writers/about.js";
export { writeFaq } from "./writers/faq.js";
export type { FaqWriterInput } from "./writers/faq.js";
export { writeTestimonials } from "./writers/testimonials.js";
export type { TestimonialsWriterInput } from "./writers/testimonials.js";
export { writeCta } from "./writers/cta.js";
export type { CtaWriterInput } from "./writers/cta.js";
export { writeBuyingGuide } from "./writers/buying-guide.js";
export type { BuyingGuideWriterInput } from "./writers/buying-guide.js";
export { writeComparison } from "./writers/comparison.js";
export type { ComparisonWriterInput } from "./writers/comparison.js";
export { writeProduct } from "./writers/product.js";
export type { ProductWriterInput } from "./writers/product.js";
export { writeIntroduction } from "./writers/introduction.js";
export type { IntroductionWriterInput } from "./writers/introduction.js";
export { writeConclusion } from "./writers/conclusion.js";
export type { ConclusionWriterInput } from "./writers/conclusion.js";
export { writeContact } from "./writers/contact.js";
export type { ContactWriterInput } from "./writers/contact.js";
export { writeBlog } from "./writers/blog.js";
export type { BlogWriterInput } from "./writers/blog.js";

// Sprint 20 — Validators
export { validateSEO } from "./validator/seo.js";
export type { SEOValidationReport } from "./validator/seo.js";
export { validateQuality } from "./validator/quality.js";
export type { QualityValidationReport } from "./validator/quality.js";
export { validateEEAT } from "./validator/eeat.js";
export type { EEATValidationReport } from "./validator/eeat.js";
export { validateReadability } from "./validator/readability.js";
export type { ReadabilityValidationReport } from "./validator/readability.js";
export { validateCompliance } from "./validator/compliance.js";
export type { ComplianceValidationReport } from "./validator/compliance.js";

// Sprint 20 — Scoring
export { scoreContent } from "./scoring/scorer.js";
export type { ContentQualityReport } from "./scoring/scorer.js";
export { estimateConfidence } from "./scoring/confidence.js";
export type { ConfidenceReport } from "./scoring/confidence.js";
export { computeQualityScores } from "./scoring/quality.js";
export type { QualitySubScores } from "./scoring/quality.js";

// Sprint 20 — Generated Content
export type { GeneratedContent, ContentValidationReport } from "./types.js";