// @forge/content-intelligence
// Deterministic entity extraction.
// NO AI. NO LLM. Uses schema.org, capitalized-term heuristics, and dictionaries.

import type { CheerioAPI } from "cheerio";
import type { Entity, EntityKind, WebsiteSnapshot } from "../types.js";

const BRAND_HINTS = ["inc", "llc", "ltd", "corp", "company", "brand", "trademark"];
const ORG_HINTS = ["association", "foundation", "institute", "university", "college", "agency", "group"];
const LOCATION_HINTS = ["street", "avenue", "road", "city", "state", "country", "usa", "uk", "california", "london"];
const PERSON_TITLES = ["mr", "mrs", "ms", "dr", "prof", "ceo", "founder", "president", "director"];

export function extractEntities(snapshot: WebsiteSnapshot, $: CheerioAPI): Entity[] {
  const entities = new Map<string, Entity>();

  collectFromSchema(snapshot, entities);
  collectFromCapitalized(snapshot, $, entities);
  collectFromDictionary(snapshot, entities);

  return [...entities.values()].sort((a, b) => b.occurrences - a.occurrences).slice(0, 50);
}

function add(entities: Map<string, Entity>, kind: EntityKind, value: string, confidence: number, evidence: string): void {
  const key = `${kind}:${value.toLowerCase()}`;
  const existing = entities.get(key);
  if (existing) {
    entities.set(key, {
      ...existing,
      occurrences: existing.occurrences + 1,
      evidence: [...existing.evidence, evidence].slice(0, 5),
    });
    return;
  }
  entities.set(key, { kind, value, occurrences: 1, confidence, evidence: [evidence] });
}

function collectFromSchema(snapshot: WebsiteSnapshot, entities: Map<string, Entity>): void {
  for (const item of snapshot.jsonLd) {
    const type = String(item["@type"] ?? "").toLowerCase();
    const name = String(item["name"] ?? item["headline"] ?? "");
    if (!name) continue;
    if (type.includes("product") || type.includes("offer")) {
      add(entities, "product", name, 0.9, "schema.org product");
    } else if (type.includes("organization") || type.includes("brand")) {
      add(entities, "organization", name, 0.9, "schema.org organization");
      add(entities, "brand", name, 0.8, "schema.org brand");
    } else if (type.includes("person")) {
      add(entities, "person", name, 0.9, "schema.org person");
    } else if (type.includes("category") || type.includes("collection")) {
      add(entities, "category", name, 0.8, "schema.org category");
    } else {
      add(entities, "topic", name, 0.6, "schema.org entity");
    }
  }
}

function collectFromCapitalized(_snapshot: WebsiteSnapshot, $: CheerioAPI, entities: Map<string, Entity>): void {
  const text = $("body").text();
  const candidates = text.match(/[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3}/g) ?? [];
  const counts = new Map<string, number>();
  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    if (trimmed.length < 3) continue;
    if (isCommonWord(trimmed)) continue;
    counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
  }

  for (const [value, occurrences] of counts) {
    if (occurrences < 2) continue;
    const lower = value.toLowerCase();
    if (BRAND_HINTS.some((hint) => lower.includes(hint))) {
      add(entities, "brand", value, 0.7, "brand hint");
    } else if (ORG_HINTS.some((hint) => lower.includes(hint))) {
      add(entities, "organization", value, 0.7, "organization hint");
    } else if (LOCATION_HINTS.some((hint) => lower.includes(hint))) {
      add(entities, "location", value, 0.7, "location hint");
    } else if (PERSON_TITLES.some((hint) => lower.includes(hint))) {
      add(entities, "person", value, 0.7, "person title hint");
    } else {
      add(entities, "repeated-concept", value, 0.5, "repeated capitalized phrase");
    }
  }
}

function collectFromDictionary(snapshot: WebsiteSnapshot, entities: Map<string, Entity>): void {
  const text = `${snapshot.pageTitle} ${snapshot.metaDescription}`.toLowerCase();
  // Categories often appear in meta/title.
  const categoryMatches = text.match(/\b(categories?|topics?|tags?)\b/g);
  if (categoryMatches) {
    add(entities, "category", snapshot.pageTitle, 0.4, "title as category candidate");
  }
}

function isCommonWord(word: string): boolean {
  const common = new Set([
    "The", "This", "That", "With", "Your", "From", "About", "When", "What", "How", "Why", "Who",
    "Our", "You", "All", "Get", "New", "Now", "More", "Read", "View", "Learn", "Find", "Contact",
    "Home", "Menu", "Search", "Login", "Sign", "Cart", "Shop", "Blog", "Page", "Site", "Website",
  ]);
  return common.has(word);
}
