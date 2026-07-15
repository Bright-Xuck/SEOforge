// @forge/recommendation-engine/generators/missing-title
// Recommendation generator for missing title finding.

import type { FindingId, Priority, Difficulty, Impact } from "@forge/core";

const FINDING_ID = "seo.missing_title" as FindingId;

export function generateMissingTitleRecommendation(): {
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
    title: "Add a Unique Page Title",
    description: "Add a title element to the page with 50-60 characters for optimal SEO.",
    reason:
      "The page title is critical for SEO as it appears in search results and browser tabs. Without a title, search engines may generate an irrelevant one, reducing click-through rates.",
    priority: "critical",
    difficulty: "easy",
    estimatedTime: "2 minutes",
    expectedImpact: "high",
    implementationSteps: [
      { order: 1, description: "Add a <title> element to the <head> section" },
      { order: 2, description: "Include 50-60 characters of descriptive text" },
      { order: 3, description: "Ensure the title accurately describes the page content" },
    ],
    references: [
      "https://developers.google.com/search/docs/advanced/crawling/title-links",
    ],
    automatable: false,
    manualReviewRequired: true,
  };
}