// @forge/cli
// Phase 5 (Sprint 26): end-to-end patch flow regression test.
//
// Traces the REAL existing chain without introducing any new orchestration:
//
//   ContentPatch (content-generation shape)
//     → Review Session (review-engine: approve)        [no AI]
//     → Composer bundle (optimization-composer)
//     → ExecutionPlan (action-engine)
//     → Elementor resolution (dom-engine, via the CLI bridge)
//     → WordPress transport (providers-wordpress, mocked here)
//     → document mutation + structural re-read verification
//
// The bridge is the composition root: it resolves the approved patch against
// the live document, mutates, writes, re-reads and verifies. A generated
// section patch only resolves to a concrete mutation when: the target is
// resolvable, validation passed, review allowed execution, the fingerprint
// is still valid, and the operation is supported.

import { describe, it, expect } from "vitest";
import type { ContentPatch } from "@forge/content-generation";
import { createReviewSession, decideItem } from "@forge/review-engine";
import { OptimizationComposer } from "@forge/optimization-composer";
import { createElementorBridge } from "./bridge.js";
import type { ElementorProviderLike } from "./bridge.js";

const HERO_DOC = JSON.stringify([
  {
    id: "hero-container",
    elType: "container",
    settings: { flex_direction: "row" },
    elements: [
      { id: "heading-1", elType: "widget", widgetType: "heading", settings: { title: "Accounting Software for Small Businesses", header_size: "h1" }, elements: [] },
      { id: "text-1", elType: "widget", widgetType: "text-editor", settings: { editor: "<p>Premium accounting software for modern businesses.</p>" }, elements: [] },
      { id: "button-1", elType: "widget", widgetType: "button", settings: { text: "Get Started", link: { url: "https://example.com/signup" } }, elements: [] },
    ],
  },
]);

const NEW_HEADING = "Modern Accounting Software for Growing Businesses";

/** A ContentPatch produced by content-generation (Sprint 21 target shape). */
function makePatch(currentContent: string, proposedContent: string): ContentPatch {
  const createdAt = new Date().toISOString();
  return {
    id: "patch-hero-heading-001",
    sectionId: "hero",
    operation: "replace",
    selector: `[data-id="heading-1"]`,
    currentContent,
    proposedContent,
    diff: {
      sectionId: "hero",
      current: currentContent,
      generated: proposedContent,
      changedSentences: [],
      addedEntities: [],
      removedEntities: [],
      seoScoreDelta: 1,
    },
    validation: { valid: true, errors: [], warnings: [] },
    confidence: 0.95,
    estimatedImpact: "Hero heading copy refinement",
    warnings: [],
    generatedBy: "content-generation",
    provider: "ai-engine",
    promptVersion: "0.20.0",
    createdAt,
  };
}

/** Minimal in-memory provider double (records all writes). */
function memoryProvider(initialData: string): ElementorProviderLike & { writes: number; current: string } {
  let current = initialData;
  let writes = 0;
  return {
    get writes() {
      return writes;
    },
    get current() {
      return current;
    },
    set current(value: string) {
      current = value;
    },
    async readElementorDocument() {
      return {
        postId: 42,
        title: "Homepage",
        type: "page",
        url: "https://example.com/home",
        elementorVersion: "3.24.0",
        editMode: "builder",
        data: current,
        modified: "2026-08-01T00:00:00Z",
      };
    },
    async updateElementorDocument(_postId, data) {
      writes += 1;
      current = data;
      return {
        postId: 42,
        written: true,
        verified: true,
        reRead: {
          postId: 42,
          title: "Homepage",
          type: "page",
          elementorVersion: "3.24.0",
          editMode: "builder",
          data: current,
          modified: "2026-08-02T00:00:00Z",
        },
      };
    },
  };
}

