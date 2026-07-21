// @forge/review-engine query tests (Sprint 18)
// Filter and sort items.

import { describe, it, expect } from "vitest";
import { filterItems, sortItems } from "../index.js";
import type { ReviewItem } from "../types.js";

function makeItem(overrides: Partial<ReviewItem> = {}): ReviewItem {
  return {
    id: overrides.id ?? "test",
    patch: overrides.patch ?? { createdAt: new Date().toISOString(), provider: "none", generatedBy: "test", operation: "replace" } as any,
    before: overrides.before ?? "",
    after: overrides.after ?? "",
    diff: overrides.diff ?? {} as any,
    section: overrides.section ?? "Hero",
    severity: overrides.severity ?? "safe",
    confidence: overrides.confidence ?? 0.9,
    estimatedImpact: overrides.estimatedImpact ?? "5%",
    validation: overrides.validation ?? { valid: true, errors: [], warnings: [] },
    warnings: overrides.warnings ?? [],
    comments: overrides.comments ?? [],
    decision: overrides.decision,
  };
}

describe("filterItems", () => {
  it("filters by decision status", () => {
    const items = [
      makeItem({ id: "1", section: "A", decision: "APPROVE" }),
      makeItem({ id: "2", section: "B" }),
      makeItem({ id: "3", section: "C", decision: "APPROVE" }),
    ];
    const filtered = filterItems(items, { status: "APPROVE" });
    expect(filtered).toHaveLength(2);
    expect(filtered[0].id).toBe("1");
    expect(filtered[1].id).toBe("3");
  });

  it("filters by severity", () => {
    const items = [
      makeItem({ id: "1", section: "A", severity: "safe" }),
      makeItem({ id: "2", section: "B", severity: "critical" }),
      makeItem({ id: "3", section: "C", severity: "high" }),
    ];
    const filtered = filterItems(items, { severity: "high" });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("3");
  });

  it("filters by section", () => {
    const items = [
      makeItem({ id: "1", section: "Hero" }),
      makeItem({ id: "2", section: "Hero" }),
      makeItem({ id: "3", section: "Footer" }),
    ];
    const filtered = filterItems(items, { section: "Hero" });
    expect(filtered).toHaveLength(2);
    expect(filtered[0].id).toBe("1");
    expect(filtered[1].id).toBe("2");
  });

  it("filters by confidence minimum", () => {
    const items = [
      makeItem({ id: "1", confidence: 0.9 }),
      makeItem({ id: "2", confidence: 0.5 }),
      makeItem({ id: "3", confidence: 0.8 }),
    ];
    const filtered = filterItems(items, { confidenceMin: 0.8 });
    expect(filtered).toHaveLength(2);
    expect(filtered[0].id).toBe("1");
    expect(filtered[1].id).toBe("3");
  });

  it("applies multiple filters", () => {
    const items = [
      makeItem({ id: "1", section: "Hero", severity: "high" }),
      makeItem({ id: "2", section: "Hero", severity: "medium", decision: "APPROVE" }),
      makeItem({ id: "3", section: "Footer", severity: "high" }),
    ];
    const filtered = filterItems(items, { section: "Hero", severity: "high" });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("1");
  });

  it("filters by provider", () => {
    const items = [
      makeItem({ id: "1", patch: { ...makeItem().patch, provider: "wordpress" } as any }),
      makeItem({ id: "2", patch: { ...makeItem().patch, provider: "shopify" } as any }),
    ];
    const filtered = filterItems(items, { provider: "wordpress" });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("1");
  });

  it("filters by generator", () => {
    const items = [
      makeItem({ id: "1", patch: { ...makeItem().patch, generatedBy: "homepage-engine" } as any }),
      makeItem({ id: "2", patch: { ...makeItem().patch, generatedBy: "section-generator" } as any }),
    ];
    const filtered = filterItems(items, { generator: "homepage-engine" });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("1");
  });
});

describe("sortItems", () => {
  it("sorts by severity ascending (safe first)", () => {
    const items = [
      makeItem({ id: "1", severity: "critical" }),
      makeItem({ id: "2", severity: "safe" }),
      makeItem({ id: "3", severity: "high" }),
      makeItem({ id: "4", severity: "low" }),
    ];
    const sorted = sortItems([...items], "severity", "asc");
    expect(sorted[0].id).toBe("2"); // safe
    expect(sorted[1].id).toBe("4"); // low
    expect(sorted[2].id).toBe("3"); // high
    expect(sorted[3].id).toBe("1"); // critical
  });

  it("sorts by severity descending (critical first)", () => {
    const items = [
      makeItem({ id: "1", severity: "critical" }),
      makeItem({ id: "2", severity: "safe" }),
      makeItem({ id: "3", severity: "high" }),
      makeItem({ id: "4", severity: "low" }),
    ];
    const sorted = sortItems([...items], "severity", "desc");
    expect(sorted[0].id).toBe("1"); // critical
    expect(sorted[1].id).toBe("3"); // high
    expect(sorted[2].id).toBe("4"); // low
    expect(sorted[3].id).toBe("2"); // safe
  });

  it("sorts by confidence ascending (low confidence first)", () => {
    const items = [
      makeItem({ id: "1", confidence: 0.8 }),
      makeItem({ id: "2", confidence: 0.5 }),
      makeItem({ id: "3", confidence: 0.9 }),
    ];
    const sorted = sortItems([...items], "confidence", "asc");
    expect(sorted[0].id).toBe("2");
    expect(sorted[1].id).toBe("1");
    expect(sorted[2].id).toBe("3");
  });

  it("sorts by confidence descending (high confidence first)", () => {
    const items = [
      makeItem({ id: "1", confidence: 0.8 }),
      makeItem({ id: "2", confidence: 0.5 }),
      makeItem({ id: "3", confidence: 0.9 }),
    ];
    const sorted = sortItems([...items], "confidence", "desc");
    expect(sorted[0].id).toBe("3");
    expect(sorted[1].id).toBe("1");
    expect(sorted[2].id).toBe("2");
  });

  it("sorts by section alphabetically", () => {
    const items = [
      makeItem({ id: "1", section: "Footer" }),
      makeItem({ id: "2", section: "Hero" }),
      makeItem({ id: "3", section: "Header" }),
    ];
    const sorted = sortItems([...items], "section", "asc");
    // alphabetical: Footer, Header, Hero
    expect(sorted[0].id).toBe("1");
    expect(sorted[1].id).toBe("3");
    expect(sorted[2].id).toBe("2");
  });

  it("sorts by impact", () => {
    const items = [
      makeItem({ id: "1", estimatedImpact: "10%" }),
      makeItem({ id: "2", estimatedImpact: "5%" }),
      makeItem({ id: "3", estimatedImpact: "15%" }),
    ];
    const sorted = sortItems([...items], "impact", "desc");
    expect(sorted[0].id).toBe("3"); // 15
    expect(sorted[1].id).toBe("1"); // 10
    expect(sorted[2].id).toBe("2"); // 5
  });
});