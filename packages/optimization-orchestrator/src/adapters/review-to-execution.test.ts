// @forge/optimization-orchestrator
// Tests for the review → execution seam.

import { describe, expect, it } from "vitest";
import type { ContentPatch } from "@forge/content-generation";
import type { ReviewItem, ReviewSession } from "@forge/review-engine";
import { buildExecutionPlanFromReview, isExecutablePatch } from "./review-to-execution.js";

function makePatch(overrides: Partial<ContentPatch> = {}): ContentPatch {
  return {
    id: "patch-1",
    sectionId: "elementor-e1f2a3b4-title",
    operation: "replace",
    selector: '[data-id="e1f2a3b4"]',
    currentContent: "Old heading",
    proposedContent: "New heading",
    diff: {} as never,
    validation: { valid: true, errors: [], warnings: [] },
    confidence: 0.9,
    estimatedImpact: "Improves clarity",
    warnings: [],
    generatedBy: "test",
    provider: "test",
    promptVersion: "v1",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeItem(
  decision: ReviewItem["decision"],
  patch: ContentPatch,
  overrides: Partial<ReviewItem> = {},
): ReviewItem {
  return {
    id: `item-${patch.id}`,
    patch,
    before: patch.currentContent,
    after: patch.proposedContent,
    diff: {} as never,
    section: patch.sectionId,
    severity: "medium",
    confidence: patch.confidence,
    estimatedImpact: patch.estimatedImpact,
    validation: patch.validation,
    warnings: [],
    comments: [],
    decision,
    ...overrides,
  };
}

function makeSession(items: ReviewItem[]): ReviewSession {
  return {
    sessionId: "review-test",
    items,
    status: "completed",
  } as unknown as ReviewSession;
}

describe("buildExecutionPlanFromReview", () => {
  it("does not execute an approved patch that failed validation", () => {
    const patch = makePatch({
      validation: { valid: false, errors: ["Ungrounded numeric claim"], warnings: [] },
      target: {
        format: "elementor",
        elementId: "e1f2a3b4",
        settingsKey: "title",
        pageId: 6,
        expectedWidgetType: "heading",
        sourceFingerprint: "fingerprint-1",
      },
    });

    const plan = buildExecutionPlanFromReview(makeSession([makeItem("APPROVE", patch)]), {
      url: "https://example.com/?page_id=6",
    });

    expect(plan.actions).toHaveLength(0);
  });

  it("allows a human-edited invalid patch to be executed", () => {
    const patch = makePatch({
      validation: { valid: false, errors: ["Ungrounded numeric claim"], warnings: [] },
      target: {
        format: "elementor",
        elementId: "e1f2a3b4",
        settingsKey: "title",
        pageId: 6,
        expectedWidgetType: "heading",
        sourceFingerprint: "fingerprint-1",
      },
    });

    const plan = buildExecutionPlanFromReview(
      makeSession([makeItem("EDIT", patch, { editedContent: "Human-reviewed heading" })]),
      { url: "https://example.com/?page_id=6" },
    );

    expect(plan.actions).toHaveLength(1);
    expect(plan.actions[0]?.payload).toMatchObject({
      patch: { proposedContent: "Human-reviewed heading" },
    });
  });

  it("turns an approved Elementor patch into an approved action", () => {
    const patch = makePatch({
      target: {
        format: "elementor",
        elementId: "e1f2a3b4",
        settingsKey: "title",
        pageId: 6,
        expectedWidgetType: "heading",
        sourceFingerprint: "fingerprint-1",
        richText: false,
      },
      sourceFingerprint: "fingerprint-1",
    });

    const plan = buildExecutionPlanFromReview(makeSession([makeItem("APPROVE", patch)]), {
      url: "https://example.com/?page_id=6",
    });

    expect(plan.actions).toHaveLength(1);
    const action = plan.actions[0]!;
    expect(action.type).toBe("content.elementor-patch");
    expect(action.status).toBe("approved");
    expect(action.requiredProvider).toBe("wordpress");
    expect(action.payload).toMatchObject({
      pageId: 6,
      expectedFingerprint: "fingerprint-1",
      patch: {
        proposedContent: "New heading",
        expectedWidgetType: "heading",
      },
    });
  });

  it("keeps the document fingerprint only on the first Elementor action per page", () => {
    const heading = makePatch({
      id: "patch-heading",
      sectionId: "elementor-heading-title",
      target: {
        format: "elementor",
        elementId: "e1",
        settingsKey: "title",
        pageId: 6,
        sourceFingerprint: "fingerprint-1",
        richText: false,
      },
      sourceFingerprint: "fingerprint-1",
    });
    const body = makePatch({
      id: "patch-body",
      sectionId: "elementor-body-editor",
      target: {
        format: "elementor",
        elementId: "e2",
        settingsKey: "editor",
        pageId: 6,
        sourceFingerprint: "fingerprint-1",
        richText: true,
      },
      sourceFingerprint: "fingerprint-1",
    });

    const plan = buildExecutionPlanFromReview(
      makeSession([makeItem("APPROVE", heading), makeItem("APPROVE", body)]),
      { url: "https://example.com/?page_id=6" },
    );

    const headingAction = plan.actions.find((a) => a.id === "action-patch-heading");
    const bodyAction = plan.actions.find((a) => a.id === "action-patch-body");
    expect(headingAction!.payload.expectedFingerprint).toBe("fingerprint-1");
    expect((headingAction!.payload.patch as Record<string, unknown>).sourceFingerprint).toBe("fingerprint-1");
    expect(bodyAction!.payload.expectedFingerprint).toBeUndefined();
    expect((bodyAction!.payload.patch as Record<string, unknown>).sourceFingerprint).toBeUndefined();
    expect(bodyAction!.payload.patch).toMatchObject({ proposedContent: "New heading" });
  });

  it("uses edited content for EDIT decisions", () => {
    const patch = makePatch({
      target: {
        format: "elementor",
        elementId: "e1f2a3b4",
        settingsKey: "title",
        pageId: 6,
      },
    });

    const plan = buildExecutionPlanFromReview(
      makeSession([makeItem("EDIT", patch, { editedContent: "Human-edited heading" })]),
      { url: "https://example.com/?page_id=6" },
    );

    expect(plan.actions[0]!.payload.patch).toMatchObject({
      proposedContent: "Human-edited heading",
    });
  });

  it("never executes pending, deferred, or rejected items", () => {
    const patch = makePatch({
      target: { format: "elementor", elementId: "e1", settingsKey: "title", pageId: 6 },
    });

    const plan = buildExecutionPlanFromReview(
      makeSession([
        makeItem("REJECT", patch),
        makeItem("DEFER", patch),
        makeItem(undefined, patch),
      ]),
      { url: "https://example.com/?page_id=6" },
    );

    expect(plan.actions).toHaveLength(0);
  });

  it("maps Rank Math patches to metadata actions", () => {
    const patch = makePatch({
      id: "patch-metadata-title-1",
      sectionId: "metadata-title",
      selector: "rank-math:title",
      currentContent: "Old title",
      proposedContent: "New title",
      target: {
        format: "rank-math",
        pageId: 6,
        field: "rank_math_title",
        label: "title",
      },
    });

    const plan = buildExecutionPlanFromReview(makeSession([makeItem("APPROVE", patch)]), {
      url: "https://example.com/?page_id=6",
    });

    expect(plan.actions[0]!.type).toBe("seo.update-rank-math-meta");
    expect(plan.actions[0]!.payload).toMatchObject({
      pageId: 6,
      fields: { title: "New title" },
    });
  });

  it("omits patches with no executable provider target", () => {
    const patch = makePatch({ target: undefined });
    const plan = buildExecutionPlanFromReview(makeSession([makeItem("APPROVE", patch)]), {
      url: "https://example.com/",
    });

    expect(plan.actions).toHaveLength(0);
    expect(isExecutablePatch(patch)).toBe(false);
  });

  it("requires a page id when the target does not carry one", () => {
    const patch = makePatch({
      target: { format: "elementor", elementId: "e1", settingsKey: "title" },
    });

    const withoutPage = buildExecutionPlanFromReview(makeSession([makeItem("APPROVE", patch)]), {
      url: "https://example.com/",
    });
    const withPage = buildExecutionPlanFromReview(makeSession([makeItem("APPROVE", patch)]), {
      url: "https://example.com/?page_id=9",
      pageId: 9,
    });

    expect(withoutPage.actions).toHaveLength(0);
    expect(withPage.actions[0]!.payload.pageId).toBe(9);
  });
});
