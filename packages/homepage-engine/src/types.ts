import type { Finding, WebsiteSnapshot, WriteOperation, WriteResult } from "@forge/core";
import type { ProjectProfile, MemorySummaryLike, KnowledgeGraph } from "@forge/knowledge-engine";

export type HomepageType = "front-page" | "static-homepage" | "blog-homepage" | "store-homepage" | "wordpress-front-page" | "unknown";

export interface HomepageContentSection {
  readonly kind: "hero" | "benefits" | "features" | "testimonials" | "faq" | "cta" | "footer";
  readonly present: boolean;
  readonly evidence: string[];
  readonly confidence: number;
}

export interface HomepageContentMap {
  readonly hero: HomepageContentSection;
  readonly benefits: HomepageContentSection;
  readonly features: HomepageContentSection;
  readonly testimonials: HomepageContentSection;
  readonly faq: HomepageContentSection;
  readonly cta: HomepageContentSection;
  readonly footer: HomepageContentSection;
}

export interface HomepageContext {
  readonly project: string;
  readonly projectProfile: ProjectProfile;
  readonly knowledge: KnowledgeGraph;
  readonly memorySummary: MemorySummaryLike;
  readonly siteUrl: string;
  readonly snapshot: WebsiteSnapshot;
  readonly homepageType: HomepageType;
  readonly contentMap: HomepageContentMap;
}

export interface HomepageAnalysis {
  readonly url: string;
  readonly analyzedAt: string;
  readonly homepageType: HomepageType;
  readonly contentMap: HomepageContentMap;
  readonly findings: Finding[];
  readonly summary: {
    readonly total: number;
    readonly bySeverity: Record<string, number>;
    readonly score: number;
    readonly readabilityScore: number;
  };
}

export interface HomepageOptimizationAction {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly priority: "low" | "medium" | "high" | "critical";
  readonly risk: "safe" | "moderate" | "high" | "critical";
  readonly estimatedImpact: string;
  readonly approvalRequired: boolean;
  readonly currentValue: unknown;
  readonly proposedValue: unknown;
  readonly reason: string;
  readonly affectedComponent: string;
  readonly executionStatus: "pending" | "preview" | "approved" | "executed" | "rolled-back";
  readonly writeOperation?: WriteOperation;
}

export interface HomepageOptimizationPlan {
  readonly homepage: HomepageContext;
  readonly analysis: HomepageAnalysis;
  readonly generatedAt: string;
  readonly actions: HomepageOptimizationAction[];
  readonly summary: {
    readonly totalActions: number;
    readonly approvalRequired: number;
    readonly byPriority: Record<"low" | "medium" | "high" | "critical", number>;
  };
}

export interface HomepagePreviewItem {
  readonly actionId: string;
  readonly currentValue: unknown;
  readonly proposedValue: unknown;
  readonly reason: string;
  readonly risk: string;
  readonly affectedComponent: string;
  readonly executionStatus: "preview" | "approved" | "executed" | "rolled-back";
}

export interface HomepageOptimizationSummary {
  readonly score: number;
  readonly readabilityScore: number;
  readonly totalFindings: number;
  readonly totalActions: number;
  readonly approvalRequired: number;
}

export interface HomepageOptimizationResult {
  readonly context: HomepageContext;
  readonly analysis: HomepageAnalysis;
  readonly plan: HomepageOptimizationPlan;
  readonly preview: HomepagePreviewItem[];
  readonly execution?: {
    readonly status: "dry-run" | "executed";
    readonly writeResults: WriteResult[];
    readonly rolledBack: boolean;
  };
  readonly summary: HomepageOptimizationSummary;
  readonly messages: string[];
}
