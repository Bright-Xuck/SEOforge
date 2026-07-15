// @forge/recommendation-engine/engine.test
// Unit tests for the recommendation engine.

import { describe, it, expect } from "vitest";
import { generateRecommendations } from "./engine.js";
import type { AnalysisReport, FindingId } from "@forge/core";

// Helper to create a minimal analysis report for testing
function createReport(overrides: Partial<AnalysisReport> = {}): AnalysisReport {
  return {
    url: "https://example.com/",
    analyzedAt: new Date().toISOString(),
    findings: [],
    summary: { total: 0, bySeverity: { info: 0, low: 0, medium: 0, high: 0, critical: 0 } },
    ...overrides,
  } as AnalysisReport;
}

describe("generateRecommendations", () => {
  it("returns empty recommendations for report with no findings", () => {
    const report = createReport({ findings: [] });
    const recReport = generateRecommendations(report);

    expect(recReport.url).toBe("https://example.com/");
    expect(recReport.recommendations).toHaveLength(0);
    expect(recReport.summary.total).toBe(0);
    expect(recReport.priorityBreakdown).toEqual({ critical: 0, high: 0, medium: 0, low: 0 });
    expect(recReport.estimatedEffort).toBe("0 minutes");
  });

  it("generates recommendation for missing title finding", () => {
    const report = createReport({
      findings: [
        {
          id: "seo.missing_title" as FindingId,
          title: "Missing Title",
          description: "Page has no title element.",
          severity: "critical",
          category: "seo",
          evidence: [{ source: "analysis", detail: "title" }],
          confidence: 1.0,
          fixable: true,
        },
      ],
      summary: { total: 1, bySeverity: { info: 0, low: 0, medium: 0, high: 0, critical: 1 } },
    });

    const recReport = generateRecommendations(report);

    expect(recReport.recommendations).toHaveLength(1);
    expect(recReport.recommendations[0]?.title).toBe("Add a Unique Page Title");
    expect(recReport.recommendations[0]?.findingId).toBe("seo.missing_title");
    expect(recReport.recommendations[0]?.priority).toBe("critical");
    expect(recReport.priorityBreakdown.critical).toBe(1);
  });

  it("generates recommendation for missing meta description finding", () => {
    const report = createReport({
      findings: [
        {
          id: "seo.missing_meta_description" as FindingId,
          title: "Missing Meta Description",
          description: "Page has no meta description element.",
          severity: "high",
          category: "seo",
          evidence: [{ source: "analysis", detail: "meta" }],
          confidence: 1.0,
          fixable: true,
        },
      ],
      summary: { total: 1, bySeverity: { info: 0, low: 0, medium: 0, high: 1, critical: 0 } },
    });

    const recReport = generateRecommendations(report);

    expect(recReport.recommendations).toHaveLength(1);
    expect(recReport.recommendations[0]?.title).toBe("Add a Meta Description");
    expect(recReport.recommendations[0]?.priority).toBe("high");
  });

  it("generates recommendation for multiple H1 finding", () => {
    const report = createReport({
      findings: [
        {
          id: "seo.multiple_h1" as FindingId,
          title: "Multiple H1",
          description: "Page has multiple H1 headings.",
          severity: "medium",
          category: "seo",
          evidence: [{ source: "analysis", detail: "H1" }],
          confidence: 1.0,
          fixable: true,
        },
      ],
      summary: { total: 1, bySeverity: { info: 0, low: 0, medium: 1, high: 0, critical: 0 } },
    });

    const recReport = generateRecommendations(report);

    expect(recReport.recommendations).toHaveLength(1);
    expect(recReport.recommendations[0]?.title).toBe("Reduce to Single H1 Heading");
    expect(recReport.recommendations[0]?.priority).toBe("medium");
  });

  it("calculates estimated effort correctly", () => {
    const report = createReport({
      findings: [
        {
          id: "seo.missing_title" as FindingId,
          title: "Missing Title",
          description: "Page has no title element.",
          severity: "critical",
          category: "seo",
          evidence: [{ source: "analysis", detail: "title" }],
          confidence: 1.0,
          fixable: true,
        },
        {
          id: "seo.missing_meta_description" as FindingId,
          title: "Missing Meta Description",
          description: "Page has no meta description element.",
          severity: "high",
          category: "seo",
          evidence: [{ source: "analysis", detail: "meta" }],
          confidence: 1.0,
          fixable: true,
        },
      ],
      summary: { total: 2, bySeverity: { info: 0, low: 0, medium: 0, high: 1, critical: 1 } },
    });

    const recReport = generateRecommendations(report);

    expect(recReport.estimatedEffort).toBe("5 minutes");
  });

  it("handles unknown finding IDs gracefully", () => {
    const report = createReport({
      findings: [
        {
          id: "unknown.finding" as FindingId,
          title: "Unknown Finding",
          description: "Some unknown issue.",
          severity: "info",
          category: "technical",
          evidence: [{ source: "analysis", detail: "unknown" }],
          confidence: 1.0,
          fixable: true,
        },
      ],
      summary: { total: 1, bySeverity: { info: 1, low: 0, medium: 0, high: 0, critical: 0 } },
    });

    const recReport = generateRecommendations(report);

    // Unknown findings should be skipped (no recommendation generated)
    expect(recReport.recommendations).toHaveLength(0);
  });

  it("creates unique IDs for duplicate findings", () => {
    const report = createReport({
      findings: [
        {
          id: "seo.missing_title" as FindingId,
          title: "Missing Title",
          description: "Page has no title element.",
          severity: "critical",
          category: "seo",
          evidence: [{ source: "analysis", detail: "title" }],
          confidence: 1.0,
          fixable: true,
        },
        {
          id: "seo.missing_title" as FindingId,
          title: "Missing Title",
          description: "Another page has no title element.",
          severity: "critical",
          category: "seo",
          evidence: [{ source: "analysis", detail: "title2" }],
          confidence: 1.0,
          fixable: true,
        },
      ],
      summary: { total: 2, bySeverity: { info: 0, low: 0, medium: 0, high: 0, critical: 2 } },
    });

    const recReport = generateRecommendations(report);

    expect(recReport.recommendations).toHaveLength(2);
    expect(recReport.recommendations[0]?.id).toBe("rec_seo.missing_title_1");
    expect(recReport.recommendations[1]?.id).toBe("rec_seo.missing_title_2");
  });
});