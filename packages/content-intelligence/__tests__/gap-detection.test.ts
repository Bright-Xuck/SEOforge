import { describe, it, expect } from "vitest";
import * as cheerio from "cheerio";
import { detectGaps } from "../src/gap/detector.js";
import { makeSnapshot } from "./fixtures.js";

describe("detectGaps", () => {
  it("flags missing FAQ on a page without FAQ", () => {
    const snapshot = makeSnapshot({ rawHtml: "<html><body><h1>Hi</h1><p>Welcome to our site.</p></body></html>" });
    const $ = cheerio.load(snapshot.rawHtml);
    const gaps = detectGaps(snapshot, $);
    expect(gaps.some((g) => g.kind === "missing-faq")).toBe(true);
  });

  it("every gap has severity, title, and recommendation", () => {
    const snapshot = makeSnapshot({ rawHtml: "<html><body><h1>Hi</h1></body></html>" });
    const $ = cheerio.load(snapshot.rawHtml);
    const gaps = detectGaps(snapshot, $);
    for (const gap of gaps) {
      expect(["low", "medium", "high"]).toContain(gap.severity);
      expect(gap.title.length).toBeGreaterThan(0);
      expect(gap.recommendation.length).toBeGreaterThan(0);
    }
  });

  it("produces fewer gaps for a rich page", () => {
    const rich = makeSnapshot({
      rawHtml: `<html><body>
        <section class="faq"><h2>FAQ</h2><p>Frequently asked questions.</p></section>
        <section class="cta"><a href="/signup">Get Started</a></section>
        <section class="testimonials"><p>What our customers say.</p></section>
        <p>${"word ".repeat(300)}</p>
      </body></html>`,
    });
    const $ = cheerio.load(rich.rawHtml);
    const gaps = detectGaps(rich, $);
    expect(gaps.every((g) => g.kind !== "missing-faq")).toBe(true);
  });
});
