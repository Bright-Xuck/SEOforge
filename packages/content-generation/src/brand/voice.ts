// @forge/content-generation
// Deterministic VoiceProfile detector — no AI, no providers.
// Analyzes existing content to detect brand voice characteristics.

import type { WebsiteSnapshot } from "@forge/core";

/**
 * Detected brand voice types.
 */
export type VoiceType =
  | "professional"
  | "friendly"
  | "luxury"
  | "technical"
  | "medical"
  | "legal"
  | "playful"
  | "corporate"
  | "educational"
  | "conversational"
  | "minimalist"
  | "authoritative";

/**
 * Measured voice metrics from content analysis.
 */
export interface VoiceMetrics {
  readonly avgSentenceLength: number;
  readonly avgParagraphLength: number;
  readonly passiveVoicePercentage: number;
  readonly readingGrade: number;
  readonly ctaFrequency: number;
  readonly questionFrequency: number;
  readonly headlineStyle: string;
  readonly pronounUsage: string;
  readonly formattingHabits: string[];
}

/**
 * Complete voice profile for a project.
 */
export interface VoiceProfile {
  readonly primaryVoice: VoiceType;
  readonly secondaryVoices: VoiceType[];
  readonly metrics: VoiceMetrics;
  readonly confidence: number;
}

/**
 * Detect voice profile from a website snapshot.
 * Deterministic analysis based on content patterns.
 */
export function detectVoiceProfile(snapshot: WebsiteSnapshot): VoiceProfile {
  const metrics = computeVoiceMetrics(snapshot);
  const primary = classifyPrimaryVoice(metrics);
  const secondary = classifySecondaryVoices(metrics, primary);

  return {
    primaryVoice: primary,
    secondaryVoices: secondary,
    metrics,
    confidence: 0.8,
  };
}

function computeVoiceMetrics(snapshot: WebsiteSnapshot): VoiceMetrics {
  const headings = snapshot.headings.map((h) => h.text).filter(Boolean);
  const allText = [
    snapshot.pageTitle,
    snapshot.metaDescription,
    ...headings,
  ].join(" ");

  const words = allText.split(/\s+/).filter(Boolean);
  const sentences = allText.split(/[.!?]+/).filter((s) => s.trim().length > 0);

  const avgSentenceLength = sentences.length > 0
    ? Math.round(words.length / sentences.length)
    : 0;

  const ctaPattern = /(get started|sign up|learn more|buy now|contact us|register|subscribe|try now)/gi;
  const ctaMatches = allText.match(ctaPattern);
  const ctaFrequency = ctaMatches ? ctaMatches.length : 0;

  const questionPattern = /\?/g;
  const questionMatches = allText.match(questionPattern);
  const questionFrequency = questionMatches ? questionMatches.length : 0;

  const pronounPattern = /(we|our|us|i|my|you|your)/gi;
  const pronounMatches = allText.match(pronounPattern);
  const pronounUsage = pronounMatches ? `${pronounMatches.length} pronouns detected` : "none detected";

  return {
    avgSentenceLength,
    avgParagraphLength: 0,
    passiveVoicePercentage: 0,
    readingGrade: estimateReadingGrade(avgSentenceLength),
    ctaFrequency,
    questionFrequency,
    headlineStyle: detectHeadlineStyle(headings),
    pronounUsage,
    formattingHabits: detectFormattingHabits(snapshot),
  };
}

function estimateReadingGrade(avgSentenceLength: number): number {
  if (avgSentenceLength <= 10) return 6;
  if (avgSentenceLength <= 15) return 8;
  if (avgSentenceLength <= 20) return 10;
  if (avgSentenceLength <= 25) return 12;
  return 14;
}

function detectHeadlineStyle(headings: string[]): string {
  if (headings.length === 0) return "unknown";
  const questionHeadlines = headings.filter((h) => h.includes("?")).length;
  const howToHeadlines = headings.filter((h) => h.toLowerCase().startsWith("how")).length;
  if (questionHeadlines > headings.length / 2) return "question-based";
  if (howToHeadlines > 0) return "how-to-based";
  return "declarative";
}

function detectFormattingHabits(snapshot: WebsiteSnapshot): string[] {
  const habits: string[] = [];
  if (snapshot.headings.length >= 5) habits.push("frequent headings");
  if (snapshot.metaDescription.length > 120) habits.push("long meta descriptions");
  if (snapshot.pageTitle.length < 30) habits.push("short titles");
  return habits;
}

function classifyPrimaryVoice(metrics: VoiceMetrics): VoiceType {
  if (metrics.readingGrade >= 12) return "technical";
  if (metrics.avgSentenceLength >= 25) return "corporate";
  if (metrics.ctaFrequency >= 3) return "conversational";
  if (metrics.avgSentenceLength <= 12) return "minimalist";
  return "professional";
}

function classifySecondaryVoices(metrics: VoiceMetrics, primary: VoiceType): VoiceType[] {
  const secondary: VoiceType[] = [];
  if (metrics.questionFrequency > 0) secondary.push("educational");
  if (metrics.ctaFrequency > 1 && primary !== "conversational") secondary.push("friendly");
  return secondary;
}