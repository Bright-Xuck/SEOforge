import { createActionStep, createExecutionStep, createHomepageAnalysisStep, createRecommendationStep, createValidationStep, createWebsiteReaderStep, } from "./adapters.js";
export function createWebsiteAuditPipeline(url) {
    return {
        id: "website-audit",
        name: "Website Audit",
        version: "0.8.0",
        description: "Reads a website, analyzes it, and generates recommendations.",
        steps: [createWebsiteReaderStep(url), createHomepageAnalysisStep(), createRecommendationStep()],
        metadata: { category: "audit" },
    };
}
export function createReadPipeline(url) {
    return {
        id: "read",
        name: "Read",
        version: "0.8.0",
        description: "Reads a website snapshot.",
        steps: [createWebsiteReaderStep(url)],
        metadata: { category: "read" },
    };
}
export function createAnalyzePipeline(url) {
    return {
        id: "analyze",
        name: "Analyze",
        version: "0.8.0",
        description: "Reads and analyzes a website.",
        steps: [createWebsiteReaderStep(url), createHomepageAnalysisStep()],
        metadata: { category: "analyze" },
    };
}
export function createRecommendPipeline(url) {
    return {
        id: "recommend",
        name: "Recommend",
        version: "0.8.0",
        description: "Reads, analyzes, and generates recommendations.",
        steps: [createWebsiteReaderStep(url), createHomepageAnalysisStep(), createRecommendationStep()],
        metadata: { category: "recommend" },
    };
}
export function createPlanPipeline(url) {
    return {
        id: "plan",
        name: "Plan",
        version: "0.8.0",
        description: "Reads, analyzes, recommends, and produces an execution plan.",
        steps: [
            createWebsiteReaderStep(url),
            createHomepageAnalysisStep(),
            createRecommendationStep(),
            createActionStep(),
        ],
        metadata: { category: "plan" },
    };
}
export function createValidatePipeline(url) {
    return {
        id: "validate",
        name: "Validate",
        version: "0.8.0",
        description: "Produces and validates an execution plan.",
        steps: [
            createWebsiteReaderStep(url),
            createHomepageAnalysisStep(),
            createRecommendationStep(),
            createActionStep(),
            createValidationStep(),
        ],
        metadata: { category: "validate" },
    };
}
export function createExecutePipeline(url, dryRun = true) {
    return {
        id: "execute",
        name: "Execute",
        version: "0.8.0",
        description: "Produces, validates, and dry-runs an execution plan.",
        steps: [
            createWebsiteReaderStep(url),
            createHomepageAnalysisStep(),
            createRecommendationStep(),
            createActionStep(),
            createValidationStep(),
            createExecutionStep(dryRun),
        ],
        metadata: { category: "execute" },
    };
}
export function createWeeklyOptimizationPipeline(url) {
    return {
        id: "weekly-optimization",
        name: "Weekly Optimization",
        version: "0.8.0",
        description: "Full optimization workflow including validation and dry-run execution.",
        steps: [
            createWebsiteReaderStep(url),
            createHomepageAnalysisStep(),
            createRecommendationStep(),
            createActionStep(),
            createValidationStep(),
            createExecutionStep(true),
        ],
        metadata: { category: "optimization" },
    };
}
export function createValidationOnlyPipeline(_url) {
    return {
        id: "validation-only",
        name: "Validation Only",
        version: "0.8.0",
        description: "Validates action plans without executing them.",
        steps: [createActionStep(), createValidationStep()],
        metadata: { category: "validation" },
    };
}
export function listDefaultPipelines() {
    return [
        createWebsiteAuditPipeline("https://example.com"),
        createWeeklyOptimizationPipeline("https://example.com"),
        createValidationOnlyPipeline("https://example.com"),
    ];
}
//# sourceMappingURL=default-pipelines.js.map