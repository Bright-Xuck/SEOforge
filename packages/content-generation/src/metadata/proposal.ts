// @forge/content-generation
// Deterministic SEO metadata proposals.
//
// Metadata is not a separate engine: a proposal becomes one ContentPatch per
// field, so it flows through the exact same review → compose → execute →
// verify → rollback path as rich-text patches. The target names a whitelisted
// Rank Math meta key and is resolved by the WordPress provider at execution.

import type { BrandProfile } from "@forge/core";
import type { ContentPatch } from "../patch/types.js";
import { buildSectionDiff } from "../diff/builder.js";

export const RANK_MATH_TITLE = "rank_math_title";
export const RANK_MATH_DESCRIPTION = "rank_math_description";
export const RANK_MATH_FOCUS_KEYWORD = "rank_math_focus_keyword";

export const METADATA_FIELD_KEYS = {
  title: RANK_MATH_TITLE,
  description: RANK_MATH_DESCRIPTION,
  focusKeyword: RANK_MATH_FOCUS_KEYWORD,
} as const;

export type MetadataField = keyof typeof METADATA_FIELD_KEYS;

export interface MetadataProposalInput {
  readonly project: string;
  readonly pageId: number;
  readonly pageUrl: string;
  /** Visible page heading / title, used as the base for the SEO title. */
  readonly pageTitle: string;
  /** Current SEO title (Rank Math), if any. */
  readonly currentTitle?: string;
  /** Current meta description (Rank Math), if any. */
  readonly currentDescription?: string;
  readonly primaryKeyword: string;
  readonly secondaryKeywords?: string[];
  readonly brand: BrandProfile;
  readonly intent?: string;
  readonly audience?: string;
  readonly maxTitleLength?: number;
  readonly maxDescriptionLength?: number;
}

export interface MetadataProposal {
  readonly id: string;
  readonly project: string;
  readonly pageId: number;
  readonly pageUrl: string;
  readonly title: string;
  readonly description: string;
  readonly focusKeyword: string;
  readonly source: "deterministic" | "ai";
  readonly confidence: number;
  readonly rationale: string[];
}

const DEFAULT_TITLE_MAX = 60;
const DEFAULT_DESCRIPTION_MAX = 155;

/**
 * Build a conservative, fact-only metadata proposal from brand and page data.
 * No invented prices, certifications, or claims: every string is derived from
 * the page title, the brand profile, or the configured keyword set.
 */
export function buildMetadataProposal(input: MetadataProposalInput): MetadataProposal {
  const titleMax = input.maxTitleLength ?? DEFAULT_TITLE_MAX;
  const descriptionMax = input.maxDescriptionLength ?? DEFAULT_DESCRIPTION_MAX;
  const rationale: string[] = [];

  const title = buildTitle(input, titleMax, rationale);
  const description = buildDescription(input, descriptionMax, rationale);
  const focusKeyword = input.primaryKeyword.trim();

  const warnings: string[] = [];
  if (focusKeyword && !title.toLowerCase().includes(focusKeyword.toLowerCase())) {
    warnings.push("focus keyword is not present in the proposed title");
  }
  if (focusKeyword && !description.toLowerCase().includes(focusKeyword.toLowerCase())) {
    warnings.push("focus keyword is not present in the proposed description");
  }
  rationale.push(...warnings.map((warning) => `Warning: ${warning}`));

  const confidence = Math.max(
    0.4,
    Math.min(0.95, 0.85 - warnings.length * 0.1 + (focusKeyword ? 0.05 : 0)),
  );

  return {
    id: `metadata-${input.pageId}-${Date.now()}`,
    project: input.project,
    pageId: input.pageId,
    pageUrl: input.pageUrl,
    title,
    description,
    focusKeyword,
    source: "deterministic",
    confidence: Number(confidence.toFixed(2)),
    rationale,
  };
}

/**
 * Translate a proposal into reviewable patches. Unchanged fields are skipped so
 * a run never produces a no-op write.
 */
