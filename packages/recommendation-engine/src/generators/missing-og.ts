// @forge/recommendation-engine/generators/missing-og
// Recommendation generator for missing Open Graph finding.

import type { FindingId, Priority, Difficulty, Impact } from "@forge/core";

const FINDING_ID = "metadata.missing_og" as FindingId;

export function generateMissingOgRecommendation(): {
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
    title: "Add Open Graph Metadata",
    description: "Add Open Graph tags (og:title, og:description, og:image) for social sharing.",
    reason:
      "Open Graph metadata controls how your page appears when shared on social platforms like Facebook, LinkedIn, and Twitter, improving engagement and click-through rates.",
    priority: "high",
    difficulty: "easy",
    estimatedTime: "5 minutes",
    expectedImpact: "high",
    implementationSteps: [
      { order: 1, description: "Add <meta property='og:title'> matching the page title" },
      { order: 2, description: "Add <meta property='og:description'> with page summary" },
      { order: 3, description: "Add <meta property='og:image'> with a featured image URL" },
    ],
    references: ["https://ogp.dev/"],
    automatable: false,
    manualReviewRequired: true,
  };
}