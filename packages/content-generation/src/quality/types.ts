// @forge/content-generation
// Deterministic content-quality contracts.
// No AI, no providers, no network.

import type { BrandProfile } from "@forge/core";
import type { AudienceProfile } from "@forge/content-intelligence";

export type ContentQualityStatus = "pass" | "warn" | "fail";

export interface ContentQualityCheck {
  readonly id: "accuracy" | "usefulness" | "audience" | "keyword" | "readability" | "brand";
  readonly label: string;
  readonly status: ContentQualityStatus;
  readonly detail: string;
}

export interface ContentQualityMetrics {
  readonly wordCount: number;
  readonly genericPhraseCount: number;
  readonly specificSignalCount: number;
  readonly ungroundedClaims: readonly string[];
  readonly unverifiedClaimPhrases: readonly string[];
  readonly keywordOccurrences: number;
  readonly keywordDensity: number;
  readonly fleschKincaidGrade: number;
  readonly avgSentenceLength: number;
}

/**
 * Deterministic evaluation of whether generated copy is useful and accurate,
 * not merely structurally valid. Errors are reserved for claims that cannot be
 * grounded in supplied source/brand evidence; softer quality problems become
 * warnings so the review policy forces manual review instead of silently
 * applying generic copy.
 */
export interface ContentQualityEvaluation {
  readonly score: number;
  readonly useful: boolean;
  readonly accurate: boolean;
  readonly checks: ContentQualityCheck[];
  readonly warnings: string[];
  readonly errors: string[];
  readonly metrics: ContentQualityMetrics;
}

export interface ContentQualityInput {
  /** Candidate AI output (plain text or HTML). */
  readonly content: string;
  /** Existing section text / page evidence used as grounding. */
  readonly existingContent: string;
  readonly sectionKind: string;
  readonly targetKeyword: string;
  readonly brand: BrandProfile;
  readonly audience: AudienceProfile;
  /** Additional grounding strings (page topics, entities, brief evidence). */
  readonly grounding?: readonly string[];
}
