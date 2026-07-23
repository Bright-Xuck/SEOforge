// @forge/ai-engine/session
// AI Session management for tracking and chaining AI requests.

import { randomUUID } from "node:crypto";
import type { AISession, AISessionContext } from "./types.js";

export class SessionManager {
  private sessions: Map<string, AISession> = new Map();

  create(overrides?: Partial<AISession>): AISession {
    const now = Date.now();
    const session: AISession = {
      id: overrides?.id ?? randomUUID(),
      projectId: overrides?.projectId,
      agentId: overrides?.agentId,
      missionId: overrides?.missionId,
      createdAt: overrides?.createdAt ?? now,
      updatedAt: overrides?.updatedAt ?? now,
      status: overrides?.status ?? "active",
      metadata: overrides?.metadata,
    };
    this.sessions.set(session.id, session);
    return session;
  }

  get(id: string): AISession | undefined {
    return this.sessions.get(id);
  }

  setStatus(id: string, status: AISession["status"]): AISession {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error(`Session not found: ${id}`);
    }
    const updated: AISession = { ...session, status, updatedAt: Date.now() };
    this.sessions.set(id, updated);
    return updated;
  }

  updateMetadata(id: string, metadata: Record<string, string>): AISession {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error(`Session not found: ${id}`);
    }
    const updated: AISession = {
      ...session,
      metadata: { ...session.metadata, ...metadata },
      updatedAt: Date.now(),
    };
    this.sessions.set(id, updated);
    return updated;
  }

  getByProject(projectId: string): AISession[] {
    return Array.from(this.sessions.values()).filter(
      (s) => s.projectId === projectId,
    );
  }

  getByMission(missionId: string): AISession[] {
    return Array.from(this.sessions.values()).filter(
      (s) => s.missionId === missionId,
    );
  }

  getActive(): AISession[] {
    return Array.from(this.sessions.values()).filter(
      (s) => s.status === "active",
    );
  }

  complete(id: string): AISession {
    return this.setStatus(id, "completed");
  }

  fail(id: string): AISession {
    return this.setStatus(id, "failed");
  }

  cancel(id: string): AISession {
    return this.setStatus(id, "cancelled");
  }

  buildContext(session: AISession, data?: Partial<AISessionContext>): AISessionContext {
    return {
      session,
      projectProfile: data?.projectProfile,
      knowledgeGraph: data?.knowledgeGraph,
      memoryTimeline: data?.memoryTimeline,
      mission: data?.mission,
      strategy: data?.strategy,
      pageDNA: data?.pageDNA,
      section: data?.section,
      brandProfile: data?.brandProfile,
      competitorSnapshot: data?.competitorSnapshot,
      reviewSummary: data?.reviewSummary,
      previousApprovedPatches: data?.previousApprovedPatches,
    };
  }

  clear(): void {
    this.sessions.clear();
  }
}