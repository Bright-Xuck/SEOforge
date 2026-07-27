// @forge/dom-engine
// HTML preview: before/after/diff HTML for generic-html patches.

import type { PatchPreview } from "../types.js";

/**
 * Render an HTML diff preview for generic-html patches.
 */
export function renderHtmlPreview(before: string, after: string): PatchPreview {
  const diff = computeHtmlDiff(before, after);
  return {
    before,
    after,
    diff,
    renderFidelity: "exact-html",
    warnings: [],
  };
}

function computeHtmlDiff(before: string, after: string): string {
  const beforeLines = before.split("\n");
  const afterLines = after.split("\n");
  const maxLines = Math.max(beforeLines.length, afterLines.length);
  const diffLines: string[] = [];

  for (let i = 0; i < maxLines; i++) {
    const beforeLine = beforeLines[i] ?? "";
    const afterLine = afterLines[i] ?? "";
    if (beforeLine !== afterLine) {
      diffLines.push(`- ${beforeLine}`);
      diffLines.push(`+ ${afterLine}`);
    }
  }

  return diffLines.join("\n");
}
