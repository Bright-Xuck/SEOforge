// @forge/content-intelligence
// Site-level content intelligence types (Sprint 24).
// Site Content Intelligence is an EXTENSION of page-level Content Intelligence.
// It composes existing PageDNA / ContentGraph / section / gap / quality data into
// a site-level understanding. It is NOT a new engine.
// Deterministic. NO AI. NO network. NO persistence.

import type {
  PageType,
  SearchIntent,
  AudienceProfile,
  Topic,
  Entity,
  SectionKind,
  SectionInfo,
  QualityScores,
  ContentGraph,
  MetadataSummary,
  WebsiteSnapshot,
} from "../types.js";

// ---------------------------------------------------------------------------
// Universal Page Model contract (consumed, never parsed)
// ---------------------------------------------------------------------------
// @forge/dom-engine is the canonical structural source. The site layer
// consumes the Universal Page Model shape below (sections, blocks, builder)
// instead of parsing HTML. A real @forge/dom-engine UniversalPage satisfies
// this contract structurally. When no Universal Page is available the site
// layer composes the existing PageDNA section inventory instead.

export interface UniversalPageLike {
  readonly url?: string;
  readonly title?: string;
  readonly builder?: { readonly builderType?: string; readonly confidence?: number };
  readonly regions: readonly {
    readonly kind?: string;
    readonly sections: readonly {
      readonly kind?: string;
      readonly blocks?: readonly unknown[];
      readonly metadata?: Record<string, unknown>;
    }[];
  }[];
}

// ---------------------------------------------------------------------------
// Knowledge / Memory context (structural, provider-independent)
// ---------------------------------------------------------------------------
// These mirror the public shapes of @forge/knowledge-engine and
// @forge/memory-engine. Site Content Intelligence consumes them but never
// imports those packages — Content Intelligence stays dependency-light and
// provider-independent.

export interface SiteAnalysisKnowledge {
  readonly brand?: string;
  readonly industry?: string;
  readonly products?: string[];
  readonly services?: string[];
  readonly competitors?: string[];
  readonly contentCategories?: string[];
  readonly primaryKeywords?: string[];
  readonly secondaryKeywords?: string[];
  readonly websiteStructure?: string[];
}

export interface SiteAnalysisMemory {
  readonly lastAnalysisAt?: string;
  readonly previousAnalysisCount?: number;
  readonly recentEvents?: readonly {
    readonly type?: string;
    readonly timestamp?: string;
    readonly payload?: Record<string, unknown>;
  }[];
}

// ---------------------------------------------------------------------------
// Site Page Entry — one page composed from PageDNA + ContentGraph + UPM
// ---------------------------------------------------------------------------

export interface SitePageEntry {
  readonly url: string;
  readonly title: string;
  readonly pageType: PageType;
  readonly intent: SearchIntent;
  readonly audience: AudienceProfile;
  readonly contentLength: number;
  readonly topics: Topic[];
  readonly entities: Entity[];
  /** Present sections (from PageDNA section inventory). */
  readonly sections: SectionInfo[];
  /** Sections the page is missing. */
  readonly missingSections: SectionKind[];
  /** Normalized internal page links (absolute URLs, deduped). */
  readonly internalLinks: string[];
  readonly externalLinkCount: number;
  readonly quality: QualityScores;
  readonly metadata: MetadataSummary;
  readonly graph: ContentGraph;
  /** Freshness signal — when this page was last analyzed. */
  readonly analyzedAt: string;
  /** Builder type from the Universal Page Model, when available. */
  readonly builder?: string;
  /** Block count from the Universal Page Model, when available. */
  readonly blockCount?: number;
}

// ---------------------------------------------------------------------------
// Site Content Model
// ---------------------------------------------------------------------------

export interface SiteSectionCoverage {
  present: number;
  missing: number;
  pages: string[];
}

export interface SiteQualitySummary {
  readonly average: number;
  readonly min: number;
  readonly max: number;
  readonly byPage: Record<string, number>;
}

export interface SiteFreshnessSummary {
  readonly oldestAnalyzedAt: string;
  readonly newestAnalyzedAt: string;
  readonly byPage: Record<string, string>;
}

export interface SiteSemanticCoverage {
  readonly coveredTopics: number;
  readonly coveredEntities: number;
  readonly distinctSections: number;
}

