// @forge/recommendation-engine/generators/robots-noindex
// Recommendation generator for noindex directive finding.

import type { FindingId, Priority, Difficulty, Impact } from "@forge/core";

const FINDING_ID = "seo.robots_noindex" as FindingId;

export function generateRobotsNoindexRecommendation(): {
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
    title: "Remove noindex Directive",
    description: "Remove the noindex meta tag to allow search engines to index the page.",
    reason:
      "The noindex directive prevents search engines from indexing this page, removing it from search results entirely. Remove this only if you want the page to be searchable.",
    priority: "critical",
    difficulty: "easy",
    estimatedTime: "1 minute",
    expectedImpact: "high",
    implementationSteps: [
      {
        order: 1,
        description: "Remove the <meta name='robots' content='noindex'> tag from the <head>",
      },
    ],
    references: [
      "https://developers.google.com/search/docs/advanced/crawling/block-indexing",
    ],
    automatable: false,
    manualReviewRequired: true,
  };
}