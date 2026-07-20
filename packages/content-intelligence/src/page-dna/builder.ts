// @forge/content-intelligence
// Page DNA construction: aggregates all deterministic detectors.
// NO AI.

import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import type { PageDNA, WebsiteSnapshot } from "../types.js";
import { detectSections } from "../sections/detector.js";
import { detectPageType } from "./page-type-detector.js";
import { detectSearchIntent } from "./search-intent-detector.js";
import { detectAudience } from "./audience-detector.js";
import { extractTopics } from "./topic-extractor.js";
import { extractEntities } from "./entity-extractor.js";
import { createPageDNAWithVersion } from "./version-validator.js";
import {
  buildHeadingDistribution,
  buildLinkSummary,
  buildMediaSummary,
  buildSchemaSummary,
  buildMetadataSummary,
  buildTrustIndicators,
} from "../summaries/builder.js";

export function buildPageDNA(snapshot: WebsiteSnapshot, $: CheerioAPI): PageDNA {
  const sections = detectSections(snapshot, $);
  const pageType = detectPageType(snapshot, sections);
  const searchIntent = detectSearchIntent(snapshot, pageType);
  const audience = detectAudience(snapshot, searchIntent);
  const topics = extractTopics(snapshot);
  const entities = extractEntities(snapshot, $);

  const headingDistribution = buildHeadingDistribution(snapshot);
  const contentLength = $("body").text().replace(/\s+/g, " ").trim().split(/\s+/).filter(Boolean).length;
  const readingLevel = contentLength > 0 ? estimateReadingLevel($) : "unknown";

  return createPageDNAWithVersion({
    url: snapshot.finalUrl || snapshot.originalUrl,
    pageType,
    intent: searchIntent,
    audience,
    contentLength,
    headingDistribution,
    readingLevel,
    sectionInventory: sections,
    entities,
    topics,
    links: buildLinkSummary(snapshot),
    media: buildMediaSummary(snapshot, $),
    trust: buildTrustIndicators(snapshot, $),
    schema: buildSchemaSummary(snapshot),
    metadata: buildMetadataSummary(snapshot),
  });
}

export function buildPageDNAFromSnapshot(snapshot: WebsiteSnapshot): PageDNA {
  const $ = cheerio.load(snapshot.rawHtml || "");
  return buildPageDNA(snapshot, $);
}

function estimateReadingLevel($: CheerioAPI): string {
  const sentences = $("body").text().split(/[.!?]+/).filter((sentence) => sentence.trim().length > 0);
  const words = $("body").text().split(/\s+/).filter(Boolean);
  if (sentences.length === 0 || words.length === 0) return "unknown";
  const avg = words.length / sentences.length;
  if (avg <= 12) return "easy";
  if (avg <= 18) return "medium";
  return "hard";
}
