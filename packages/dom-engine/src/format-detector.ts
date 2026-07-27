// @forge/dom-engine
// Format detection: decides elementor | gutenberg | generic-html from raw post data.

import type { FormatDetectionResult } from "./types.js";

/**
 * Detect the format of a WordPress post or arbitrary HTML page.
 *
 * Detection order:
 * 1. Elementor: non-empty `_elementor_data` meta + active edit mode
 * 2. Gutenberg: block comment delimiters in content
 * 3. generic-html: fallback
 */
export function detectFormat(
  elementorData: string | undefined,
  elementorEditMode: string | undefined,
  postContent: string | undefined,
): FormatDetectionResult {
  if (elementorData && elementorData.trim().length > 0 && elementorEditMode === "true") {
    return {
      format: "elementor",
      confidence: 0.95,
      metadata: { source: "_elementor_data", editMode: elementorEditMode },
    };
  }

  if (isGutenbergContent(postContent)) {
    return {
      format: "gutenberg",
      confidence: 0.9,
      metadata: { source: "post_content block delimiters" },
    };
  }

  return {
    format: "generic-html",
    confidence: 0.7,
    metadata: { source: "fallback" },
  };
}

/**
 * Check if content contains Gutenberg block comment delimiters.
 */
export function isGutenbergContent(content: string | undefined): boolean {
  if (!content) return false;
  return /<!--\s*wp:[\s\S]*?-->/g.test(content);
}

/**
 * Check if elementor data looks like active Elementor content.
 */
export function isActiveElementor(elementorData: string | undefined, elementorEditMode: string | undefined): boolean {
  if (!elementorData || elementorData.trim().length === 0) return false;
  try {
    const parsed = JSON.parse(elementorData);
    if (!Array.isArray(parsed)) return false;
    return elementorEditMode === "true";
  } catch {
    return false;
  }
}