// @forge/capabilities/homepage-analysis
// Homepage analysis capability entry.

import { analyzeWebsite } from "../engine.js";
import type { AnalysisReport, WebsiteSnapshot } from "@forge/core";

// Homepage rules are a subset of ALL_RULES focused on homepage-specific checks.
// For this sprint, we use all rules via analyzeWebsite.

export function analyzeHomepage(snapshot: WebsiteSnapshot): AnalysisReport {
  return analyzeWebsite(snapshot);
}
