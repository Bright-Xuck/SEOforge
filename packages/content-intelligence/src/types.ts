// @forge/content-intelligence
// Domain models for deterministic content understanding.
// NO AI. NO text generation.

import type { WebsiteSnapshot } from "@forge/core";

export type { WebsiteSnapshot } from "@forge/core";

/**
 * Input to the Content Intelligence engine.
 * Wraps a WebsiteSnapshot plus optional pre-parsed DOM context.
 */
export interface ContentIntelligenceInput {
  readonly snapshot: WebsiteSnapshot;
  /** Base URL used to resolve relative links during analysis. */
  readonly baseUrl: string;
  /** Optional pre-parsed HTML (avoids re-parsing rawHtml). */
  readonly parsedHtml?: ParsedHtmlLike;
}

/**
 * Minimal structural shape of the html-parser ParsedHtml result.
 * Used so the engine can accept either a WebsiteSnapshot or a parsed document.
 */
export interface ParsedHtmlLike {
  readonly headings: ReadonlyArray<{ readonly level: 1 | 2 | 3 | 4 | 5 | 6; readonly text: string }>;
  readonly links: ReadonlyArray<{ readonly href: string; readonly text: string; readonly isInternal: boolean }>;
  readonly images: ReadonlyArray<{ readonly src: string; readonly alt: string }>;
  readonly jsonLd: ReadonlyArray<Record<string, unknown>>;
}

// ---------------------------------------------------------------------------
// Page Type (PART 2 / PART 5)
// ---------------------------------------------------------------------------

export type PageTypeKind =
  | "homepage"
  | "landing-page"
  | "product-page"
  | "category-page"
  | "blog"
  | "documentation"
  | "service-page"
  | "about-page"
  | "contact-page"
  | "legal-page"
  | "archive"
  | "search-results"
  | "generic";

export interface PageType {
  readonly kind: PageTypeKind;
  readonly confidence: number;
  readonly evidence: string[];
}

// ---------------------------------------------------------------------------
// Search Intent (PART 2 / PART 6)
// ---------------------------------------------------------------------------

export type SearchIntentKind =
  | "informational"
  | "commercial"
  | "transactional"
  | "navigational"
  | "local"
  | "mixed";

export interface SearchIntent {
  readonly primary: SearchIntentKind;
  readonly scores: Record<SearchIntentKind, number>;
  readonly evidence: string[];
}

// ---------------------------------------------------------------------------
// Audience Profile (PART 2 / PART 6)
// ---------------------------------------------------------------------------

export type AudienceLevel = "beginner" | "intermediate" | "expert" | "enterprise" | "general";

export interface AudienceProfile {
  readonly level: AudienceLevel;
  readonly confidence: number;
  readonly signals: string[];
}

// ---------------------------------------------------------------------------
// Sections (PART 2 / PART 4)
// ---------------------------------------------------------------------------

export type SectionKind =
  | "hero"
  | "benefits"
  | "features"
  | "services"
  | "products"
  | "testimonials"
  | "faq"
  | "comparison"
  | "buying-guide"
  | "pricing"
  | "cta"
  | "contact"
  | "footer"
  | "navigation"
  | "related-content";

export interface SectionInfo {
  readonly kind: SectionKind;
  readonly present: boolean;
  readonly confidence: number;
  readonly evidence: string[];
  /** Stable section ID (e.g. `hero`, `faq-1`). */
  readonly id: string;
  /** Stable selector targeting this section in the DOM, when present. */
  readonly selector?: string;
  /** First graph node id belonging to this section (when present). */
  readonly startNode?: string;
  /** Last graph node id belonging to this section (when present). */
  readonly endNode?: string;
  /** All graph node ids contained within this section (when present). */
  readonly containedNodes: string[];
  /** Parent section id, if nested (when present). */
  readonly parentSection?: string;
  /** Child section ids, if any (when present). */
  readonly childSections: string[];
}

