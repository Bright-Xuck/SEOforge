// @forge/action-engine/types
// Action and execution models for Sprint 5.

import type { FindingId, Priority } from "@forge/core";

// Action status levels
export type ActionStatus = "pending" | "approved" | "running" | "completed" | "failed" | "cancelled";

// Risk levels for actions
export type RiskLevel = "safe" | "moderate" | "high" | "critical";

// Action types for different capability categories
export type ActionType =
  | "seo.add-title"
  | "seo.update-title"
  | "seo.add-meta-description"
  | "seo.update-meta-description"
  | "seo.add-canonical"
  | "seo.add-h1"
  | "seo.fix-heading-hierarchy"
  | "seo.remove-noindex"
  | "seo.update-slug"
  | "accessibility.add-alt"
  | "accessibility.update-alt"
  | "metadata.add-og"
  | "technical.add-jsonld"
  | "content.update-content"
  | "content.add-internal-link";

// Action status for approval queue
export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired";

/**
 * An action represents a concrete operation that can be executed.
 */
export interface Action {
  readonly id: string;
  readonly recommendationId: string;
  readonly findingId: FindingId;
  readonly type: ActionType;
  readonly title: string;
  readonly description: string;
  readonly priority: Priority;
  readonly risk: RiskLevel;
  readonly automatable: boolean;
  readonly requiresApproval: boolean;
  readonly rollbackSupported: boolean;
  readonly estimatedDuration: string;
  readonly requiredProvider: string;
  readonly payload: Record<string, unknown>;
  readonly status: ActionStatus;
}

/**
 * Risk summary for execution plan.
 */
export interface RiskSummary {
  readonly safe: number;
  readonly moderate: number;
  readonly high: number;
  readonly critical: number;
}

/**
 * Action summary for execution plan.
 */
export interface ActionSummary {
  readonly total: number;
  readonly automatable: number;
  readonly requiresApproval: number;
  readonly byRisk: RiskSummary;
}

/**
 * Execution plan groups actions with summary and timing.
 */
export interface ExecutionPlan {
  readonly url: string;
  readonly generatedAt: string;
  readonly actions: Action[];
  readonly approvalQueue: string[]; // action IDs requiring approval
  readonly summary: ActionSummary;
  readonly estimatedDuration: string;
  readonly riskSummary: RiskSummary;
}

/**
 * A single step in the ActionStatus enum.
 */
export interface ApprovalItem {
  readonly actionId: string;
  readonly reason: string;
  readonly risk: RiskLevel;
  readonly preview?: string;
  readonly createdAt: string;
  readonly status: ApprovalStatus;
}

/**
 * Project context stores site-level settings.
 */
export interface ProjectContext {
  readonly projectId: string;
  readonly siteName: string;
  readonly industry?: string;
  readonly targetAudience?: string;
  readonly brandVoice?: string;
  readonly languages: string[];
  readonly brandGuidelines?: string;
  readonly products: string[];
  readonly services: string[];
  readonly competitors: string[];
  readonly primaryKeywords: string[];
  readonly secondaryKeywords: string[];
  readonly notes: string;
  readonly lastUpdated: string;
}

/**
 * Website memory tracks history for a website.
 */
export interface WebsiteMemory {
  readonly crawlHistory: Array<{ timestamp: string; url: string }>;
  readonly analysisHistory: Array<{ timestamp: string; reportId: string }>;
  readonly recommendationHistory: Array<{ timestamp: string; recommendationId: string }>;
  readonly executionHistory: Array<{ timestamp: string; actionId: string }>;
  readonly approvedChanges: Array<{ timestamp: string; actionId: string }>;
  readonly rejectedChanges: Array<{ timestamp: string; actionId: string; reason?: string }>;
}