export interface SiteContentModel {
  readonly baseUrl: string;
  readonly pages: SitePageEntry[];
  readonly pageCount: number;
  readonly pageTypes: Record<string, number>;
  /** Aggregated topics across all pages (occurrence-weighted, sorted). */
  readonly topics: Topic[];
  /** Aggregated entities across all pages (occurrence-weighted, sorted). */
  readonly entities: Entity[];
  /** Section coverage keyed by SectionKind. */
  readonly sections: Record<string, SiteSectionCoverage>;
  /** Page → pages it links to (only pages present in the model). */
  readonly pageToPageLinks: Record<string, string[]>;
  /** Page → number of in-site pages linking to it. */
  readonly inboundLinks: Record<string, number>;
  readonly pageLookup: Record<string, SitePageEntry>;
  readonly qualitySummary: SiteQualitySummary;
  readonly freshness: SiteFreshnessSummary;
  readonly semanticCoverage: SiteSemanticCoverage;
}

// ---------------------------------------------------------------------------
// Topic Graph
// ---------------------------------------------------------------------------

export type TopicRelationshipKind =
  | "related"
  | "supporting"
  | "parent"
  | "child"
  | "associated-entity";

export interface TopicEdge {
  readonly term: string;
  readonly strength: number;
}

export interface SiteTopic {
  readonly term: string;
  readonly weight: number;
  readonly occurrences: number;
  readonly pageCount: number;
  readonly pages: string[];
  readonly relatedTopics: TopicEdge[];
  readonly supportingTopics: TopicEdge[];
  readonly parentTopic?: string;
  readonly childTopics: string[];
  readonly associatedEntities: string[];
  /** Deterministic heuristic confidence (0-1). Not semantic AI confidence. */
  readonly confidence: number;
  /** How this topic and its relationships were derived. */
  readonly method: string[];
}

export interface TopicGraphEdge {
  readonly source: string;
  readonly target: string;
  readonly kind: TopicRelationshipKind;
  readonly strength: number;
}

export interface TopicGraph {
  readonly topics: SiteTopic[];
  readonly topicCount: number;
  readonly byTerm: Record<string, SiteTopic>;
  readonly edges: TopicGraphEdge[];
}

// ---------------------------------------------------------------------------
// Topic Clusters
// ---------------------------------------------------------------------------

export interface TopicCluster {
  readonly id: string;
  readonly primaryTopic: string;
  readonly relatedTopics: string[];
  readonly pages: string[];
  readonly supportingPages: string[];
  readonly pillarPage?: string;
  readonly missingCoverage: string[];
  /** Forge diagnostic coverage score (0-100). Heuristic, not semantic AI. */
  readonly coverageScore: number;
  readonly confidence: number;
  readonly method: string[];
}

// ---------------------------------------------------------------------------
// Site Authority / Coverage (Forge diagnostic scores only)
// ---------------------------------------------------------------------------

export type SiteAuthorityDimension =
  | "topical-coverage"
  | "semantic-depth"
  | "supporting-content"
  | "internal-linking"
  | "entity-coverage"
  | "content-completeness"
  | "freshness";

