export interface PipelineStepContract {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly type: string;
  readonly inputs: string[];
  readonly outputs: string[];
  readonly dependencies: string[];
}

export interface PipelineContract {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly steps: PipelineStepContract[];
  readonly metadata?: Record<string, unknown>;
}

export interface PipelineRegistryEntry {
  readonly pipeline: PipelineContract;
  readonly registeredAt: string;
}

export interface PipelineStepRegistryEntry {
  readonly step: PipelineStepContract;
  readonly registeredAt: string;
}
