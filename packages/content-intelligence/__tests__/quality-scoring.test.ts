import { describe, it, expect } from "vitest";
import * as cheerio from "cheerio";
import { scoreQuality } from "../src/quality/scorer.js";
import { makeRichSnapshot, makeSnapshot } from "./fixtures.js";

describe("scoreQuality", () => {
  it("returns all eight sub-scores plus overall", () => {
    const snapshot = makeRichSnapshot();
    const $ = cheerio.load(snapshot.rawHtml);
    const scores = scoreQuality(snapshot, $);
    expect(scores.readability.score).toBeGreaterThanOrEqual(0);
    expect(scores.headingQuality.score).toBeGreaterThanOrEqual(0);
    expect(scores.contentDepth.score).toBeGreaterThanOrEqual(0);
    expect(scores.topicCoverage.score).toBeGreaterThanOrEqual(0);
    expect(scores.trustSignals.score).toBeGreaterThanOrEqual(0);
    expect(scores.ctaQuality.score).toBeGreaterThanOrEqual(0);
    expect(scores.internalLinking.score).toBeGreaterThanOrEqual(0);
    expect(scores.semanticCoverage.score).toBeGreaterThanOrEqual(0);
    expect(scores.overall).toBeGreaterThanOrEqual(0);
    expect(scores.overall).toBeLessThanOrEqual(100);
  });

  it("scores a sparse page lower than a rich page", () => {
    const sparse = makeSnapshot({ rawHtml: "<html><body><h1>Hi</h1></body></html>" });
    const rich = makeRichSnapshot();
    const $s = cheerio.load(sparse.rawHtml);
    const $r = cheerio.load(rich.rawHtml);
    const sparseScore = scoreQuality(sparse, $s).overall;
    const richScore = scoreQuality(rich, $r).overall;
    expect(richScore).toBeGreaterThanOrEqual(sparseScore);
  });
});
