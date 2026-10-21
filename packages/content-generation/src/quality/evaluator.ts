// @forge/content-generation
// Deterministic usefulness / accuracy / audience / keyword / readability
// evaluation for generated section copy.
//
// This module intentionally composes the existing Sprint 20 readability
// validator instead of creating a second readability engine. It only owns the
// checks that had no implementation before: grounding of numeric/strong claims,
// concrete usefulness, audience fit, and keyword fit.

import type { BrandProfile } from "@forge/core";
import type { AudienceProfile } from "@forge/content-intelligence";
import { validateReadability } from "../validator/readability.js";
import type {
  ContentQualityCheck,
  ContentQualityEvaluation,
  ContentQualityInput,
  ContentQualityMetrics,
} from "./types.js";

const BODY_KINDS = new Set([
  "benefits",
  "features",
  "services",
  "products",
  "testimonials",
  "faq",
  "comparison",
  "buying-guide",
  "pricing",
  "related-content",
  "about",
  "introduction",
  "conclusion",
  "blog",
  "contact",
]);

const KEYWORD_REQUIRED_KINDS = new Set([...BODY_KINDS, "hero"]);

const GENERIC_PHRASES: readonly RegExp[] = [
  /in today's (?:fast-paced|digital|competitive|modern) world/gi,
  /take your (?:business|company|brand) to the next level/gi,
  /unlock the (?:full )?power/gi,
  /cutting[- ]edge/gi,
  /game[- ]chang(?:er|ers|ing)/gi,
  /revolutioni[sz]e/gi,
  /state[- ]of[- ]the[- ]art/gi,
  /one[- ]stop shop/gi,
  /best[- ]in[- ]class/gi,
  /seamless(?:ly)?/gi,
  /leverage/gi,
  /synerg(?:y|ies)/gi,
  /empower(?:ing|s|ed)?/gi,
  /elevate/gi,
  /transform your/gi,
  /whether you're a/gi,
  /look no further/gi,
  /the future of/gi,
  /designed to help/gi,
  /we understand that/gi,
  /world[- ]class/gi,
  /industry[- ]leading/gi,
  /robust/gi,
  /innovative/gi,
];

const SPECIFIC_SIGNAL_PATTERN =
  /\b(?:save|saves|saving|track|tracks|tracking|automat(?:e|es|ed|ion|ing)|integrat(?:e|es|ed|ion|ing)|invoice|invoices|invoicing|expense|expenses|payroll|tax|taxes|report|reports|reporting|dashboard|dashboards|reconcil(?:e|es|ed|iation|ing)|bank|banks|banking|receipt|receipts|complian(?:ce|t)|inventory|forecast|forecasting|budget|budgets|budgeting|audit|audits|auditing|onboard(?:ing)?|migrat(?:e|es|ed|ion|ing)|import|imports|export|exports|sync|syncs|synced|syncing|api|template|templates|reminder|reminders|alert|alerts|permission|permissions|role|roles|backup|backups|security|encrypt(?:ed|ion)?|uptime|sla|workflow|workflows|customiz(?:e|es|ed|ation|ing)|real[- ]time|bookkeep(?:ing)?|accounting|cash flow|receivable|payable|multi[- ]currency|vat|gst|1099|w-2|approval|approvals|collaborat(?:e|ion|ing)|billing|pricing|quote|quotes|estimate|estimates)\b/gi;

const CLAIM_PHRASE_PATTERNS: readonly RegExp[] = [
  /\b(?:award[- ]winning|certified|guaranteed?|money[- ]back|#1|number one|industry[- ]leading|world[- ]class|best[- ]in[- ]class)\b/gi,
];

const CTA_ACTION_PATTERN =
  /\b(?:start|try|get|book|request|download|contact|buy|subscribe|schedule|see|compare|talk|call|sign up|create|open|view|explore|discover|unlock|claim|join|reserve|install)\b/i;

const NUMBER_PATTERN =
  /(?<![\w])(?:[$€£]\s?)?(\d[\d,]*(?:\.\d+)?)(\s?\+)?(?:\s?(%|percent|k|m|bn|billion|million|thousand|customers?|clients?|users?|teams?|businesses?|companies|countries|languages?|years?|days?|hours?|minutes?|reviews?|stars?|awards?|integrations?))?/gi;

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "that",
  "this",
  "your",
  "you",
  "our",
  "are",
  "who",
  "what",
  "when",
  "where",
  "how",
  "general",
]);

