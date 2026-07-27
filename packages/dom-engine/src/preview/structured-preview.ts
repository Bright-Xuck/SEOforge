// @forge/dom-engine
// Structured preview: settings/attrs before-after diff for Elementor + Gutenberg.

import type { PatchPreview } from "../types.js";

/**
 * Render a structured diff preview for Elementor or Gutenberg patches.
 */
export function renderStructuredPreview(before: string, after: string, field: string): PatchPreview {
  const diff = `--- ${field}\n+++ ${field}\n@@\n-${before}\n+${after}`;
  return {
    before,
    after,
    diff,
    renderFidelity: "structured-diff",
    warnings: [],
  };
}