export interface SiteAuthorityScores {
  readonly topicalCoverage: number;
  readonly semanticDepth: number;
  readonly supportingContent: number;
  readonly internalLinking: number;
  readonly entityCoverage: number;
  readonly contentCompleteness: number;
  readonly freshness: number;
  readonly overall: number;
  /**
   * These are Forge diagnostic scores only. They do NOT represent
   * Google rankings or Google's actual internal scoring.
   */
  readonly diagnostic: true;
  /** One-line explanation of how each dimension was computed. */
  readonly basis: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Content Opportunities (extends existing gap detection)
// ---------------------------------------------------------------------------

export type SiteOpportunityKind =
  | "missing-supporting-content"
  | "missing-pillar-coverage"
  | "weak-topic-coverage"
  | "missing-faq"
  | "missing-comparison"
  | "missing-buying-guide"
  | "missing-use-case"
  | "missing-glossary"
  | "outdated-page"
  | "thin-page"
  | "weakly-connected-page";

/** Reference to the underlying PageDNA / quality / section finding. */
export interface OpportunityReference {
  readonly pageUrl: string;
  readonly field: string;
  readonly value: unknown;
}

export interface SiteOpportunity {
  readonly id: string;
  readonly kind: SiteOpportunityKind;
  readonly title: string;
  readonly description: string;
  readonly priority: "low" | "medium" | "high";
  readonly evidence: string[];
  readonly relatedPages: string[];
  readonly references: OpportunityReference[];
  readonly estimatedImpact: string;
}

// ---------------------------------------------------------------------------
// Internal Link Opportunities (output only — no link modification)
// ---------------------------------------------------------------------------

export type InternalLinkOpportunityKind =
  | "orphan-page"
  | "weakly-connected-page"
  | "missing-contextual-link"
  | "missing-hub-to-supporting-link"
  | "missing-supporting-to-pillar-link"
  | "relevant-cross-cluster-link";

export interface InternalLinkOpportunity {
  readonly id: string;
  readonly kind: InternalLinkOpportunityKind;
  /** The page where a link should be added (when applicable). */
  readonly sourcePage?: string;
  /** The page that should be linked to (when applicable). */
  readonly targetPage?: string;
  readonly description: string;
  readonly evidence: string[];
  readonly priority: "low" | "medium" | "high";
}

// ---------------------------------------------------------------------------
// Content Refresh Detection
// ---------------------------------------------------------------------------

export type RefreshReasonKind =
  | "outdated-content"
  | "weak-content-depth"
  | "missing-entities"
  | "missing-sections"
  | "poor-internal-linking"
  | "low-quality-dimensions"
  | "stale-metadata"
  | "weak-topical-coverage";

export interface RefreshCandidate {
  readonly pageUrl: string;
  readonly reasons: RefreshReasonKind[];
  readonly affectedDimensions: string[];
  readonly priority: "low" | "medium" | "high";
  readonly estimatedImpact: string;
  readonly evidence: string[];
}

// ---------------------------------------------------------------------------
// Report / Options
// ---------------------------------------------------------------------------

export interface SiteIntelligenceSummary {
  readonly pageCount: number;
  readonly topicCount: number;
  readonly clusterCount: number;
  readonly opportunityCount: number;
  readonly internalLinkOpportunityCount: number;
  readonly refreshCandidateCount: number;
  readonly highPriorityOpportunities: number;
}

export interface SiteIntelligenceContext {
  readonly structureSource: "universal-page-model" | "page-dna-detectors";
  readonly knowledgeApplied: boolean;
  readonly memoryApplied: boolean;
  readonly pageLevelEngine: "page-dna";
}

export interface SiteIntelligenceReport {
  readonly analyzedAt: string;
  readonly baseUrl: string;
  readonly model: SiteContentModel;
  readonly topicGraph: TopicGraph;
  readonly clusters: TopicCluster[];
  readonly authority: SiteAuthorityScores;
  readonly opportunities: SiteOpportunity[];
  readonly internalLinkOpportunities: InternalLinkOpportunity[];
  readonly refreshCandidates: RefreshCandidate[];
  readonly summary: SiteIntelligenceSummary;
  readonly context: SiteIntelligenceContext;
}

export interface SiteAnalysisOptions {
  readonly baseUrl?: string;
  /** Optional Universal Page Model data (from @forge/dom-engine), one per page. */
  readonly universalPages?: UniversalPageLike[];
  /** Timestamp of this analysis run (drives freshness scoring). */
  readonly analyzedAt?: string;
  /** Freshness window in days for authority scoring. Default 180. */
  readonly freshnessWindowDays?: number;
  /** Window in days after which content is considered outdated. Default 180. */
  readonly outdatedWindowDays?: number;
  /** Knowledge context consumed from the existing knowledge-engine. */
  readonly knowledge?: SiteAnalysisKnowledge;
  /** Memory context consumed from the existing memory-engine. */
  readonly memory?: SiteAnalysisMemory;
  /** Minimum aggregated occurrences for a topic to enter the topic graph. */
  readonly minTopicOccurrences?: number;
  /** Maximum number of clusters to build. */
  readonly maxClusters?: number;
}

/** One page input to the site analyzer. */
export interface SitePageInput {
  readonly snapshot: WebsiteSnapshot;
  /** Optional Universal Page Model structural data (from @forge/dom-engine). */
  readonly universalPage?: UniversalPageLike;
}

// ---------------------------------------------------------------------------
// Memory event (recorded through the existing memory system)
// ---------------------------------------------------------------------------

export interface SiteAnalysisEvent {
  readonly id: string;
  readonly type: "site-analysis";
  readonly project: string;
  readonly timestamp: string;
  readonly payload: Record<string, unknown>;
}
