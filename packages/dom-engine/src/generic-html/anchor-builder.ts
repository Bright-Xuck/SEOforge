// @forge/dom-engine
// Anchor builder for generic HTML targeting.
// Builds text, sibling, heading, and structural anchors.

import * as cheerio from "cheerio";
import type { ResolvedSelector } from "../types.js";

/**
 * Build a text anchor selector for an element.
 */
export function buildTextAnchor(text: string, maxLength = 40): string {
  const truncated = text.slice(0, maxLength).trim();
  const escaped = truncated.replace(/([^a-zA-Z0-9_-])/g, "\\$1");
  return `:contains("${escaped}")`;
}

/**
 * Build a sibling anchor selector.
 */
export function buildSiblingAnchor(contextText: string, direction: "next" | "prev" = "next"): string {
  const escaped = contextText.replace(/([^a-zA-Z0-9_-])/g, "\\$1");
  if (direction === "next") {
    return `:contains("${escaped}") + *`;
  }
  return `:contains("${escaped}") ~ *`;
}

/**
 * Build a heading-relative anchor selector.
 */
export function buildHeadingAnchor(headingText: string): string {
  const escaped = headingText.replace(/([^a-zA-Z0-9_-])/g, "\\$1");
  return `h1:contains("${escaped}"), h2:contains("${escaped}"), h3:contains("${escaped}")`;
}

/**
 * Build a structural path selector from a cheerio element to root.
 */
export function buildStructuralPath($el: cheerio.Cheerio<any>): string[] {
  const path: string[] = [];
  let current: cheerio.Cheerio<any> | null = $el;
  while (current && current.length > 0) {
    const parent = current.parent();
    if (parent && parent.length > 0) {
      const index = parent.children().index(current.get(0));
      if (index >= 0) {
        path.unshift(`${(current[0] as { tagName: string }).tagName}:nth-child(${index + 1})`);
      }
    }
    current = parent as cheerio.Cheerio<any> | null;
  }
  return path;
}

/**
 * Resolve an anchor to a cheerio element, returning the best match.
 */
export function resolveAnchor($: cheerio.CheerioAPI, anchor: string): ResolvedSelector | null {
  const candidates = $(anchor);
  if (candidates.length === 0) return null;
  return {
    selector: anchor,
    confidence: 0.7,
    strategy: "text-anchor",
  };
}
