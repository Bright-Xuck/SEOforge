// @forge/content-intelligence
// Stable, deterministic ID and selector generation.
// NO AI.

import type { SectionKind } from "../types.js";

/**
 * Generate a stable section ID from a kind and index.
 * Deterministic: same inputs always produce the same ID.
 */
export function generateSectionId(kind: SectionKind, index: number): string {
  return `section-${kind}-${index}`;
}

/**
 * Generate a stable block ID.
 */
export function generateBlockId(sectionId: string, index: number): string {
  return `${sectionId}-block-${index}`;
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
