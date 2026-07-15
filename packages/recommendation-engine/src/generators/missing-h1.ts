// @forge/recommendation-engine/generators/missing-h1
// Recommendation generator for missing H1 finding.

import type { FindingId, Priority, Difficulty, Impact } from "@forge/core";

const FINDING_ID = "seo.missing_h1" as FindingId;

export function generateMissingH1Recommendation(): {
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
    title: "Add an H1 Heading",
    description: "Add a single H1 heading to the page to outline its main topic.",
    reason:
      "The H1 heading is the primary content heading that tells both users and search engines what the page is about. Every page should have exactly one.",
    priority: "high",
    difficulty: "easy",
    estimatedTime: "2 minutes",
    expectedImpact: "high",
    implementationSteps: [
      { order: 1, description: "Add an <h1> element to the page content" },
      { order: 2, description: "Use text that accurately describes the page content" },
    ],
    references: ["https://developers.google.com/search/docs/advanced/crawling/headings"],
    automatable: false,
    manualReviewRequired: true,
  };
}