export class PipelineNotFoundError extends Error {
  constructor(public readonly pipelineId: string) {
    super(`Pipeline with ID "${pipelineId}" not found.`);
    this.name = "PipelineNotFoundError";
  }
}

export class PipelineStepNotFoundError extends Error {
  constructor(public readonly stepId: string) {
    super(`Pipeline step with ID "${stepId}" not found.`);
    this.name = "PipelineStepNotFoundError";
  }
}

export class PipelineValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PipelineValidationError";
  }
}
