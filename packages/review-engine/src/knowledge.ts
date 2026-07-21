// @forge/review-engine
// Per-project knowledge tracking for review sessions (deterministic).

import { loadKnowledge, saveKnowledge, updateKnowledgeGraph } from "@forge/knowledge-engine";
import type { ReviewSession } from "./types.js";

/**
 * Update the project knowledge graph with review statistics derived from a session.
 */
export async function updateReviewKnowledge(
  rootDir: string,
  session: ReviewSession,
): Promise<void> {
  const graph = await loadKnowledge(rootDir, session.projectId);

  const rejectedSections = session.items
    .filter((item) => item.decision === "REJECT")
    .map((item) => item.section);
  const editedSections = session.items
    .filter((item) => item.decision === "EDIT")
    .map((item) => item.section);

  const reviewStats = {
    averageApprovalRate: session.metrics.approvalRate,
    preferredReviewStyle: session.policy.name,
    commonRejectedPatterns: [...new Set(rejectedSections)],
    frequentlyEditedSections: [...new Set(editedSections)],
  };

  const updated = updateKnowledgeGraph(graph, { reviewStats });
  await saveKnowledge(rootDir, updated);
}
