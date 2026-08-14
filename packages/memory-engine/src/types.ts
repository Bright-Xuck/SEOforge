export interface MemoryEvent {
  readonly id: string;
  readonly type:
    | "website-crawl"
    | "analysis"
    | "recommendation"
    | "execution-plan"
    | "mission-created"
    | "mission-started"
    | "mission-completed"
    | "mission-cancelled"
    | "mission-failed"
    | "mission-approved"
    | "mission-rejected"
    | "mission-executed"
    | "validation"
    | "execution"
    | "strategy-created"
    | "strategy-executed"
    | "strategy-cancelled"
    | "strategy-succeeded"
    | "strategy-failed"
    | "report"
    | "approval"
    | "rejection"
    | "pipeline-execution"
    | "review-created"
    | "review-approved"
    | "review-rejected"
    | "review-commented"
    | "review-completed"
    | "site-analysis"
    | "elementor-write"
    | "elementor-rollback"
    | "error"
    | "warning";
  readonly project: string;
  readonly timestamp: string;
  readonly payload: Record<string, unknown>;
}

export interface MemorySummary {
  readonly project: string;
  readonly total: number;
  readonly byType: Record<string, number>;
  readonly lastEventAt?: string;
}

export interface MemoryFilter {
  readonly type?: MemoryEvent["type"];
  readonly from?: string;
  readonly to?: string;
  readonly contains?: string;
}