/**
 * Evaluate generated section copy against source/brand grounding.
 * Pure and deterministic.
 */
export function evaluateContentQuality(input: ContentQualityInput): ContentQualityEvaluation {
  const text = stripMarkup(input.content);
  const lower = normalizeText(text);
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const sectionKind = input.sectionKind.toLowerCase();
  const isBody = BODY_KINDS.has(sectionKind);
  const isCta = sectionKind === "cta";
  const brand = input.brand as Partial<BrandProfile>;
  const audience = input.audience as Partial<AudienceProfile>;

  const warnings: string[] = [];
  const errors: string[] = [];

  const groundingParts = [
    input.existingContent,
    ...(input.grounding ?? []),
    brand.companyName,
    brand.industry,
    brand.subIndustry,
    ...asStrings(brand.products),
    ...asStrings(brand.services),
    ...asStrings(brand.categories),
    ...asStrings(brand.primaryTopics),
    ...asStrings(brand.secondaryTopics),
    ...asStrings(brand.entities),
    ...asStrings(brand.audiences),
    ...asStrings(brand.buyerPersonas),
    ...asStrings(brand.goals),
    ...asStrings(brand.uniqueSellingPoints),
    ...asStrings(brand.trustSignals),
    ...asStrings(brand.preferredVocabulary),
  ]
    .filter((value): value is string => typeof value === "string" && value.trim() !== "")
    .join("\n");
  const groundingText = normalizeText(stripMarkup(groundingParts));
  const groundingNumbers = new Set(extractNumberTokens(groundingText));

  // ---------------------------------------------------------------- accuracy
  const generatedNumbers = extractNumericClaims(text);
  const ungroundedClaims = [...new Set(
    generatedNumbers
      .filter((claim) => !groundingNumbers.has(claim.digits))
      .map((claim) => claim.raw),
  )];
  const unverifiedClaimPhrases = findUnverifiedClaimPhrases(text, groundingText);

  for (const claim of ungroundedClaims) {
    errors.push(
      `Ungrounded numeric claim "${claim}": the number does not appear in the existing section or supplied brand/source evidence. Remove it or add source evidence.`,
    );
  }
  for (const phrase of unverifiedClaimPhrases) {
    warnings.push(
      `Unverified claim phrase "${phrase}": confirm it is supported by source or brand evidence before publishing.`,
    );
  }

  // -------------------------------------------------------------- usefulness
  const genericPhraseCount = countMatches(text, GENERIC_PHRASES);
  const specificSignals = uniqueMatches(text, SPECIFIC_SIGNAL_PATTERN);
  const specificSignalCount = specificSignals.length;
  const minWords = isCta ? 2 : isBody ? 20 : 4;
  const tooThin = !isCta && wordCount < minWords;
  const genericOutweighsSpecific = genericPhraseCount >= 2 && specificSignalCount <= genericPhraseCount;
  const ctaHasAction = !isCta || CTA_ACTION_PATTERN.test(text);
  const useful = isCta
    ? ctaHasAction
    : specificSignalCount > 0 && !genericOutweighsSpecific && !tooThin;

  if (isCta && !ctaHasAction) {
    warnings.push("Low usefulness: CTA has no concrete action verb.");
  }
  if (tooThin) {
    warnings.push(`Low usefulness: ${wordCount} word(s) is thin for a ${sectionKind} section (minimum ${minWords}).`);
  }
  if (!isCta && specificSignalCount === 0) {
    warnings.push(
      "Low usefulness: no concrete feature, action, outcome, or product detail was found. Replace generic marketing language with specific supported information.",
    );
  } else if (genericOutweighsSpecific) {
    warnings.push(
      `Generic marketing language outweighs concrete detail (${genericPhraseCount} generic phrase(s), ${specificSignalCount} specific signal(s)).`,
    );
  } else if (genericPhraseCount > 0) {
    warnings.push(
      `Generic phrasing detected (${genericPhraseCount} phrase(s)); verify that it adds useful information rather than filler.`,
    );
  }

  // ------------------------------------------------------------- audience fit
  const audienceTerms = uniqueStrings([
    ...asStrings(brand.audiences),
    ...asStrings(brand.buyerPersonas),
    ...asStrings(audience.signals),
  ]);
  let audienceWarning: string | undefined;
  if (!isCta && sectionKind !== "footer" && sectionKind !== "navigation" && audienceTerms.length > 0) {
    if (!matchesAnyTerm(lower, audienceTerms)) {
      audienceWarning = `Audience mismatch: copy does not address the known audience (${audienceTerms.slice(0, 4).join(", ")}).`;
      warnings.push(audienceWarning);
    }
  }

  // -------------------------------------------------------------- keyword fit
  const keyword = input.targetKeyword.trim();
  const lowerKeyword = normalizeText(keyword);
  const keywordWordCount = lowerKeyword.split(/\s+/).filter(Boolean).length;
  const keywordOccurrences =
    lowerKeyword === ""
      ? 0
      : (lower.match(new RegExp(`\\b${escapeRegExp(lowerKeyword)}\\b`, "g")) ?? []).length;
  const keywordDensity = wordCount > 0 ? (keywordOccurrences * keywordWordCount) / wordCount : 0;
  const keywordRequired = lowerKeyword !== "" && KEYWORD_REQUIRED_KINDS.has(sectionKind);
  let keywordWarning: string | undefined;
  if (keywordRequired && keywordOccurrences === 0) {
    keywordWarning = `Keyword mismatch: target keyword "${keyword}" is not present in this section.`;
    warnings.push(keywordWarning);
  }
  if (keywordRequired && wordCount >= 40 && (keywordDensity > 0.045 || keywordOccurrences > 4)) {
    keywordWarning = `Keyword density is high (${(keywordDensity * 100).toFixed(1)}%, ${keywordOccurrences} occurrence(s)); avoid stuffing.`;
    warnings.push(keywordWarning);
  }

  // ---------------------------------------------------------------- readability
  const readability =
    isBody && wordCount >= 40
      ? validateReadability(text)
      : { valid: true, issues: [] as string[], fleschKincaidGrade: 0, avgSentenceLength: 0 };
  const readabilityWarnings = readability.issues.map((issue) => `Readability: ${issue}.`);
  warnings.push(...readabilityWarnings);

  // --------------------------------------------------------------------- brand
  const forbiddenFound = uniqueStrings(asStrings(brand.forbiddenWords))
    .filter((term) => term && lower.includes(term.toLowerCase()));
  let brandWarning: string | undefined;
  if (forbiddenFound.length > 0) {
    brandWarning = `Brand language: prohibited term(s) found (${forbiddenFound.join(", ")}).`;
    warnings.push(brandWarning);
  }

  const uniqueWarnings = uniqueStrings(warnings);
  const uniqueErrors = uniqueStrings(errors);
  const accurate = uniqueErrors.length === 0;
  const checks: ContentQualityCheck[] = [
    {
      id: "accuracy",
      label: "Accuracy / grounding",
      status: !accurate ? "fail" : unverifiedClaimPhrases.length > 0 ? "warn" : "pass",
      detail: !accurate
        ? `${uniqueErrors.length} ungrounded numeric claim(s).`
        : unverifiedClaimPhrases.length > 0
          ? `${unverifiedClaimPhrases.length} unverified claim phrase(s).`
          : "No ungrounded numeric or strong claims detected.",
    },
    {
      id: "usefulness",
      label: "Usefulness / specificity",
      status: !useful ? "fail" : genericPhraseCount > 0 ? "warn" : "pass",
      detail: `${specificSignalCount} specific signal(s), ${genericPhraseCount} generic phrase(s), ${wordCount} word(s).`,
    },
    {
      id: "audience",
      label: "Audience fit",
      status: audienceWarning ? "warn" : "pass",
      detail: audienceWarning ?? (audienceTerms.length > 0 ? "Audience terms are represented." : "No audience terms supplied."),
    },
    {
      id: "keyword",
      label: "Keyword fit",
      status: keywordWarning ? "warn" : "pass",
      detail: keywordWarning ?? (keywordRequired ? `Keyword "${keyword}" is present.` : "Keyword not required for this section."),
    },
    {
      id: "readability",
      label: "Readability",
      status: readabilityWarnings.length > 0 ? "warn" : "pass",
      detail: readabilityWarnings.length > 0 ? readabilityWarnings.join(" ") : "Readable at the configured grade level.",
    },
    {
      id: "brand",
      label: "Brand language",
      status: brandWarning ? "warn" : "pass",
      detail: brandWarning ?? "No prohibited brand terms detected.",
    },
  ];

  let score = 100;
  if (!accurate) score -= 40;
  if (!useful) score -= 25;
  score -= uniqueWarnings.length * 4;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const metrics: ContentQualityMetrics = {
    wordCount,
    genericPhraseCount,
    specificSignalCount,
    ungroundedClaims,
    unverifiedClaimPhrases,
    keywordOccurrences,
    keywordDensity,
    fleschKincaidGrade: readability.fleschKincaidGrade,
    avgSentenceLength: readability.avgSentenceLength,
  };

  return {
    score,
    useful,
    accurate,
    checks,
    warnings: uniqueWarnings,
    errors: uniqueErrors,
    metrics,
  };
}

