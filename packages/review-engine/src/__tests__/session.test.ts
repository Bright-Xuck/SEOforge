// @forge/review-engine session tests (Sprint 18)
// Session creation, policy application, decision flow.

import { describe, it, expect, beforeEach } from "vitest";
import { createReviewSession, decideItem, addComment, completeSession, getItem, applyPolicy } from "../index.js";
import type { ContentPatch } from "@forge/content-generation";
import type { ReviewComment, ReviewDecision } from "../types.js";

function makePatch(overrides: Partial<ContentPatch> = {}): ContentPatch {
  const now = new Date().toISOString();
  return {
    id: overrides.id ?? `patch-${Math.random().toString(36).slice(2, 7)}`,
    sectionId: overrides.sectionId ?? "hero",
    operation: overrides.operation ?? "replace",
    selector: overrides.selector ?? "h1",
    currentContent: overrides.currentContent ?? "Old Title",
    proposedContent: overrides.proposedContent ?? "New Title",
    diff: overrides.diff ?? {
      sectionId: "hero",
      current: "Old Title",
      generated: "New Title",
      changedSentences: [],
      addedEntities: [],
      removedEntities: [],
      seoScoreDelta: 0,
    },
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

describe("createReviewSession", () => {
  it("creates a session with basic fields", () => {
    const patches = [makePatch()];
    const session = createReviewSession({
      projectId: "test-project",
      createdBy: "test-user",
      patches,
    });
    expect(session.sessionId).toBeDefined();
    expect(session.projectId).toBe("test-project");
    expect(session.createdBy).toBe("test-user");
    expect(session.status).toBe("pending");
    expect(session.items).toHaveLength(1);
    expect(session.items[0].id).toBeDefined();
  });

  it("assigns consistent IDs to items", () => {
    const patches = [
      makePatch({ id: "patch-1", sectionId: "hero", currentContent: "Old Title", proposedContent: "New Title", confidence: 0.9 }),
      makePatch({ id: "patch-2", sectionId: "meta", currentContent: "Old Meta", proposedContent: "New Meta", confidence: 0.8 }),
    ];
    const session = createReviewSession({ projectId: "test-project", createdBy: "test-user", patches });
    expect(session.items[0].id).not.toBe(session.items[1].id);
    expect(session.items[0].id).toBe("patch-1");
    expect(session.items[1].id).toBe("patch-2");
  });

  it("derives severity from confidence and warnings", () => {
    const patches = [makePatch({ confidence: 0.95, warnings: [] })];
    const session = createReviewSession({ projectId: "test-project", createdBy: "test-user", patches });
    expect(session.items[0].severity).toBe("safe");
  });

  it("derives high severity for items with warnings", () => {
    const patches = [makePatch({ confidence: 0.95, warnings: ["Potential issue"] })];
    const session = createReviewSession({ projectId: "test-project", createdBy: "test-user", patches });
    expect(session.items[0].severity).toBe("high");
  });
});

describe("decideItem", () => {
  let patches: ContentPatch[];

  beforeEach(() => {
    patches = [makePatch()];
  });

  it("can approve an item", () => {
    const session = createReviewSession({ projectId: "test", createdBy: "test", patches });
    const itemId = session.items[0].id;
    const updated = decideItem(session, itemId, "APPROVE", "reviewer");
    expect(updated.items[0].decision).toBe("APPROVE");
    expect(updated.items[0].decidedBy).toBe("reviewer");
  });

  it("can reject an item", () => {
    const session = createReviewSession({ projectId: "test", createdBy: "test", patches });
    const itemId = session.items[0].id;
    const updated = decideItem(session, itemId, "REJECT", "reviewer");
    expect(updated.items[0].decision).toBe("REJECT");
    expect(updated.items[0].decidedBy).toBe("reviewer");
  });

  it("can edit an item with content", () => {
    const session = createReviewSession({ projectId: "test", createdBy: "test", patches });
    const itemId = session.items[0].id;
    const updated = decideItem(session, itemId, "EDIT", "reviewer", "Edited content");
    expect(updated.items[0].decision).toBe("EDIT");
    expect(updated.items[0].decidedBy).toBe("reviewer");
    expect(updated.items[0].editedContent).toBe("Edited content");
  });

  it("can skip an item", () => {
    const session = createReviewSession({ projectId: "test", createdBy: "test", patches });
    const itemId = session.items[0].id;
    const updated = decideItem(session, itemId, "SKIP", "reviewer");
    expect(updated.items[0].decision).toBe("SKIP");
  });

  it("can defer an item", () => {
    const session = createReviewSession({ projectId: "test", createdBy: "test", patches });
    const itemId = session.items[0].id;
    const updated = decideItem(session, itemId, "DEFER", "reviewer");
    expect(updated.items[0].decision).toBe("DEFER");
  });
});

describe("applyPolicy", () => {
  it("auto-approves safe items with balanced policy", () => {
    const patches = [makePatch({ confidence: 0.9, warnings: [] })];
    const session = createReviewSession({
      projectId: "test",
      createdBy: "test",
      patches,
      policy: { name: "balanced" },
    });
    const updated = applyPolicy(session);
    expect(updated.items[0].decision).toBe("APPROVE");
    expect(updated.items[0].decidedBy).toBe("policy");
  });

  it("does not auto-approve low confidence items with balanced policy", () => {
    const patches = [makePatch({ confidence: 0.3, warnings: [] })];
    const session = createReviewSession({
      projectId: "test",
      createdBy: "test",
      patches,
      policy: { name: "balanced" },
    });
    const updated = applyPolicy(session);
    expect(updated.items[0].decision).toBeUndefined();
  });
});

describe("addComment", () => {
  it("adds a session-level comment", () => {
    const patches = [makePatch()];
    const session = createReviewSession({ projectId: "test", createdBy: "test", patches });
    const comment: ReviewComment = {
      id: "c1",
      author: "reviewer",
      timestamp: new Date().toISOString(),
      message: "Test comment",
      target: "review",
    };
    const updated = addComment(session, comment);
    expect(updated.comments).toHaveLength(1);
    expect(updated.comments[0].message).toBe("Test comment");
    expect(updated.comments[0].author).toBe("reviewer");
  });

  it("adds an item-level comment", () => {
    const patches = [makePatch()];
    const session = createReviewSession({ projectId: "test", createdBy: "test", patches });
    const itemId = session.items[0].id;
    const comment: ReviewComment = {
      id: "c1",
      author: "reviewer",
      timestamp: new Date().toISOString(),
      message: "Item comment",
      target: "patch",
      targetId: itemId,
    };
    const updated = addComment(session, comment, itemId);
    expect(updated.items[0].comments).toHaveLength(1);
    expect(updated.items[0].comments[0].message).toBe("Item comment");
  });
});

describe("completeSession", () => {
  it("completes an active session", () => {
    const patches = [makePatch()];
    const session = createReviewSession({ projectId: "test", createdBy: "test", patches });
    const completed = completeSession(session);
    expect(completed.status).toBe("completed");
  });
});

describe("getItem", () => {
  it("retrieves an item by ID", () => {
    const patches = [makePatch()];
    const session = createReviewSession({ projectId: "test", createdBy: "test", patches });
    const item = getItem(session, session.items[0].id);
    expect(item).toBeDefined();
    expect(item?.id).toBe(session.items[0].id);
  });

  it("returns undefined for non-existent ID", () => {
    const patches = [makePatch()];
    const session = createReviewSession({ projectId: "test", createdBy: "test", patches });
    const item = getItem(session, "non-existent-id");
    expect(item).toBeUndefined();
  });
});