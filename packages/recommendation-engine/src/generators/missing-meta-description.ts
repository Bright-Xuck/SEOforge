// @forge/recommendation-engine/generators/missing-meta-description
// Recommendation generator for missing meta description finding.

import type { FindingId, Priority, Difficulty, Impact } from "@forge/core";

const FINDING_ID = "seo.missing_meta_description" as FindingId;

export function generateMissingMetaDescriptionRecommendation(): {
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
    title: "Add a Meta Description",
    description: "Add a meta description tag with 120-160 characters to improve search result appearance.",
    reason:
      "Meta descriptions provide a summary of page content in search results. While not a direct ranking factor, they significantly impact click-through rates from search results.",
    priority: "high",
    difficulty: "easy",
    estimatedTime: "3 minutes",
    expectedImpact: "high",
    implementationSteps: [
      { order: 1, description: "Add a <meta name='description'> tag to the <head> section" },
      { order: 2, description: "Write 120-160 characters describing the page content" },
      { order: 3, description: "Include relevant keywords naturally" },
    ],
    references: [
      "https://developers.google.com/search/docs/advanced/crawling/meta-descriptions",
    ],
    automatable: false,
    manualReviewRequired: true,
  };
}