// @forge/recommendation-engine/generators/missing-lang
// Recommendation generator for missing language finding.

import type { FindingId, Priority, Difficulty, Impact } from "@forge/core";

const FINDING_ID = "accessibility.missing_lang" as FindingId;

export function generateMissingLangRecommendation(): {
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
    title: "Add Language Attribute",
    description: "Add a lang attribute to the HTML element to declare the page language.",
    reason:
      "The lang attribute helps screen readers pronounce content correctly and assists search engines in understanding the page language for international SEO.",
    priority: "low",
    difficulty: "easy",
    estimatedTime: "1 minute",
    expectedImpact: "low",
    implementationSteps: [
      { order: 1, description: "Add lang='en' (or appropriate language code) to the <html> tag" },
    ],
    references: ["https://www.w3.org/International/questions/qa-html-language-declarations"],
    automatable: false,
    manualReviewRequired: false,
  };
}