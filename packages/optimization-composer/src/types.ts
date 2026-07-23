/**
 * Core types for the Optimization Composer.
 */

export type PatchPriority = "critical" | "high" | "medium" | "low";

export interface OptimizationGoal {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly bundleId: string;
}

export interface PatchBundle {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly goalId?: string;
  readonly patches: ContentPatchRef[];
  readonly createdAt: string;
}

export interface ContentPatchRef {
  readonly id: string;
  readonly section: string;
  readonly priority: PatchPriority;
  readonly goalId?: string;
  readonly dependencies: string[];
  readonly selector: string;
}

export interface PatchGraph {
  readonly nodes: Map<string, PatchNode>;
  readonly edges: PatchEdge[];
}

export interface PatchNode {
  readonly id: string;
  readonly patch: ContentPatchRef;
  readonly dependents: string[]; // patches that depend on this one
  readonly dependencies: string[]; // patches this one depends on
}

export interface PatchEdge {
  readonly from: string;
  readonly to: string;
}

export interface ConflictResult {
  readonly hasConflict: boolean;
  readonly conflicts: PatchConflict[];
}

export interface PatchConflict {
  readonly section: string;
  readonly selector: string;
  readonly patchIds: string[];
  readonly description: string;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: ValidationError[];
  readonly warnings: string[];
}

export interface ValidationError {
  readonly patchIds: string[];
  readonly message: string;
  readonly type: "conflict" | "missing_dependency" | "circular_dependency" | "invalid_goal" | "invalid_priority";
}

export interface OptimizationPreview {
  readonly title: string;
  readonly estimatedSEOImpact: "high" | "medium" | "low" | "none";
  readonly estimatedUXImpact: "high" | "medium" | "low" | "none";
  readonly estimatedContentQuality: "high" | "medium" | "low" | "none";
  readonly expectedRankingImprovement: string;
  readonly affectedSections: string[];
  readonly warningCount: number;
  readonly patchCount: number;
  readonly deterministic: true;
}

export interface ComposedPlan {
  readonly bundles: PatchBundle[];
  readonly graph: PatchGraph;
  readonly executionOrder: string[]; // topologically sorted patch IDs
  readonly preview: OptimizationPreview;
  readonly conflicts: PatchConflict[];
  readonly priorities: Map<string, PatchPriority>;
  readonly validationErrors?: ValidationError[];
  readonly validationWarnings?: string[];
}

export type PatchPriorityRank = Record<PatchPriority, number>;

export const PRIORITY_RANK: PatchPriorityRank = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export interface RollbackGroup {
  readonly id: string;
  readonly bundleId: string;
  readonly name: string;
  readonly patches: string[];
  readonly timestamp: string;
}