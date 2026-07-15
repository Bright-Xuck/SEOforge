// @forge/recommendation-engine/generators/missing-canonical
// Recommendation generator for missing canonical finding.

import type { FindingId, Priority, Difficulty, Impact } from "@forge/core";

const FINDING_ID = "seo.missing_canonical" as FindingId;

export function generateMissingCanonicalRecommendation(): {
  id: string;
  findingId: FindingId;
  title: string;
  description: string;
  reason: string;
  priority: Priority;
  difficulty: Difficulty;
  estimatedTime: string;
  expectedImpact: Impact;
  implementationSteps: { order: number; description: string }[];
  references: string[];
  automatable: boolean;
  manualReviewRequired: boolean;
} {
  return {
    id: `rec_${FINDING_ID}_1`,
    findingId: FINDING_ID,
    title: "Add a Canonical URL",
    description: "Add a canonical link element to specify the preferred page URL.",
    reason:
      "The canonical URL tells search engines which version of a page to index, preventing duplicate content issues and consolidating ranking signals.",
    priority: "medium",
    difficulty: "easy",
    estimatedTime: "2 minutes",
    expectedImpact: "medium",
    implementationSteps: [
      { order: 1, description: "Add <link rel='canonical' href='page-url'> to the <head>" },
      { order: 2, description: "Ensure the canonical URL matches the preferred page URL" },
    ],
    references: [
      "https://developers.google.com/search/docs/advanced/crawling/consolidate-duplicate-urls",
    ],
    automatable: false,
    manualReviewRequired: true,
  };
}