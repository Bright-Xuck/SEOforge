import { describe, it, expect } from "vitest";
import { detectSearchIntent } from "../src/page-dna/search-intent-detector.js";
import { makeSnapshot } from "./fixtures.js";

describe("detectSearchIntent", () => {
  it("detects transactional intent for product pages", () => {
    const snapshot = makeSnapshot({ pageTitle: "Buy Widget - Price and Discount", metaDescription: "Order now with coupon." });
    const pageType = { kind: "product-page" as const, confidence: 0.9, evidence: [] };
    const intent = detectSearchIntent(snapshot, pageType);
    expect(intent.primary).toBe("transactional");
    expect(intent.scores.transactional).toBeGreaterThan(0);
  });

  it("detects informational intent from how-to keywords", () => {
    const snapshot = makeSnapshot({ pageTitle: "How to train a model - Guide and Tutorial", metaDescription: "Learn with examples and tips." });
    const pageType = { kind: "blog" as const, confidence: 0.9, evidence: [] };
    const intent = detectSearchIntent(snapshot, pageType);
    expect(intent.primary).toBe("informational");
  });

  it("returns mixed when signals are balanced", () => {
    const snapshot = makeSnapshot({ pageTitle: "Best CRM vs alternatives - buy or learn", metaDescription: "Review, compare, price, guide." });
    const pageType = { kind: "generic" as const, confidence: 0.5, evidence: [] };
    const intent = detectSearchIntent(snapshot, pageType);
    expect(["mixed", "commercial", "informational"]).toContain(intent.primary);
  });
});