export interface SectionInventory {
  readonly sections: SectionInfo[];
  readonly present: SectionKind[];
  readonly missing: SectionKind[];
  /** Sections keyed by stable id. */
  readonly byId: Record<string, SectionInfo>;
}

// ---------------------------------------------------------------------------
// Entities (PART 2 / PART 7)
// ---------------------------------------------------------------------------

export type EntityKind =
  | "brand"
  | "product"
  | "category"
  | "person"
  | "location"
  | "organization"
  | "topic"
  | "repeated-concept";

export interface Entity {
  readonly kind: EntityKind;
  readonly value: string;
  readonly occurrences: number;
  readonly confidence: number;
  readonly evidence: string[];
}

// ---------------------------------------------------------------------------
// Topics (PART 7)
// ---------------------------------------------------------------------------

export interface Topic {
  readonly term: string;
  readonly weight: number;
  readonly occurrences: number;
}

// ---------------------------------------------------------------------------
// Summaries (PART 8)
// ---------------------------------------------------------------------------

export interface LinkSummary {
  readonly internal: number;
  readonly external: number;
  readonly total: number;
  readonly internalAnchors: string[];
  readonly externalAnchors: string[];
}

export interface MediaSummary {
  readonly images: number;
  readonly imagesWithAlt: number;
  readonly imagesWithoutAlt: number;
  readonly videos: number;
  readonly hasHeroImage: boolean;
}

export interface TrustIndicators {
  readonly hasTestimonials: boolean;
  readonly hasReviews: boolean;
  readonly hasCertifications: boolean;
  readonly hasSecurityBadges: boolean;
  readonly hasAboutPage: boolean;
  readonly hasContactInfo: boolean;
  readonly hasSocialProof: boolean;
  readonly score: number;
}

export interface SchemaSummary {
  readonly types: string[];
  readonly count: number;
  readonly hasOrganization: boolean;
  readonly hasProduct: boolean;
  readonly hasBreadcrumb: boolean;
  readonly hasFAQ: boolean;
}

export interface MetadataSummary {
  readonly hasTitle: boolean;
  readonly hasMetaDescription: boolean;
  readonly hasCanonical: boolean;
  readonly hasOpenGraph: boolean;
  readonly hasTwitterCard: boolean;
  readonly hasJsonLd: boolean;
  readonly hasLang: boolean;
}

export interface HeadingDistribution {
  readonly h1: number;
  readonly h2: number;
  readonly h3: number;
  readonly h4: number;
  readonly h5: number;
  readonly h6: number;
  readonly total: number;
}

// ---------------------------------------------------------------------------
// Quality Scores (PART 2 / PART 9)
// ---------------------------------------------------------------------------

export interface ReadabilityScore {
  readonly score: number;
  readonly readingLevel: string;
  readonly fleschReadingEase: number;
  readonly avgWordsPerSentence: number;
  readonly reasoning: string;
}

export interface HeadingQualityScore {
  readonly score: number;
  readonly hasSingleH1: boolean;
  readonly hierarchyValid: boolean;
  readonly reasoning: string;
}

export interface ContentDepthScore {
  readonly score: number;
  readonly wordCount: number;
  readonly paragraphCount: number;
  readonly reasoning: string;
}

export interface TopicCoverageScore {
  readonly score: number;
  readonly topicCount: number;
  readonly reasoning: string;
}

export interface TrustScore {
  readonly score: number;
  readonly indicators: string[];
  readonly reasoning: string;
}

export interface CtaScore {
  readonly score: number;
  readonly ctaCount: number;
  readonly hasPrimaryCta: boolean;
  readonly reasoning: string;
}

export interface InternalLinkingScore {
  readonly score: number;
  readonly internalLinks: number;
  readonly reasoning: string;
}

export interface SemanticCoverageScore {
  readonly score: number;
  readonly coveredConcepts: number;
  readonly reasoning: string;
}

export interface QualityScores {
  readonly readability: ReadabilityScore;
  readonly headingQuality: HeadingQualityScore;
  readonly contentDepth: ContentDepthScore;
  readonly topicCoverage: TopicCoverageScore;
  readonly trustSignals: TrustScore;
  readonly ctaQuality: CtaScore;
  readonly internalLinking: InternalLinkingScore;
  readonly semanticCoverage: SemanticCoverageScore;
  readonly overall: number;
}

