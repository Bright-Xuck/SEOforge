import type { PipelineDefinition } from "./types.js";
export declare function createWebsiteAuditPipeline(url: string): PipelineDefinition;
export declare function createReadPipeline(url: string): PipelineDefinition;
export declare function createAnalyzePipeline(url: string): PipelineDefinition;
export declare function createRecommendPipeline(url: string): PipelineDefinition;
export declare function createPlanPipeline(url: string): PipelineDefinition;
export declare function createValidatePipeline(url: string): PipelineDefinition;
export declare function createExecutePipeline(url: string, dryRun?: boolean): PipelineDefinition;
export declare function createWeeklyOptimizationPipeline(url: string): PipelineDefinition;
export declare function createValidationOnlyPipeline(_url: string): PipelineDefinition;
export declare function listDefaultPipelines(): PipelineDefinition[];
//# sourceMappingURL=default-pipelines.d.ts.map