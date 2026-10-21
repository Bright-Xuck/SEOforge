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
export { buildPageDNA, buildPageDNAFromSnapshot } from "./page-dna/builder.js";
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

// Content Snapshot (Hardening Pass)
export { serializeContentSnapshot } from "./snapshot/builder.js";
export type {
  ContentSnapshot,
  SnapshotId,
  SnapshotMetadata,
  ContentFingerprint,
  SnapshotSummary,
} from "./snapshot/types.js";

// Gap Detection
export { detectGaps } from "./gap/detector.js";

// Quality Scoring
export { scoreQuality } from "./quality/scorer.js";

// ---------------------------------------------------------------------------
// Site-level Content Intelligence (Sprint 24)
// An EXTENSION of page-level Content Intelligence — not a new engine.
// Deterministic. NO AI. NO network. NO persistence.
// ---------------------------------------------------------------------------

// Site types
export type {
  UniversalPageLike,
  SiteAnalysisKnowledge,
  SiteAnalysisMemory,
  SitePageEntry,
  SiteSectionCoverage,
  SiteQualitySummary,
  SiteFreshnessSummary,
  SiteSemanticCoverage,
  SiteContentModel,
  TopicRelationshipKind,
  TopicEdge,
  SiteTopic,
  TopicGraphEdge,
  TopicGraph,
  TopicCluster,
  SiteAuthorityDimension,
  SiteAuthorityScores,
  SiteOpportunityKind,
  OpportunityReference,
  SiteOpportunity,
  InternalLinkOpportunityKind,
  InternalLinkOpportunity,
  RefreshReasonKind,
  RefreshCandidate,
  SiteIntelligenceSummary,
  SiteIntelligenceContext,
  SiteIntelligenceReport,
  SiteAnalysisOptions,
  SitePageInput,
  SiteAnalysisEvent,
} from "./site/types.js";

// Site model (composes PageDNA / ContentGraph / quality)
export { extractUniversalPageStructure, buildSitePageEntry, buildSiteContentModel } from "./site/model.js";

// Topic graph
export { buildTopicGraph } from "./site/topic-graph.js";

// Topic clusters
export { buildTopicClusters } from "./site/cluster-builder.js";

// Site authority / coverage (Forge diagnostic scores only)
export { scoreSiteAuthority } from "./site/authority.js";

// Content opportunities (extends page-level gap detection)
export { detectSiteOpportunities } from "./site/opportunities.js";

// Internal link opportunities (output only)
export { detectInternalLinkOpportunities } from "./site/internal-links.js";

// Page priorities (ordered work queue derived from the site report)
export { rankPagePriorities } from "./site/page-priority.js";
export type { PagePriority, PagePriorityBand, PagePrioritySignals } from "./site/page-priority.js";

// Content refresh detection
export { detectRefreshCandidates } from "./site/refresh.js";

// Site analyzer
export { analyzeSite, analyzeSiteFromPages } from "./site/analyzer.js";

// Memory integration (records through the existing memory system)
export { createSiteAnalysisMemoryEvent } from "./site/memory.js";