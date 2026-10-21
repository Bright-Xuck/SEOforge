// @forge/optimization-orchestrator
// Review → execution translation.
//
// The composer produces a dependency/bundle plan, not executable actions. This
// module is the single seam that turns reviewed+approved patches into the
// provider-independent ActionPlan consumed by the Execution Engine. It never
// bypasses review: only APPROVE/EDIT items become actions, and only those
// actions are marked approved.

import type { ExecutionPlan, Action, ActionType, RiskLevel } from "@forge/action-engine";
import type { Priority } from "@forge/core";
import { buildExecutionPlan } from "@forge/action-engine";
import type { ReviewItem, ReviewSession } from "@forge/review-engine";
import type { ContentPatch } from "@forge/content-generation";

export interface ReviewExecutionOptions {
  /** Required for targets that do not carry a provider page id. */
  readonly pageId?: number;
  readonly url: string;
}

/**
 * Build an ExecutionPlan from a completed review session.
 */
export function buildExecutionPlanFromReview(
  session: ReviewSession,
  options: ReviewExecutionOptions,
): ExecutionPlan {
  const approved = session.items.filter(
    (item) =>
      (item.decision === "APPROVE" || item.decision === "EDIT") &&
      // A patch that failed deterministic validation must never be written,
      // even when a bulk `--apply` auto-approved pending items. A human EDIT
      // is the only path that may replace invalid generated content; the
      // execution engine still resolves the edited content at write time.
      (item.validation.valid || item.editedContent !== undefined),
  );

  const actions = approved
    .map((item) => toAction(item, options))
    .filter((action): action is Action => action !== null);

  const plan = buildExecutionPlan(actions, options.url);
  // Apply the batch fingerprint rule to the plan's final action order so a
  // future ordering change in buildExecutionPlan cannot strip the guard from
  // the action that actually runs first.
  return { ...plan, actions: withBatchFingerprints(plan.actions) };
}

/**
 * A review session captures one document fingerprint, but the first Elementor
 * write in a batch necessarily changes that document. Keeping the captured
 * fingerprint on later actions would make every action after the first fail
 * with PATCH_STALE even though each target is still unchanged.
 *
 * Keep the document-level guard on the first Elementor action per page and
 * rely on each later patch's per-target `currentContent`/widget type checks.
 * The execution engine skips the rest of a resource's actions if one fails, so
 * a failed first write cannot be followed by unguarded siblings.
 */
function withBatchFingerprints(actions: Action[]): Action[] {
  const seenPages = new Set<number>();
  return actions.map((action) => {
    if (action.type !== "content.elementor-patch") return action;
    const payload = action.payload as {
      pageId?: number;
      expectedFingerprint?: string;
      patch?: Record<string, unknown>;
    };
    if (typeof payload.pageId !== "number") return action;
    if (!seenPages.has(payload.pageId)) {
      seenPages.add(payload.pageId);
      return action;
    }
    return {
      ...action,
      payload: {
        ...payload,
        expectedFingerprint: undefined,
        patch: payload.patch
          ? { ...payload.patch, sourceFingerprint: undefined }
          : payload.patch,
      },
    };
  });
}

function toAction(item: ReviewItem, options: ReviewExecutionOptions): Action | null {
  const patch = item.patch;
  const content = item.editedContent ?? patch.proposedContent;
  const target = patch.target;

  if (target?.format === "elementor") {
    const pageId = options.pageId ?? target.pageId;
    if (typeof pageId !== "number") return null;
    return {
      id: `action-${patch.id}`,
      recommendationId: patch.id,
      findingId: "content.update-content" as Action["findingId"],
      type: "content.elementor-patch" as ActionType,
      title: `Update ${patch.sectionId}`,
      description: `Replace Elementor ${target.elementId}.${target.settingsKey} with reviewed content`,
      priority: toPriority(item.severity),
      risk: toRisk(item.severity),
      automatable: true,
      requiresApproval: true,
      rollbackSupported: true,
      estimatedDuration: "1 minute",
      requiredProvider: "wordpress",
      payload: {
        pageId,
        expectedFingerprint: patch.sourceFingerprint ?? target.sourceFingerprint,
        patch: {
          id: patch.id,
          sectionId: patch.sectionId,
          currentContent: patch.currentContent,
          proposedContent: content,
          target,
          sourceFingerprint: patch.sourceFingerprint ?? target.sourceFingerprint,
          expectedWidgetType: target.expectedWidgetType,
        },
      },
      status: "approved",
    };
  }

  if (target?.format === "rank-math") {
    const pageId = options.pageId ?? target.pageId;
    if (typeof pageId !== "number") return null;
    return {
      id: `action-${patch.id}`,
      recommendationId: patch.id,
      findingId: "seo.update-meta-description" as Action["findingId"],
      type: "seo.update-rank-math-meta" as ActionType,
      title: `Update Rank Math ${target.label}`,
      description: `Set ${target.field} to the reviewed value`,
      priority: toPriority(item.severity),
      risk: toRisk(item.severity),
      automatable: true,
      requiresApproval: true,
      rollbackSupported: true,
      estimatedDuration: "1 minute",
      requiredProvider: "wordpress",
      payload: {
        pageId,
        pageUrl: options.url,
        fields: { [target.label]: content },
      },
      status: "approved",
    };
  }

  // Unsupported target: never guess. The item stays visible in the review
  // session but cannot be executed automatically.
  return null;
}

function toPriority(severity: ReviewItem["severity"]): Priority {
  switch (severity) {
    case "critical":
    case "high":
      return "high";
    case "medium":
      return "medium";
    default:
      return "low";
  }
}

function toRisk(severity: ReviewItem["severity"]): RiskLevel {
  switch (severity) {
    case "critical":
      return "critical";
    case "high":
      return "high";
    case "medium":
      return "moderate";
    default:
      return "safe";
  }
}

/** Exposed for tests and callers that need to know if a patch is executable. */
export function isExecutablePatch(patch: ContentPatch): boolean {
  return patch.target?.format === "elementor" || patch.target?.format === "rank-math";
}