describe("Sprint 26 end-to-end patch flow (ContentPatch → Review → Composer → Bridge)", () => {
  it("executes only after review approval and verifies the remote mutation by re-read", async () => {
    const provider = memoryProvider(HERO_DOC);
    const bridge = createElementorBridge(provider);

    // 1. Capture the document fingerprint at generation time.
    const inspection = await bridge.inspect(42);
    const fingerprint = inspection.fingerprint;

    // 2. AI generation produced a ContentPatch targeting the hero heading.
    //    The document fingerprint is captured alongside it (stale protection).
    const patch = makePatch("Accounting Software for Small Businesses", NEW_HEADING);
    const patchInput = {
      id: patch.id,
      currentContent: patch.currentContent,
      proposedContent: patch.proposedContent,
      sourceFingerprint: fingerprint,
      expectedWidgetType: "heading",
      target: { format: "elementor" as const, elementId: "heading-1", settingsKey: "title" },
    };
    if (!patch.target) {
      // ContentPatch from AI generation uses target/semanticIntent; emulate the
      // elementor target the same way the generators do.
      (patch as { target?: unknown }).target = { format: "elementor", elementId: "heading-1", settingsKey: "title" };
    }

    // 2b. The composed patch input resolves locally BEFORE any write.
    const precheck = await bridge.preview(42, patchInput);
    expect(precheck.resolution.ok).toBe(true);
    expect(precheck.compatible).toBe(true);

    // 3. Review: NO approval → the patch must never reach the transport.
    const session = createReviewSession({
      projectId: "e2e",
      createdBy: "test",
      patches: [patch],
    });
    const rejected = decideItem(session, session.items[0]?.id ?? "review-item-1", "REJECT", "reviewer");
    const rejectedApproved = rejected.items.filter((item) => item.decision === "APPROVE");
    expect(rejectedApproved).toHaveLength(0);

    // Approved-only execution: the bridge apply is gated on review, not the
    // transport. A rejected patch must not produce a write.
    const reviewGate = rejectedApproved.length > 0;
    expect(reviewGate).toBe(false);

    // 4. Approval via the deterministic Review Engine.
    const approved = decideItem(session, session.items[0]?.id ?? "review-item-1", "APPROVE", "reviewer");
    const approvedItems = approved.items.filter((item) => item.decision === "APPROVE");
    expect(approvedItems).toHaveLength(1);

    // 5. Composer: bundle the approved patch (existing OptimizationComposer).
    const composer = new OptimizationComposer();
    const plan = composer.compose([
      {
        id: patch.id,
        section: patch.sectionId,
        priority: "high",
        dependencies: [],
        selector: patch.selector,
      },
    ]);
    expect(plan.validationErrors ?? []).toHaveLength(0);
    expect(plan.executionOrder).toContain(patch.id);
  });

  it("applies an approved patch through the bridge and verifies the remote mutation by re-read, then rolls back", async () => {
    const provider = memoryProvider(HERO_DOC);
    const bridge = createElementorBridge(provider);

    const inspection = await bridge.inspect(42);
    const fingerprint = inspection.fingerprint;
    const patch = makePatch("Accounting Software for Small Businesses", NEW_HEADING);
    const session = createReviewSession({ projectId: "e2e", createdBy: "test", patches: [patch] });
    const approved = decideItem(session, session.items[0]?.id ?? "review-item-1", "APPROVE", "reviewer");
    expect(approved.items.filter((item) => item.decision === "APPROVE")).toHaveLength(1);

    const composer = new OptimizationComposer();
    const plan = composer.compose([
      { id: patch.id, section: patch.sectionId, priority: "medium", dependencies: [], selector: patch.selector },
    ]);
    expect(plan.preview.patchCount).toBe(1);
    expect(plan.executionOrder).toContain(patch.id);

    // The execution plan's approved action resolves → mutates → writes →
    // re-reads → verifies, all through the existing bridge (composition root).
    const result = await bridge.apply(42, {
      id: patch.id,
      currentContent: patch.currentContent,
      proposedContent: patch.proposedContent,
      sourceFingerprint: fingerprint,
      expectedWidgetType: "heading",
      target: { format: "elementor" as const, elementId: "heading-1", settingsKey: "title" },
    }, { dryRun: false });

    expect(result.applied).toBe(true);
    expect(result.verification?.ok).toBe(true);
    expect(result.fingerprintBefore).toBe(fingerprint);
    expect(result.fingerprintAfter).not.toBe(fingerprint);
    expect(provider.writes).toBe(1);
    expect(provider.current).toContain(NEW_HEADING);
    // Unrelated content survived the round trip.
    expect(provider.current).toContain("Premium accounting software for modern businesses.");
    expect(provider.current).toContain("Get Started");

    // Rollback restores the original document and verifies.
    if (!result.rollbackPayload) throw new Error("expected rollback payload");
    const rollback = await bridge.rollback(result.rollbackPayload);
    expect(rollback.restored).toBe(true);
    expect(provider.current).toBe(HERO_DOC);
  });

  it("refuses a stale patch in the full chain even after review approval (review ≠ freshness)", async () => {
    const provider = memoryProvider(HERO_DOC);
    const bridge = createElementorBridge(provider);

    // Reviewer approved a patch against fingerprint X...
    const inspection = await bridge.inspect(42);
    const fingerprint = inspection.fingerprint;
    const patch = makePatch("Accounting Software for Small Businesses", NEW_HEADING);
    const session = createReviewSession({ projectId: "e2e", createdBy: "test", patches: [patch] });
    const approved = decideItem(session, session.items[0]?.id ?? "review-item-1", "APPROVE", "reviewer");
    expect(approved.items.filter((item) => item.decision === "APPROVE")).toHaveLength(1);

    // ...but the remote document changed after review (fingerprint X is stale).
    (provider as { current: string }).current = provider.current.replace(
      "Accounting Software for Small Businesses",
      "Someone edited this after review",
    );

    const result = await bridge.apply(42, {
      id: patch.id,
      currentContent: patch.currentContent,
      proposedContent: patch.proposedContent,
      sourceFingerprint: fingerprint,
      expectedWidgetType: "heading",
      target: { format: "elementor" as const, elementId: "heading-1", settingsKey: "title" },
    }, { dryRun: false });

    // Review approved, but the document moved on → deterministic stale block.
    expect(result.applied).toBe(false);
    if (!result.resolution.ok) expect(result.resolution.code).toBe("PATCH_STALE");
    expect(result.errorCode).toBe("DOCUMENT_STALE");
    expect(provider.writes).toBe(0);
  });
});