// ---------------------------------------------------------------------------
// Content Score (PART 2 reconciliation)
// ---------------------------------------------------------------------------

export interface ContentScore {
  readonly overall: number;
  readonly depth: number;
  readonly clarity: number;
  readonly structure: number;
  readonly reasoning: string;
}

// ---------------------------------------------------------------------------
// Entity / Semantic Coverage (PART 2 reconciliation)
// ---------------------------------------------------------------------------

export interface EntityCoverage {
  readonly expected: EntityKind[];
  readonly found: EntityKind[];
  readonly missing: EntityKind[];
  readonly coverageRatio: number;
}

// ---------------------------------------------------------------------------
// Content Gap (PART 2 / PART 10)
// ---------------------------------------------------------------------------

export type ContentGapKind =
  | "missing-faq"
  | "weak-cta"
  | "thin-sections"
  | "missing-trust"
  | "missing-comparison"
  | "missing-buying-guide"
  | "weak-introduction"
  | "weak-conclusion"
  | "sparse-internal-links"
  | "missing-supporting-content";

export interface ContentGap {
  readonly kind: ContentGapKind;
  readonly severity: "low" | "medium" | "high";
  readonly title: string;
  readonly description: string;
  readonly evidence: string[];
  readonly recommendation: string;
}

// ---------------------------------------------------------------------------
// Content Recommendation (PART 2)
// ---------------------------------------------------------------------------

export interface ContentRecommendation {
  readonly id: string;
  readonly kind: ContentGapKind;
  readonly title: string;
  readonly description: string;
  readonly priority: "low" | "medium" | "high";
  readonly evidence: string[];
}

// ---------------------------------------------------------------------------
// Content Graph (PART 2 / PART 3)
// ---------------------------------------------------------------------------

export type GraphNodeType = "page" | "section" | "block" | "paragraph" | "sentence";

export interface GraphRelationship {
  readonly type: "contains" | "precedes" | "references";
  readonly targetId: string;
}

export interface GraphNode {
  readonly id: string;
  readonly type: GraphNodeType;
  readonly content: string;
  readonly position: number;
  readonly relationships: GraphRelationship[];
  readonly metadata: Record<string, unknown>;
}

export interface ContentGraph {
  readonly pageId: string;
  readonly nodes: GraphNode[];
  readonly nodeCount: number;
  readonly byType: Record<GraphNodeType, number>;
}

// ---------------------------------------------------------------------------
// Page DNA (PART 2 / PART 8)
// ---------------------------------------------------------------------------

export type PageDNAVersion = "1.0";

export interface PageDNAWarning {
  readonly code: string;
  readonly message: string;
}

export interface PageDNA {
  readonly schemaVersion: string;
  readonly dnaVersion: PageDNAVersion;
  readonly generatorVersion: string;
  readonly url: string;
  readonly analyzedAt: string;
  readonly pageType: PageType;
  readonly intent: SearchIntent;
  readonly audience: AudienceProfile;
  readonly contentLength: number;
  readonly headingDistribution: HeadingDistribution;
  readonly readingLevel: string;
  readonly sectionInventory: SectionInventory;
  readonly entities: Entity[];
  readonly topics: Topic[];
  readonly links: LinkSummary;
  readonly media: MediaSummary;
  readonly trust: TrustIndicators;
  readonly schema: SchemaSummary;
  readonly metadata: MetadataSummary;
}

// ---------------------------------------------------------------------------
// Page Profile (PART 2 reconciliation)
// ---------------------------------------------------------------------------

export interface PageProfile {
  readonly url: string;
  readonly pageType: PageType;
  readonly intent: SearchIntent;
  readonly audience: AudienceProfile;
  readonly contentLength: number;
  readonly sectionInventory: SectionInventory;
  readonly entities: Entity[];
  readonly topics: Topic[];
}
