// @forge/review-engine pipeline tests (Sprint 18)
// Pipeline step factory tests.
// Note: These factories are defined in @forge/pipeline-engine and tested there.
// This test validates the integration point from review-engine.

import { describe, it, expect } from "vitest";
import { createReviewSession, applyPolicy, filterItems, sortItems, computeMetrics, generateReport, type ReviewSession } from "../index.js";
import type { ContentPatch } from "@forge/content-generation";

function makePatch(overrides: Partial<ContentPatch> = {}): ContentPatch {
  const now = new Date().toISOString();
  return {
    id: overrides.id ?? `patch-${Math.random().toString(36).slice(2, 7)}`,
    sectionId: overrides.sectionId ?? "hero",
    operation: overrides.operation ?? "replace",
    selector: overrides.selector ?? "h1",
    currentContent: overrides.currentContent ?? "Old Title",
    proposedContent: overrides.proposedContent ?? "New Title",
    diff: overrides.diff ?? { sectionId: "hero", current: "Old Title", generated: "New Title", changedSentences: [], addedEntities: [], removedEntities: [], seoScoreDelta: 0 },
    validation: overrides.validation ?? { valid: true, errors: [], warnings: [] },
    confidence: overrides.confidence ?? 0.9,
    estimatedImpact: overrides.estimatedImpact ?? "5%",
    warnings: overrides.warnings ?? [],
    generatedBy: overrides.generatedBy ?? "test",
    provider: overrides.provider ?? "none",
    promptVersion: overrides.promptVersion ?? "0.18.0",
    createdAt: overrides.createdAt ?? now,
  };
}

describe("Pipeline Integration", () => {
  it("create -> filter -> sort -> apply -> metrics -> report chain works", () => {
    const patches = [
      makePatch({ id: "p1", sectionId: "hero", confidence: 0.9, proposedContent: "New Hero" }),
      makePatch({ id: "p2", sectionId: "footer", confidence: 0.5, proposedContent: "New Footer" }),
      makePatch({ id: "p3", sectionId: "sidebar", confidence: 0.3, proposedContent: "New Sidebar", warnings: ["test warning"] }),
    ];

    // Step 1: Create
    let session = createReviewSession({ projectId: "test", createdBy: "pipeline", patches });
    expect(session.items).toHaveLength(3);
    expect(session.status).toBe("pending");

    // Step 2: Filter
    const filtered = filterItems(session.items, { section: "hero" });
    expect(filtered).toHaveLength(1);

    // Step 3: Sort
    const sorted = sortItems(session.items, "confidence", "desc");
    expect(sorted[0].confidence).toBeGreaterThanOrEqual(sorted[1].confidence);

    // Step 4: Apply policy
    session = applyPolicy(session);
    const approved = session.items.filter(i => i.decision === "APPROVE");
    expect(approved.length).toBeGreaterThan(0);

    // Step 5: Metrics
    const metrics = computeMetrics(session);
    expect(metrics.approvalRate).toBeGreaterThan(0);

    // Step 6: Report
    const report = generateReport(session);
    expect(report.markdown).toContain("test");
    expect(report.html).toContain("Review");
    expect(report.json).toContain("sessionId");
  });
});