function stripMarkup(content: string): string {
  return content
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function asStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim() !== "");
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value.trim() !== ""))];
}

function countMatches(text: string, patterns: readonly RegExp[]): number {
  return patterns.reduce((count, pattern) => count + (text.match(pattern)?.length ?? 0), 0);
}

function uniqueMatches(text: string, pattern: RegExp): string[] {
  return [...new Set((text.match(pattern) ?? []).map((match) => match.toLowerCase()))];
}

function findUnverifiedClaimPhrases(text: string, groundingText: string): string[] {
  const found: string[] = [];
  for (const pattern of CLAIM_PHRASE_PATTERNS) {
    for (const match of text.match(pattern) ?? []) {
      const normalized = normalizeText(match);
      if (!groundingText.includes(normalized)) found.push(match);
    }
  }
  return uniqueStrings(found);
}

interface NumericClaim {
  readonly raw: string;
  readonly digits: string;
}

function extractNumberTokens(text: string): string[] {
  return extractNumericClaims(text, true).map((claim) => claim.digits);
}

function extractNumericClaims(text: string, includeAll = false): NumericClaim[] {
  const claims: NumericClaim[] = [];
  NUMBER_PATTERN.lastIndex = 0;
  for (const match of text.matchAll(NUMBER_PATTERN)) {
    const raw = (match[0] ?? "").trim();
    const digits = (match[1] ?? "").replace(/,/g, "");
    if (digits === "") continue;
    const plus = Boolean(match[2]);
    const unit = (match[3] ?? "").toLowerCase();
    if (includeAll || isNumericClaim(raw, digits, plus, unit)) {
      claims.push({ raw, digits });
    }
  }
  return claims;
}

function isNumericClaim(raw: string, digits: string, plus: boolean, unit: string): boolean {
  if (raw.startsWith("$") || raw.startsWith("€") || raw.startsWith("£")) return true;
  if (plus || unit !== "") return true;
  if (digits.length >= 3) return true;
  return /^(?:19|20)\d{2}$/.test(digits);
}

function matchesAnyTerm(lowerContent: string, terms: readonly string[]): boolean {
  for (const term of terms) {
    const normalized = normalizeText(term);
    if (normalized === "") continue;
    if (normalized.includes(" ")) {
      if (lowerContent.includes(normalized)) return true;
      const singular = normalized.replace(/s\b/g, "");
      if (singular !== normalized && lowerContent.includes(singular)) return true;
      continue;
    }
    const words = normalized.split(/[^a-z0-9]+/).filter((word) => word.length >= 3 && !STOPWORDS.has(word));
    if (words.length === 0) continue;
    if (words.some((word) => new RegExp(`\\b${escapeRegExp(word)}`, "i").test(lowerContent))) return true;
  }
  return false;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
