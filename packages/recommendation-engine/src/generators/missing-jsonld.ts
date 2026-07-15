// @forge/recommendation-engine/generators/missing-jsonld
// Recommendation generator for missing JSON-LD finding.

import type { FindingId, Priority, Difficulty, Impact } from "@forge/core";

const FINDING_ID = "technical.missing_jsonld" as FindingId;

export function generateMissingJsonLdRecommendation(): {
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
    title: "Add Structured Data",
    description: "Add JSON-LD structured data to help search engines understand page content.",
    reason:
      "Structured data enables rich results in search (ratings, prices, events, etc.), which can significantly improve click-through rates and visibility.",
    priority: "low",
    difficulty: "medium",
    estimatedTime: "10 minutes",
    expectedImpact: "high",
    implementationSteps: [
      {
        order: 1,
        description: "Add a <script type='application/ld+json'> tag to the <head>",
      },
      {
        order: 2,
        description: "Include appropriate Schema.org type for your content (Article, Product, etc.)",
      },
    ],
    references: ["https://developers.google.com/search/docs/advanced/structured-data/intro-structured-data"],
    automatable: false,
    manualReviewRequired: true,
  };
}