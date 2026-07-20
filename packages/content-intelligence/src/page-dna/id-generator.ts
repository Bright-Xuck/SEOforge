// @forge/content-intelligence
// Stable, deterministic ID and selector generation.
// NO AI.

import type { SectionKind } from "../types.js";

/**
 * Generate a stable section ID from a kind and occurrence index.
 * Deterministic: same inputs always produce the same ID.
 *
 * Format: bare kind for the first occurrence (index 0), `kind-N` for
 * subsequent occurrences (index >= 1). Examples: `hero`, `hero-1`,
 * `faq-1`, `faq-2`, `pricing-1`, `footer-1`.
 */
export function generateSectionId(kind: SectionKind, index: number): string {
  return index <= 0 ? kind : `${kind}-${index}`;
}

/**
 * Generate a stable block ID.
 */
export function generateBlockId(sectionId: string, index: number): string {
  return `${sectionId}-block-${index}`;
}

/**
 * Generate a stable paragraph ID within a block.
 */
export function generateParagraphId(blockId: string, index: number): string {
  return `${blockId}-p-${index}`;
}

/**
 * Generate a stable sentence ID within a paragraph.
 */
export function generateSentenceId(paragraphId: string, index: number): string {
  return `${paragraphId}-s-${index}`;
}

/**
 * Extract the canonical SectionKind from an arbitrary label.
 */
export function extractSectionKind(label: string): SectionKind | undefined {
  const normalized = label.toLowerCase().replace(/[^a-z-]/g, "");
  const kinds: SectionKind[] = [
    "hero", "benefits", "features", "services", "products", "testimonials",
    "faq", "comparison", "buying-guide", "pricing", "cta", "contact",
    "footer", "navigation", "related-content",
  ];
  return kinds.find((kind) => normalized.includes(kind));
}

/**
 * Generate a CSS-ish selector for a section based on its kind.
 */
export function generateSectionSelector(kind: SectionKind, index: number): string {
  return `[data-section="${kind}"], [class*="${kind}"], section.${kind}, #${kind}-${index}`;
}
