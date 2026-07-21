// @forge/review-engine policy tests (Sprint 18)
// Policy evaluation and severity ranking.

import { describe, it, expect } from "vitest";
import { severityRank, evaluatePolicy, REVIEW_POLICIES } from "../index.js";
import type { ReviewItem } from "../types.js";

function makeItem(overrides: Partial<ReviewItem> = {}): ReviewItem {
  return {
    id: overrides.id ?? "test",
    patch: overrides.patch ?? {} as any,
    before: overrides.before ?? "Old",
    after: overrides.after ?? "New",
    diff: overrides.diff ?? {} as any,
    section: overrides.section ?? "Hero",
    severity: overrides.severity ?? "safe",
    confidence: overrides.confidence ?? 0.9,
    estimatedImpact: overrides.estimatedImpact ?? "5%",
    validation: overrides.validation ?? { valid: true, errors: [], warnings: [] },
    warnings: overrides.warnings ?? [],
    comments: overrides.comments ?? [],
  };
}

describe("severityRank", () => {
  it("ranks safe as 0", () => {
    expect(severityRank("safe")).toBe(0);
  });

  it("ranks low as 1", () => {
    expect(severityRank("low")).toBe(1);
  });

  it("ranks medium as 2", () => {
    expect(severityRank("medium")).toBe(2);
  });

  it("ranks high as 3", () => {
    expect(severityRank("high")).toBe(3);
  });

  it("ranks critical as 4", () => {
    expect(severityRank("critical")).toBe(4);
  });
});

describe("REVIEW_POLICIES", () => {
  it("includes all four policy names", () => {
    expect(REVIEW_POLICIES.strict).toBeDefined();
    expect(REVIEW_POLICIES.balanced).toBeDefined();
    expect(REVIEW_POLICIES.automatic).toBeDefined();
    expect(REVIEW_POLICIES.enterprise).toBeDefined();
  });

  it("enterprise never auto-approves", () => {
    const policy = REVIEW_POLICIES.enterprise;
    const item = makeItem();
    const result = evaluatePolicy(policy, item);
    expect(result).toBe("manual");
  });

  it("automatic allows safe items with high confidence", () => {
    const policy = REVIEW_POLICIES.automatic;
    const item = makeItem({ severity: "safe", confidence: 0.9, warnings: [] });
    const result = evaluatePolicy(policy, item);
    expect(result).toBe("auto-approve");
  });

  it("blocks on validation failure", () => {
    const policy = REVIEW_POLICIES.automatic;
    const item = makeItem({ validation: { valid: false, errors: ["error"], warnings: [] } });
    const result = evaluatePolicy(policy, item);
    expect(result).toBe("manual");
  });

  it("blocks on warnings", () => {
    const policy = REVIEW_POLICIES.automatic;
    const item = makeItem({ warnings: ["Potential issue"] });
    const result = evaluatePolicy(policy, item);
    expect(result).toBe("manual");
  });
});

describe("evaluatePolicy", () => {
  it("auto-approves safe items with balanced policy", () => {
    const policy = REVIEW_POLICIES.balanced;
    const item = makeItem({ severity: "safe", confidence: 0.9, warnings: [] });
    const result = evaluatePolicy(policy, item);
    expect(result).toBe("auto-approve");
  });

  it("manual requires reviewer for critical severity", () => {
    const policy = REVIEW_POLICIES.balanced;
    const item = makeItem({ severity: "critical", confidence: 0.9, warnings: [] });
    const result = evaluatePolicy(policy, item);
    expect(result).toBe("manual");
  });

  it("manual requires reviewer for high severity", () => {
    const policy = REVIEW_POLICIES.strict;
    const item = makeItem({ severity: "high", confidence: 0.9, warnings: [] });
    const result = evaluatePolicy(policy, item);
    expect(result).toBe("manual");
  });

  it("strict only auto-approves safe with high confidence", () => {
    const policy = REVIEW_POLICIES.strict;
    const item = makeItem({ severity: "safe", confidence: 0.9, warnings: [] });
    const result = evaluatePolicy(policy, item);
    expect(result).toBe("auto-approve");
  });

  it("strict does not auto-approve low confidence safe items", () => {
    const policy = REVIEW_POLICIES.strict;
    const item = makeItem({ severity: "safe", confidence: 0.5, warnings: [] });
    const result = evaluatePolicy(policy, item);
    expect(result).toBe("manual");
  });

  it("balanced requires medium confidence for auto-approval", () => {
    const policy = REVIEW_POLICIES.balanced;
    const item = makeItem({ severity: "low", confidence: 0.5, warnings: [] });
    const result = evaluatePolicy(policy, item);
    expect(result).toBe("manual");
  });

  it("balanced auto-approves medium severity with high confidence", () => {
    const policy = REVIEW_POLICIES.balanced;
    const item = makeItem({ severity: "medium", confidence: 0.8, warnings: [] });
    const result = evaluatePolicy(policy, item);
    expect(result).toBe("auto-approve");
  });
});