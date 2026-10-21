// @forge/content-generation
// Section-scoped AI content generation types.
// Consumes Content Intelligence outputs; never generates whole pages.

import type {
  PageDNA,
  SectionInfo,
  SearchIntent,
  AudienceProfile,
} from "@forge/content-intelligence";
import type {
  KnowledgeGraph,
  MemorySummaryLike,
  ProjectProfile,
} from "@forge/knowledge-engine";
import type { BrandProfile } from "@forge/core";
import type { MissionContext } from "@forge/mission-engine";
import type { ContentQualityEvaluation } from "./quality/types.js";

/**
 * Aggregated project context for generation.
 * Built from knowledge + memory engines; never hand-assembled ad hoc.
 */
export interface ProjectContext {
  readonly project: string;
  readonly profile: ProjectProfile;
  readonly knowledge: KnowledgeGraph;
  readonly memory: MemorySummaryLike;
  readonly recentOptimizations: string[];
  readonly brandVoice: string;
  readonly preferredTone: string;
  readonly competitors: string[];
  readonly targetAudience: string;
  readonly missionGoal: string;
}

/**
 * Context handed to the Prompt Builder to compose a registry-backed prompt.
 * Never built by manual string concatenation.
 */
export interface PromptContext {
  readonly pageDNA: PageDNA;
  readonly section: SectionInfo;
  readonly knowledge: KnowledgeGraph;
  readonly memory: MemorySummaryLike;
  readonly audience: AudienceProfile;
  readonly intent: SearchIntent;
  readonly tone: string;
  readonly brand: BrandProfile;
  readonly existingSection: string;
  readonly targetKeywords: string[];
  readonly missingTopics: string[];
  readonly missionContext?: MissionContext;
}

/**
 * Why a section was selected for generation.
 */
export interface GenerationReason {
  readonly code: string;
  readonly description: string;
  readonly evidence: string[];
}

/**
 * Confidence metadata for a generated section.
 */
export interface GenerationConfidence {
  readonly score: number;
  readonly basis: string;
}

/**
 * Warnings attached to a generated section.
 */
export interface GenerationWarnings {
  readonly keywordStuffing: boolean;
  readonly repeatedPhrases: boolean;
  readonly unsafePlaceholders: boolean;
  readonly lengthOutOfBounds: boolean;
  readonly malformedMarkup: boolean;
  readonly brokenLinks: boolean;
  readonly messages: string[];
}

/**
 * A single generated section candidate.
 */
export interface GeneratedSection {
  readonly sectionId: string;
  readonly sectionKind: string;
  readonly currentSection: string;
  readonly generatedSection: string;
  readonly reason: GenerationReason;
  readonly expectedSeoImpact: string;
  readonly confidence: GenerationConfidence;
  readonly warnings: GenerationWarnings;
  readonly estimatedTokenCost: number;
  /** Deterministic usefulness/accuracy evaluation (Sprint 29). */
  readonly quality?: ContentQualityEvaluation;
}

/**
 * Validation report for a generated section.
 */
export interface ValidationReport {
  readonly valid: boolean;
  readonly errors: string[];
  readonly warnings: string[];
}

/**
 * Content validation report used by GeneratedContent.
 */
export type ContentValidationReport = ValidationReport;

/**
 * A single generated content artifact from an AI writer.
 */
export interface GeneratedContent {
  readonly sectionType: string;
  readonly markdown: string;
  readonly html: string;
  readonly plainText: string;
  readonly title: string;
  readonly summary: string;
  readonly confidence: number;
  readonly seoScore: number;
  readonly eeatScore: number;
  readonly readabilityScore: number;
  readonly naturalnessScore: number;
  readonly brandVoiceScore: number;
  readonly overallScore: number;
  readonly validation: ContentValidationReport;
}

/**
 * A request to generate content for one or more sections.
 */
export interface ContentGenerationRequest {
  readonly project: string;
  readonly pageDNA: PageDNA;
  readonly sections: SectionInfo[];
  readonly projectContext: ProjectContext;
  readonly brand: BrandProfile;
  readonly targetKeyword: string;
  readonly intent: SearchIntent;
  readonly audience: AudienceProfile;
  readonly missionContext?: MissionContext;
  readonly provider?: string;
  readonly model?: string;
}

/**
 * The full result of a generation run.
 */
export interface ContentGenerationResult {
  readonly request: ContentGenerationRequest;
  readonly generated: GeneratedSection[];
  readonly patches: import("./patch/types.js").ContentPatch[];
  readonly diffs: import("./diff/types.js").SectionDiff[];
  readonly validation: ValidationReport;
  readonly generatedAt: string;
  readonly provider: string;
  readonly model?: string;
}
