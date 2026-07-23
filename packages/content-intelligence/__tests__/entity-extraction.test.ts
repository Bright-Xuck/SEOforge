import { describe, it, expect } from "vitest";
import * as cheerio from "cheerio";
import { extractEntities } from "../src/page-dna/entity-extractor.js";
import { extractTopics as extractTopicsFn } from "../src/page-dna/topic-extractor.js";
import { makeRichSnapshot } from "./fixtures.js";

describe("extractEntities", () => {
  it("extracts schema.org product entities", () => {
    const snapshot = makeRichSnapshot();
    const $ = cheerio.load(snapshot.rawHtml);
    const entities = extractEntities(snapshot, $);
    expect(entities.some((e) => e.kind === "product" && e.value === "Acme CRM")).toBe(true);
  });

  it("returns entities with occurrences and confidence", () => {
    const snapshot = makeRichSnapshot();
    const $ = cheerio.load(snapshot.rawHtml);
    const entities = extractEntities(snapshot, $);
    for (const entity of entities) {
      expect(entity.occurrences).toBeGreaterThanOrEqual(1);
      expect(entity.confidence).toBeGreaterThan(0);
    }
  });
});

describe("extractTopics", () => {
  it("extracts dominant topics from headings and body", () => {
    const snapshot = makeRichSnapshot();
    const topics = extractTopicsFn(snapshot);
    expect(Array.isArray(topics)).toBe(true);
    if (topics.length > 0) {
      expect(topics[0]).toHaveProperty("term");
      expect(topics[0]).toHaveProperty("weight");
    }
  });

  it("does not include stop words as top topics", () => {
    const snapshot = makeRichSnapshot();
    const topics = extractTopicsFn(snapshot);
    expect(topics.every((t) => t.term !== "the")).toBe(true);
  });
});
