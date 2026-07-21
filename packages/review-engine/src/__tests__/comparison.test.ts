// @forge/review-engine comparison tests (Sprint 18)
// Deterministic diff comparison, no LLM.

import { describe, it, expect } from "vitest";
import { compareContent } from "../index.js";

describe("compareContent", () => {
  it("detects word additions", () => {
    const before = "Hello world. Good morning.";
    const after = "Hello world. Good morning. How are you?";
    const result = compareContent(before, after);
    expect(result.wordAdditions).toBeGreaterThan(0);
    expect(result.sentenceAdditions).toBe(1);
  });

  it("detects word removals", () => {
    const before = "Hello world. Good morning. See you later.";
    const after = "Hello world. Good morning.";
    const result = compareContent(before, after);
    expect(result.wordRemovals).toBeGreaterThan(0);
    expect(result.sentenceRemovals).toBe(1);
  });

  it("detects sentence additions", () => {
    const before = "Hello world. Good morning.";
    const after = "Hello world. Good afternoon.";
    const result = compareContent(before, after);
    expect(result.sentenceAdditions).toBe(1);
    expect(result.sentenceRemovals).toBe(1);
  });

  it("handles identical content", () => {
    const before = "Hello world. Good morning. See you later.";
    const after = "Hello world. Good morning. See you later.";
    const result = compareContent(before, after);
    expect(result.wordAdditions).toBe(0);
    expect(result.wordRemovals).toBe(0);
    expect(result.sentenceAdditions).toBe(0);
    expect(result.sentenceRemovals).toBe(0);
  });

  it("handles empty strings", () => {
    const result = compareContent("", "");
    expect(result.wordAdditions).toBe(0);
    expect(result.wordRemovals).toBe(0);
    expect(result.sentenceAdditions).toBe(0);
    expect(result.sentenceRemovals).toBe(0);
    expect(result.keywordAdditions).toEqual([]);
    expect(result.keywordRemovals).toEqual([]);
    expect(result.entityAdditions).toEqual([]);
    expect(result.entityRemovals).toEqual([]);
  });

  it("detects keyword additions", () => {
    const before = "Hello world.";
    const after = "Hello world. Best guide for SEO.";
    const result = compareContent(before, after);
    expect(result.keywordAdditions.length).toBeGreaterThan(0);
  });

  it("detects heading changes", () => {
    const before = "# Title\n\nSome content.";
    const after = "# New Title\n\nSome content.\n## Subheading";
    const result = compareContent(before, after);
    expect(result.headingChanges).toBe(1);
  });

  it("detects entity additions", () => {
    const before = "Hello world.";
    const after = "Hello world. John Smith is here.";
    const result = compareContent(before, after);
    expect(result.entityAdditions).toContain("John Smith");
  });

  it("computes readability delta", () => {
    const before = "Simple text. Easy to read.";
    const after = "Simple text. Easy to read. Very clear.";
    const result = compareContent(before, after);
    expect(typeof result.readabilityDelta).toBe("number");
  });

  it("computes seo delta", () => {
    const before = "Some content.";
    const after = "# Best guide\n\nTop review for how to optimize.";
    const result = compareContent(before, after);
    expect(result.seoDelta).toBeGreaterThan(0);
  });
});