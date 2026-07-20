// @forge/content-intelligence
// Deterministic quality scoring.
// NO AI. NO text generation.

import type { CheerioAPI } from "cheerio";
import type { QualityScores, TrustIndicators, WebsiteSnapshot } from "../types.js";
import { detectSections } from "../sections/detector.js";
import { buildLinkSummary, buildTrustIndicators } from "../summaries/builder.js";

export function scoreQuality(snapshot: WebsiteSnapshot, $: CheerioAPI): QualityScores {
  const text = $("body").text();
  const words = text.split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?]+/).filter((sentence) => sentence.trim().length > 0);
  const paragraphs = $("p").length;

  const readability = scoreReadability(words.length, sentences.length);
  const headingQuality = scoreHeadings(snapshot);
  const contentDepth = scoreDepth(words.length, paragraphs);
  const sections = detectSections(snapshot, $);
  const topics = extractTopicCount(snapshot);
  const topicCoverage = scoreTopicCoverage(topics);
  const trust = buildTrustIndicators(snapshot, $);
  const trustScore = scoreTrust(trust);
  const cta = scoreCta($);
  const links = buildLinkSummary(snapshot);
  const internalLinking = scoreInternalLinking(links.internal);
  const semanticCoverage = scoreSemanticCoverage(topics, sections.present.length);

  const overall = Math.round(
    (readability.score + headingQuality.score + contentDepth.score + topicCoverage.score +
      trustScore.score + cta.score + internalLinking.score + semanticCoverage.score) / 8,
  );

  return {
    readability,
    headingQuality,
    contentDepth,
    topicCoverage,
    trustSignals: trustScore,
    ctaQuality: cta,
    internalLinking,
    semanticCoverage,
    overall,
  };
}

function scoreReadability(wordCount: number, sentenceCount: number): QualityScores["readability"] {
  const avgWordsPerSentence = sentenceCount > 0 ? wordCount / sentenceCount : 0;
  let flesch = 100;
  if (avgWordsPerSentence > 0) {
    flesch = Math.max(0, Math.min(100, 206.835 - 1.015 * avgWordsPerSentence));
  }
  const readingLevel = flesch > 70 ? "easy" : flesch > 40 ? "medium" : "hard";
  const score = Math.round(flesch);
  return {
    score,
    readingLevel,
    fleschReadingEase: Math.round(flesch * 10) / 10,
    avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
    reasoning: `Avg ${avgWordsPerSentence.toFixed(1)} words/sentence; Flesch ${flesch.toFixed(1)}.`,
  };
}

function scoreHeadings(snapshot: WebsiteSnapshot): QualityScores["headingQuality"] {
  const h1 = snapshot.headings.filter((heading) => heading.level === 1).length;
  const hasSingleH1 = h1 === 1;
  let prev = 0;
  let hierarchyValid = true;
  for (const heading of snapshot.headings) {
    if (prev !== 0 && heading.level > prev + 1) {
      hierarchyValid = false;
      break;
    }
    prev = heading.level;
  }
  const score = (hasSingleH1 ? 50 : 0) + (hierarchyValid ? 50 : 0);
  return {
    score,
    hasSingleH1,
    hierarchyValid,
    reasoning: `H1 count=${h1}; hierarchy valid=${hierarchyValid}.`,
  };
}

function scoreDepth(wordCount: number, paragraphCount: number): QualityScores["contentDepth"] {
  let score = 0;
  if (wordCount >= 1200) score = 100;
  else if (wordCount >= 600) score = 75;
  else if (wordCount >= 300) score = 50;
  else if (wordCount >= 150) score = 25;
  return {
    score,
    wordCount,
    paragraphCount,
    reasoning: `Word count=${wordCount}; paragraphs=${paragraphCount}.`,
  };
}

function extractTopicCount(snapshot: WebsiteSnapshot): number {
  const headingText = snapshot.headings.map((heading) => heading.text).join(" ").toLowerCase();
  const words = headingText.split(/\s+/).filter((word) => word.length > 3);
  return new Set(words).size;
}

function scoreTopicCoverage(topicCount: number): QualityScores["topicCoverage"] {
  const score = Math.min(100, topicCount * 10);
  return { score, topicCount, reasoning: `Distinct heading terms=${topicCount}.` };
}

function scoreTrust(trust: TrustIndicators): QualityScores["trustSignals"] {
  const indicators: string[] = [];
  if (trust.hasTestimonials) indicators.push("testimonials");
  if (trust.hasReviews) indicators.push("reviews");
  if (trust.hasCertifications) indicators.push("certifications");
  if (trust.hasSecurityBadges) indicators.push("security-badges");
  if (trust.hasAboutPage) indicators.push("about-page");
  if (trust.hasContactInfo) indicators.push("contact-info");
  if (trust.hasSocialProof) indicators.push("social-proof");
  return {
    score: trust.score,
    indicators,
    reasoning: `Trust signals present: ${indicators.join(", ") || "none"}.`,
  };
}

function scoreCta($: CheerioAPI): QualityScores["ctaQuality"] {
  const ctaText = ["sign up", "get started", "contact us", "request demo", "try free", "buy now", "subscribe"];
  const buttons = $("a.btn, button, .cta, [class*='cta']").length;
  const text = $("body").text().toLowerCase();
  const ctaCount = ctaText.filter((phrase) => text.includes(phrase)).length + buttons;
  const hasPrimaryCta = buttons > 0 || ctaCount > 0;
  const score = Math.min(100, ctaCount * 25);
  return { score, ctaCount, hasPrimaryCta, reasoning: `CTA signals=${ctaCount}.` };
}

function scoreInternalLinking(internalLinks: number): QualityScores["internalLinking"] {
  const score = Math.min(100, internalLinks * 10);
  return { score, internalLinks, reasoning: `Internal links=${internalLinks}.` };
}

function scoreSemanticCoverage(topicCount: number, sectionCount: number): QualityScores["semanticCoverage"] {
  const coveredConcepts = topicCount + sectionCount;
  const score = Math.min(100, coveredConcepts * 5);
  return { score, coveredConcepts, reasoning: `Covered concepts=${coveredConcepts}.` };
}
