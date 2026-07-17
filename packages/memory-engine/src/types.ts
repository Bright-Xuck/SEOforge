export interface MemoryEvent {
  readonly id: string;
  readonly type:
    | "website-crawl"
    | "analysis"
    | "recommendation"
    | "execution-plan"
    | "validation"
    | "execution"
    | "report"
    | "approval"
    | "rejection"
    | "pipeline-execution"
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
