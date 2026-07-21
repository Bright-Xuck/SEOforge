// @forge/review-engine
// Deterministic report generation (Markdown / JSON / HTML).

import type { ReviewReport, ReviewSession } from "./types.js";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildMarkdown(session: ReviewSession): string {
  const lines: string[] = [];
  lines.push(`# Review Session ${session.sessionId}`);
  lines.push("");
  lines.push(`- Project: ${session.projectId}`);
  lines.push(`- Created by: ${session.createdBy}`);
  lines.push(`- Created at: ${session.createdAt}`);
  lines.push(`- Policy: ${session.policy.name}`);
  lines.push(`- Status: ${session.status}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`| Total | Approved | Rejected | Edited | Skipped | Deferred | Pending |`);
  lines.push(`| ----- | -------- | -------- | ------ | ------- | -------- | ------- |`);
  lines.push(
    `| ${session.summary.total} | ${session.summary.approved} | ${session.summary.rejected} | ${session.summary.edited} | ${session.summary.skipped} | ${session.summary.deferred} | ${session.summary.pending} |`,
  );
  lines.push("");
  lines.push("## Metrics");
  lines.push("");
  lines.push(`- Approval rate: ${(session.metrics.approvalRate * 100).toFixed(1)}%`);
  lines.push(`- Rejection rate: ${(session.metrics.rejectionRate * 100).toFixed(1)}%`);
  lines.push(`- Average confidence: ${session.metrics.averageConfidence.toFixed(2)}`);
  lines.push(`- Average estimated impact: ${session.metrics.averageEstimatedImpact.toFixed(2)}`);
  lines.push(`- Warnings: ${session.metrics.warnings}`);
  lines.push(`- High-risk changes: ${session.metrics.highRiskChanges}`);
  lines.push(`- AI token estimate: ${session.metrics.aiTokenEstimate}`);
  lines.push(`- Estimated execution time (ms): ${session.metrics.estimatedExecutionTimeMs}`);
  lines.push("");
  lines.push("## Items");
  lines.push("");
  for (const item of session.items) {
    lines.push(`### ${item.section} (${item.id})`);
    lines.push("");
    lines.push(`- Severity: ${item.severity}`);
    lines.push(`- Confidence: ${item.confidence}`);
    lines.push(`- Decision: ${item.decision ?? "pending"}`);
    lines.push(`- Warnings: ${item.warnings.length}`);
    if (item.comments.length > 0) {
      lines.push("- Comments:");
      for (const comment of item.comments) {
        lines.push(`  - ${comment.author}: ${comment.message}`);
      }
    }
    lines.push("");
  }
  return lines.join("\n");
}

function buildHtml(session: ReviewSession): string {
  const items = session.items
    .map((item) => {
      return `<li><strong>${escapeHtml(item.section)}</strong> (${escapeHtml(item.id)}) — ${escapeHtml(
        item.decision ?? "pending",
      )} [${escapeHtml(item.severity)}, conf ${item.confidence}]</li>`;
    })
    .join("\n");
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Review ${escapeHtml(session.sessionId)}</title></head>
<body>
<h1>Review Session ${escapeHtml(session.sessionId)}</h1>
<p>Project: ${escapeHtml(session.projectId)} | Policy: ${escapeHtml(session.policy.name)} | Status: ${escapeHtml(
    session.status,
  )}</p>
<p>Approved: ${session.summary.approved} / ${session.summary.total}</p>
<ul>
${items}
</ul>
</body>
</html>`;
}

/**
 * Generate Markdown, JSON, and HTML representations of a review session.
 */
export function generateReport(session: ReviewSession): ReviewReport {
  return {
    markdown: buildMarkdown(session),
    json: JSON.stringify(session, null, 2),
    html: buildHtml(session),
  };
}
