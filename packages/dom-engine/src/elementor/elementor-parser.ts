// @forge/dom-engine
// Elementor parser: _elementor_data JSON -> ContentNode tree.
// Preserves element ids and widgetType for O(1) targeting.

import type { ContentNode } from "../types.js";

/**
 * Parse Elementor _elementor_data JSON into a ContentNode tree.
 * Handles both legacy `section/column/widget` and current `container` structures.
 */
export function parseElementorData(elementorData: string): ContentNode | null {
  try {
    const parsed = JSON.parse(elementorData);
    if (!Array.isArray(parsed)) return null;
    return {
      id: "elementor-root",
      type: "root",
      settings: { format: "elementor" },
      children: parsed.map((el, index) => parseElementorNode(el, `elementor-${index}`)),
      raw: parsed,
    };
  } catch {
    return null;
  }
}

function parseElementorNode(el: Record<string, unknown>, fallbackId: string): ContentNode {
  const id = (el.id as string) ?? fallbackId;
  const elType = (el.elType as string) ?? "unknown";
  const widgetType = (el.widgetType as string) ?? undefined;
  const settings = (el.settings as Record<string, unknown>) ?? {};

  const children = Array.isArray(el.elements) ? el.elements.map((child, i) => parseElementorNode(child, `${id}-child-${i}`)) : [];

  return {
    id,
    type: elType,
    widgetType,
    settings,
    children,
    raw: el,
  };
}
