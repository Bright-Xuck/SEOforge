// @forge/content-intelligence
// Deterministic content gap detection.
// NO AI. NO text generation.

import type { CheerioAPI } from "cheerio";
import type { ContentGap, ContentGapKind, WebsiteSnapshot } from "../types.js";
import { detectSections } from "../sections/detector.js";
import { scoreQuality } from "../quality/scorer.js";

export function detectGaps(snapshot: WebsiteSnapshot, $: CheerioAPI): ContentGap[] {
  const gaps: ContentGap[] = [];
  const sections = detectSections(snapshot, $);
  const present = new Set(sections.present);
  const text = $("body").text().toLowerCase();
  const quality = scoreQuality(snapshot, $);

  const add = (
    kind: ContentGapKind,
    severity: ContentGap["severity"],
    title: string,
    description: string,
    evidence: string[],
    recommendation: string,
  ): void => {
    gaps.push({ kind, severity, title, description, evidence, recommendation });
  };

  if (!present.has("faq")) {
    add("missing-faq", "medium", "Missing FAQ section",
      "No frequently-asked-questions section was detected.",
      ["No FAQ markers in DOM or schema."],
      "Add an FAQ section addressing common customer questions.");
  }

  if (quality.ctaQuality.score < 50) {
    add("weak-cta", "high", "Weak call-to-action",
      "Calls-to-action are sparse or missing.",
      [`CTA score=${quality.ctaQuality.score}.`],
      "Add clear primary and secondary CTAs above the fold.");
  }

  if (quality.contentDepth.score < 50) {
    add("thin-sections", "high", "Thin content",
      "Page content is below recommended depth.",
      [`Word count=${quality.contentDepth.wordCount}.`],
      "Expand sections with more substantive, original content.");
  }

  if (quality.trustSignals.score < 40) {
    add("missing-trust", "medium", "Missing trust signals",
      "Few or no trust indicators were detected.",
      [`Trust score=${quality.trustSignals.score}.`],
      "Add testimonials, reviews, certifications, or security badges.");
  }

  if (!present.has("comparison")) {
    add("missing-comparison", "low", "Missing comparison content",
      "No product or solution comparison was detected.",
      ["No comparison keywords found."],
      "Add a comparison table or versus section if relevant.");
  }

  if (!present.has("buying-guide")) {
    add("missing-buying-guide", "low", "Missing buying guide",
      "No buying-guide content was detected.",
      ["No buying-guide keywords found."],
      "Add a buying guide to support consideration-stage users.");
  }

  const intro = $("h1").first().nextAll("p").first().text().trim();
  if (intro.length < 40) {
    add("weak-introduction", "medium", "Weak introduction",
      "The introductory paragraph is short or missing.",
      [`Intro length=${intro.length}.`],
      "Write a clear, keyword-rich introduction after the H1.");
  }

  const lastParagraph = $("p").last().text().trim();
  if (lastParagraph.length < 40) {
    add("weak-conclusion", "low", "Weak conclusion",
      "The concluding paragraph is short or missing.",
      [`Conclusion length=${lastParagraph.length}.`],
      "Add a summarizing conclusion with a next step.");
  }

  if (quality.internalLinking.score < 30) {
    add("sparse-internal-links", "medium", "Sparse internal links",
      "Few internal links were detected.",
      [`Internal links=${quality.internalLinking.internalLinks}.`],
      "Add contextual internal links to related pages.");
  }

  if (!present.has("related-content") && !text.includes("related")) {
    add("missing-supporting-content", "low", "Missing supporting content",
      "No related or supporting content was detected.",
      ["No related-content section found."],
      "Link to related articles or resources to deepen coverage.");
  }

  return gaps;
}
