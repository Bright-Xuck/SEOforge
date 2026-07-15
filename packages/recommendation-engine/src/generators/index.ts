// @forge/recommendation-engine/generators/index
// Registry of all recommendation generators.

import type { FindingId, Recommendation } from "@forge/core";
import { generateMissingTitleRecommendation } from "./missing-title.js";
import { generateMissingMetaDescriptionRecommendation } from "./missing-meta-description.js";
import { generateTitleTooShortRecommendation } from "./title-too-short.js";
import { generateTitleTooLongRecommendation } from "./title-too-long.js";
import { generateMissingH1Recommendation } from "./missing-h1.js";
import { generateMultipleH1Recommendation } from "./multiple-h1.js";
import { generateMissingOgRecommendation } from "./missing-og.js";
import { generateMissingCanonicalRecommendation } from "./missing-canonical.js";
import { generateMissingLangRecommendation } from "./missing-lang.js";
import { generateMissingJsonLdRecommendation } from "./missing-jsonld.js";
import { generateRobotsNoindexRecommendation } from "./robots-noindex.js";

// Map of finding ID to recommendation generator
const RECOMMENDATION_GENERATORS: Record<string, () => Recommendation> = {
  "seo.missing_title": generateMissingTitleRecommendation,
  "seo.missing_meta_description": generateMissingMetaDescriptionRecommendation,
  "seo.title_too_short": generateTitleTooShortRecommendation,
  "seo.title_too_long": generateTitleTooLongRecommendation,
  "seo.missing_h1": generateMissingH1Recommendation,
  "seo.multiple_h1": generateMultipleH1Recommendation,
  "metadata.missing_og": generateMissingOgRecommendation,
  "seo.missing_canonical": generateMissingCanonicalRecommendation,
  "accessibility.missing_lang": generateMissingLangRecommendation,
  "technical.missing_jsonld": generateMissingJsonLdRecommendation,
  "seo.robots_noindex": generateRobotsNoindexRecommendation,
};

/**
 * Generate a recommendation for a finding ID.
 * Returns undefined if no generator exists for the finding.
 */
export function generateRecommendation(findingId: FindingId): Recommendation | undefined {
  const generator = RECOMMENDATION_GENERATORS[findingId];
  if (generator) {
    return generator();
  }
  return undefined;
}