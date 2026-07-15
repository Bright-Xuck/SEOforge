// @forge/recommendation-engine/generators/title-too-short
// Recommendation generator for title too short finding.

import type { FindingId, Priority, Difficulty, Impact } from "@forge/core";

const FINDING_ID = "seo.title_too_short" as FindingId;

export function generateTitleTooShortRecommendation(): {
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
    title: "Lengthen the Page Title",
    description: "Expand the title to 50-60 characters for better search visibility.",
    reason:
      "Titles under 30 characters may be too brief to effectively communicate page content to users and search engines.",
    priority: "low",
    difficulty: "easy",
    estimatedTime: "2 minutes",
    expectedImpact: "medium",
    implementationSteps: [
      { order: 1, description: "Expand the title to include more descriptive keywords" },
      { order: 2, description: "Aim for 50-60 characters total" },
    ],
    references: [
      "https://developers.google.com/search/docs/advanced/crawling/title-links",
    ],
    automatable: false,
    manualReviewRequired: true,
  };
}