// @forge/capabilities
// Analysis rules and engine for WebsiteSnapshot findings.
// Deterministic. No AI. No recommendations.

export { analyzeWebsite } from "./engine.js";
export type { AnalysisReport, Finding, Severity, Category } from "@forge/core";
export { analyzeHomepage } from "./homepage-analysis/index.js";
