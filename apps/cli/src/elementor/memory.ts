// @forge/cli/elementor-memory (Sprint 26)
//
// Observability for Elementor writes through the EXISTING event-sourced memory
// system (@forge/memory-engine). No new logging system is introduced: this
// module builds MemoryEvent payloads (types "elementor-write" and
// "elementor-rollback" already exist in the memory event union) and appends
// them through the existing loadMemory/saveMemory flow.
//
// Never stored: API keys, WordPress passwords, authentication headers, secrets.

import { loadMemory, saveMemory } from "@forge/memory-engine";
import type { ElementorWriteResult, ElementorRollbackResult } from "./bridge.js";
import type { ElementorRollbackPayload } from "./bridge.js";

const MEMORY_ROOT_DIR = "projects";
const DEFAULT_PROJECT = "default";

export interface ElementorWriteMemoryInput {
  readonly result: ElementorWriteResult;
  readonly provider: string;
  readonly patchIds: string[];
  readonly siteUrl?: string;
}

/**
 * Build a memory event payload for an Elementor write lifecycle.
 * Only lifecycle metadata — never credentials.
 */
export function createElementorWriteMemoryEvent(input: ElementorWriteMemoryInput) {
  const { result, provider, patchIds, siteUrl } = input;
  return {
    id: `elementor-write-${result.executionId}`,
    type: "elementor-write" as const,
    project: DEFAULT_PROJECT,
    timestamp: new Date().toISOString(),
    payload: {
      operation: result.dryRun ? "dry-run" : "apply",
      provider,
      siteUrl,
      targetPage: result.postId,
      executionId: result.executionId,
      patchIds,
      applied: result.applied,
      rolledBack: result.rolledBack,
      success: result.applied,
      verificationStatus: result.verification ? (result.verification.ok ? "verified" : "failed") : "skipped",
      fingerprintBefore: result.fingerprintBefore,
      fingerprintAfter: result.fingerprintAfter,
      changedTargets: result.mutation?.diffs.map((diff) => `${diff.elementId}.${diff.settingsKey}`) ?? [],
      errorCode: result.errorCode,
      message: result.message,
    },
  };
}

export interface ElementorRollbackMemoryInput {
  readonly payload: ElementorRollbackPayload;
  readonly result: ElementorRollbackResult;
  readonly provider: string;
  readonly executionId?: string;
  readonly siteUrl?: string;
}

/**
 * Build a memory event payload for an Elementor rollback lifecycle.
 */
export function createElementorRollbackMemoryEvent(input: ElementorRollbackMemoryInput) {
  const { payload, result, provider, executionId, siteUrl } = input;
  return {
    id: `elementor-rollback-${payload.postId}-${Date.now()}`,
    type: "elementor-rollback" as const,
    project: DEFAULT_PROJECT,
    timestamp: new Date().toISOString(),
    payload: {
      operation: "rollback",
      provider,
      siteUrl,
      targetPage: payload.postId,
      executionId: executionId ?? payload.executionId,
      patchIds: payload.patchId ? [payload.patchId] : [],
      restored: result.restored,
      refused: result.refused,
      success: result.restored,
      verificationStatus: result.restored ? "verified" : "failed",
      fingerprintOriginal: payload.originalFingerprint,
      fingerprintApplied: payload.appliedFingerprint,
      fingerprintFinal: result.finalFingerprint,
      message: result.message,
    },
  };
}

/**
 * Record an Elementor write event through the existing MemoryStore.
 * Best-effort: observability failures never mask the operation result.
 */
export async function recordElementorWriteEvent(event: ReturnType<typeof createElementorWriteMemoryEvent>): Promise<void> {
  try {
    const store = await loadMemory(MEMORY_ROOT_DIR, event.project);
    store.append(event);
    await saveMemory(MEMORY_ROOT_DIR, event.project, store);
  } catch {
    // Memory is observability only — never fail the operation for it.
  }
}

/**
 * Record an Elementor rollback event through the existing MemoryStore.
 */
export async function recordElementorRollbackEvent(event: ReturnType<typeof createElementorRollbackMemoryEvent>): Promise<void> {
  try {
    const store = await loadMemory(MEMORY_ROOT_DIR, event.project);
    store.append(event);
    await saveMemory(MEMORY_ROOT_DIR, event.project, store);
  } catch {
    // Memory is observability only — never fail the operation for it.
  }
}