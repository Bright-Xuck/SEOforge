// @forge/recommendation-engine/generators/title-too-long
// Recommendation generator for title too long finding.

import type { FindingId, Priority, Difficulty, Impact } from "@forge/core";

const FINDING_ID = "seo.title_too_long" as FindingId;

export function generateTitleTooLongRecommendation(): {
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
    title: "Shorten the Page Title",
    description: "Reduce the title to under 60 characters to prevent truncation in search results.",
    reason:
      "Titles over 60 characters are truncated in search results, potentially hiding important information and reducing click-through rates.",
    priority: "medium",
    difficulty: "easy",
    estimatedTime: "2 minutes",
    expectedImpact: "medium",
    implementationSteps: [
      { order: 1, description: "Identify and remove redundant keywords" },
      { order: 2, description: "Keep essential information within 60 characters" },
    ],
    references: [
      "https://developers.google.com/search/docs/advanced/crawling/title-links",
    ],
    automatable: false,
    manualReviewRequired: true,
  };
}