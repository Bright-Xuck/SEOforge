// @forge/recommendation-engine/generators/multiple-h1
// Recommendation generator for multiple H1 finding.

import type { FindingId, Priority, Difficulty, Impact } from "@forge/core";

const FINDING_ID = "seo.multiple_h1" as FindingId;

export function generateMultipleH1Recommendation(): {
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
    title: "Reduce to Single H1 Heading",
    description: "Remove extra H1 headings and keep only one primary page heading.",
    reason:
      "Multiple H1 headings dilute the main topic signal. Search engines and screen readers expect a single H1 that represents the page's primary subject.",
    priority: "medium",
    difficulty: "medium",
    estimatedTime: "5 minutes",
    expectedImpact: "medium",
    implementationSteps: [
      { order: 1, description: "Identify all H1 elements on the page" },
      { order: 2, description: "Convert additional H1s to H2 or lower levels" },
      { order: 3, description: "Keep the most important H1 as the page topic" },
    ],
    references: ["https://developers.google.com/search/docs/advanced/crawling/headings"],
    automatable: false,
    manualReviewRequired: true,
  };
}