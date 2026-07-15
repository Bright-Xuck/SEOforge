// @forge/capabilities/engine
// Analysis engine that runs rules and collects findings.

import type { AnalysisReport, Finding, Severity, WebsiteSnapshot } from "@forge/core";
import { ALL_RULES } from "./rules/index.js";

/**
 * Runs all rules against a WebsiteSnapshot and returns an AnalysisReport.
 */
export function analyzeWebsite(snapshot: WebsiteSnapshot): AnalysisReport {
  const findings: Finding[] = [];

  for (const rule of ALL_RULES) {
    const ruleFindings = rule.analyze(snapshot);
    findings.push(...ruleFindings);
  }

  const sorted = findings.sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity));

  const counts = { info: 0, low: 0, medium: 0, high: 0, critical: 0 } as Record<Severity, number>;

  for (const f of findings) {
    counts[f.severity] = (counts[f.severity] || 0) + 1;
  }

  return {
    url: snapshot.finalUrl,
    analyzedAt: new Date().toISOString(),
    findings: sorted,
    summary: {
      total: findings.length,
      bySeverity: counts as Record<Severity, number>,
    },
  };
}

function severityOrder(severity: Severity): number {
  switch (severity) {
    case "critical":
      return 0;
    case "high":
      return 1;
    case "medium":
      return 2;
    case "low":
      return 3;
    case "info":
      return 4;
  }
}
