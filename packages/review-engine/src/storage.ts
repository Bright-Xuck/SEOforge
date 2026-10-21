// @forge/review-engine
// Session persistence under projects/<project>/reviews/{active,completed}/<sessionId>.json.

import { mkdir, readFile, rename, rm, writeFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { ReviewSession, ReviewStatus } from "./types.js";

function reviewsDir(rootDir: string, projectId: string): string {
  return join(rootDir, projectId, "reviews");
}

function activeDir(rootDir: string, projectId: string): string {
  return join(reviewsDir(rootDir, projectId), "active");
}

function completedDir(rootDir: string, projectId: string): string {
  return join(reviewsDir(rootDir, projectId), "completed");
}

function indexPath(rootDir: string, projectId: string): string {
  return join(reviewsDir(rootDir, projectId), "index.json");
}

export interface ReviewIndexEntry {
  readonly id: string;
  readonly status: ReviewStatus;
  readonly createdAt: string;
  readonly approvalRate: number;
  readonly patches: number;
}

/**
 * Persist a review session. While in progress it lives under `active/`;
 * when completed it is moved to `completed/` and the index is updated.
 */
export async function saveReviewSession(
  rootDir: string,
  session: ReviewSession,
): Promise<void> {
  const targetDir = session.status === "completed" ? completedDir(rootDir, session.projectId) : activeDir(rootDir, session.projectId);
  await mkdir(targetDir, { recursive: true });
  await writeFile(join(targetDir, `${session.sessionId}.json`), JSON.stringify(session, null, 2), "utf8");
  // loadReviewSession reads active/ first. Remove the stale active copy when a
  // session is completed, otherwise callers load the pre-completion snapshot.
  if (session.status === "completed") {
    await rm(join(activeDir(rootDir, session.projectId), `${session.sessionId}.json`), { force: true });
  }
  await updateReviewIndex(rootDir, session);
}

/**
 * Load a review session from either active or completed storage.
 */
export async function loadReviewSession(
  rootDir: string,
  projectId: string,
  sessionId: string,
): Promise<ReviewSession | undefined> {
  for (const dir of [activeDir(rootDir, projectId), completedDir(rootDir, projectId)]) {
    try {
      const content = await readFile(join(dir, `${sessionId}.json`), "utf8");
      return JSON.parse(content) as ReviewSession;
    } catch {
      // try next location
    }
  }
  return undefined;
}

/**
 * List all review sessions for a project via the lightweight index.
 */
export async function listReviewSessions(
  rootDir: string,
  projectId: string,
): Promise<ReviewIndexEntry[]> {
  try {
    const content = await readFile(indexPath(rootDir, projectId), "utf8");
    return JSON.parse(content) as ReviewIndexEntry[];
  } catch {
    return [];
  }
}

/**
 * Move a completed session file from active to completed storage.
 */
export async function moveToCompleted(
  rootDir: string,
  session: ReviewSession,
): Promise<void> {
  const from = join(activeDir(rootDir, session.projectId), `${session.sessionId}.json`);
  const toDir = completedDir(rootDir, session.projectId);
  await mkdir(toDir, { recursive: true });
  const to = join(toDir, `${session.sessionId}.json`);
  try {
    await rename(from, to);
  } catch {
    // already moved or missing; rewrite to be safe
    await writeFile(to, JSON.stringify(session, null, 2), "utf8");
  }
}

/**
 * Update (or create) the project review index entry for a session.
 */
export async function updateReviewIndex(
  rootDir: string,
  session: ReviewSession,
): Promise<void> {
  const dir = reviewsDir(rootDir, session.projectId);
  await mkdir(dir, { recursive: true });
  const path = indexPath(rootDir, session.projectId);
  let entries: ReviewIndexEntry[] = [];
  try {
    const content = await readFile(path, "utf8");
    entries = JSON.parse(content) as ReviewIndexEntry[];
  } catch {
    entries = [];
  }
  const entry: ReviewIndexEntry = {
    id: session.sessionId,
    status: session.status,
    createdAt: session.createdAt,
    approvalRate: session.metrics.approvalRate,
    patches: session.patches.length,
  };
  const next = entries.filter((e) => e.id !== session.sessionId);
  next.push(entry);
  await writeFile(path, JSON.stringify(next, null, 2), "utf8");
}

export { readdir };
