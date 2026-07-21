// @forge/review-engine
// Memory event recording for review sessions (deterministic, no LLM).

import { loadMemory, saveMemory } from "@forge/memory-engine";
import type { MemoryEvent } from "@forge/memory-engine";
import type { ReviewSession } from "./types.js";

function makeEvent(
  session: ReviewSession,
  type: MemoryEvent["type"],
  payload: Record<string, unknown>,
): MemoryEvent {
  return {
    id: `${session.sessionId}-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    project: session.projectId,
    timestamp: new Date().toISOString(),
    payload: { sessionId: session.sessionId, ...payload },
  };
}

/**
 * Record review lifecycle events into the project memory store.
 * Writes: review-created, review-approved, review-rejected, review-commented, review-completed.
 */
export async function recordReviewEvents(
  rootDir: string,
  session: ReviewSession,
): Promise<void> {
  const store = await loadMemory(rootDir, session.projectId);
  store.append(makeEvent(session, "review-created", { policy: session.policy.name, items: session.items.length }));

  for (const item of session.items) {
    if (item.decision === "APPROVE") {
      store.append(makeEvent(session, "review-approved", { itemId: item.id, section: item.section }));
    } else if (item.decision === "REJECT") {
      store.append(makeEvent(session, "review-rejected", { itemId: item.id, section: item.section }));
    }
    if (item.comments.length > 0) {
      store.append(makeEvent(session, "review-commented", { itemId: item.id, comments: item.comments.length }));
    }
  }

  if (session.status === "completed") {
    store.append(
      makeEvent(session, "review-completed", {
        approved: session.summary.approved,
        rejected: session.summary.rejected,
        approvalRate: session.metrics.approvalRate,
      }),
    );
  }

  await saveMemory(rootDir, session.projectId, store);
}