export function metadataProposalToPatches(
  proposal: MetadataProposal,
  current: { readonly title?: string; readonly description?: string },
): ContentPatch[] {
  const patches: ContentPatch[] = [];
  const createdAt = new Date().toISOString();

  const fields: Array<{ field: MetadataField; value: string; existing?: string }> = [
    { field: "title", value: proposal.title, existing: current.title },
    { field: "description", value: proposal.description, existing: current.description },
  ];

  for (const entry of fields) {
    const before = (entry.existing ?? "").trim();
    const after = entry.value.trim();
    if (!after || before === after) continue;

    const sectionId = `metadata-${entry.field}`;
    patches.push({
      id: `patch-${sectionId}-${patches.length + 1}`,
      sectionId,
      operation: "replace",
      selector: `rank-math:${entry.field}`,
      currentContent: before,
      proposedContent: after,
      diff: buildSectionDiff(sectionId, before, after),
      validation: { valid: true, errors: [], warnings: [] },
      confidence: proposal.confidence,
      estimatedImpact:
        entry.field === "title"
          ? "Improves search-result relevance and click-through"
          : "Improves search-result snippet clarity and click-through",
      warnings: [],
      generatedBy: "metadata-proposal",
      provider: proposal.source,
      promptVersion: "metadata-v1",
      createdAt,
      target: {
        format: "rank-math",
        pageId: proposal.pageId,
        field: METADATA_FIELD_KEYS[entry.field],
        label: entry.field,
      },
    });
  }

  return patches;
}

function buildTitle(input: MetadataProposalInput, max: number, rationale: string[]): string {
  const base = (input.currentTitle?.trim() || input.pageTitle.trim()).replace(/\s+/g, " ");
  const brand = input.brand.companyName.trim();
  const keyword = input.primaryKeyword.trim();
  let title = base;

  if (keyword && !containsKeyword(title, keyword)) {
    title = `${titleCase(keyword)}: ${title}`;
    rationale.push(`Added focus keyword "${keyword}" to the SEO title`);
  }

  if (brand && !title.toLowerCase().includes(brand.toLowerCase())) {
    const withBrand = `${title} | ${brand}`;
    if (withBrand.length <= max) {
      title = withBrand;
      rationale.push(`Appended brand "${brand}" to the SEO title`);
    } else {
      rationale.push(`Brand omitted from title to stay within ${max} characters`);
    }
  }

  if (title.length > max) {
    const truncated = truncateAtWord(title, max);
    if (truncated !== title) rationale.push(`Title truncated to ${max} characters`);
    title = truncated;
  }

  return title;
}

function buildDescription(input: MetadataProposalInput, max: number, rationale: string[]): string {
  const existing = input.currentDescription?.trim();
  const audience = (input.audience ?? input.brand.audiences[0] ?? "teams").trim();
  const offer = [...input.brand.products, ...input.brand.services].filter(Boolean)[0] ?? input.brand.industry;
  const keyword = input.primaryKeyword.trim();
  const base = existing && existing.length > 0 ? existing : input.pageTitle.trim();

  let description = base;
  if (!description) {
    description = `${input.brand.companyName} helps ${audience} with ${offer}.`;
    rationale.push("Generated description from brand profile and audience");
  }

  if (keyword && !containsKeyword(description, keyword)) {
    description = `${titleCase(keyword)}: ${description}`;
    rationale.push(`Added focus keyword "${keyword}" to the meta description`);
  }

  if (!/[.!?]$/.test(description)) description = `${description}.`;
  if (!containsKeyword(description, input.brand.companyName)) {
    const brandSentence = ` ${input.brand.companyName}.`;
    if (description.length + brandSentence.length <= max) {
      description = `${description.replace(/[.!?]$/, "")}.${brandSentence}`;
      rationale.push("Appended brand name to the meta description");
    }
  }

  if (description.length > max) {
    const truncated = truncateAtWord(description, max);
    if (truncated !== description) rationale.push(`Description truncated to ${max} characters`);
    description = truncated;
  }

  return description;
}

function containsKeyword(text: string, keyword: string): boolean {
  if (!keyword) return true;
  return text.toLowerCase().includes(keyword.toLowerCase());
}

function titleCase(value: string): string {
  return value.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function truncateAtWord(value: string, max: number): string {
  if (value.length <= max) return value;
  const slice = value.slice(0, max - 1);
  const cut = slice.lastIndexOf(" ");
  const base = (cut > max * 0.6 ? slice.slice(0, cut) : slice).replace(/[\s,;:.-]+$/, "");
  return `${base}…`;
}
