// @forge/content-intelligence
// Content Intelligence Engine - deterministic content understanding.
// NO AI. NO text generation.

// Types
export type {
  PageDNA,
  PageType,
  PageTypeKind,
  SearchIntent,
  SearchIntentKind,
  AudienceProfile,
  SectionInventory,
  SectionInfo,
  SectionKind,
  Entity,
  EntityKind,
  Topic,
  LinkSummary,
  MediaSummary,
  TrustIndicators,
  SchemaSummary,
  MetadataSummary,
  QualityScores,
  ReadabilityScore,
  HeadingQualityScore,
  ContentDepthScore,
  TopicCoverageScore,
  TrustScore,
  CtaScore,
  InternalLinkingScore,
  SemanticCoverageScore,
  ContentGap,
  ContentGapKind,
  ContentRecommendation,
  ContentGraph,
  GraphNode,
  GraphRelationship,
  ContentIntelligenceInput,
  HeadingDistribution,
  PageProfile,
  ContentScore,
  EntityCoverage,
  PageDNAVersion,
  PageDNAWarning,
} from "./types.js";

// Page DNA
export { buildPageDNA } from "./page-dna/builder.js";
export { detectPageType } from "./page-dna/page-type-detector.js";
export { detectSearchIntent } from "./page-dna/search-intent-detector.js";
export { detectAudience } from "./page-dna/audience-detector.js";
export { detectSections } from "./page-dna/section-detector.js";
export { extractEntities } from "./page-dna/entity-extractor.js";
export { extractTopics } from "./page-dna/topic-extractor.js";

// Stable IDs (Hardening Phase)
export { generateSectionId } from "./page-dna/id-generator.js";
export { generateBlockId } from "./page-dna/id-generator.js";
export { extractSectionKind } from "./page-dna/id-generator.js";
export { generateSectionSelector } from "./page-dna/id-generator.js";

// Version Validation (Hardening Phase)
export {
  validatePageDNAVersion,
  isPageDNACompatible,
  getPageDNAWarnings,
  createPageDNAWithVersion,
  SCHEMA_COMPATIBILITY,
} from "./page-dna/version-validator.js";

// Selectors (Hardening Phase)
export type {
  ContentSelector,
  SelectorType,
  SelectorTarget,
  SelectorOptions,
  SectionSelector,
  BlockSelector,
  NodeSelector,
  ParagraphSelector,
  HeadingSelector,
  TextSelector,
  MediaSelector,
  AnySelector,
} from "./selector/types.js";
export { SelectorBuilder } from "./selector/builder.js";

// Pipeline Outputs (Hardening Phase)
export type {
  ContentAnalysisOutput,
  ContentGraphOutput,
  PageDNAOutput,
  GapReportOutput,
  QualityReportOutput,
  PipelineOutput,
  OutputFormat,
  OutputBuilderContract,
} from "./pipeline/types.js";
export { OutputBuilder } from "./pipeline/builder.js";

// Content Graph
export { buildContentGraph } from "./content-graph/builder.js";

// Gap Detection
export { detectGaps } from "./gap/detector.js";

// Quality Scoring
export { scoreQuality } from "./quality/scorer.js";