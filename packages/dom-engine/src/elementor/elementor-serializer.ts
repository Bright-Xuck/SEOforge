// @forge/dom-engine
// Elementor serializer: ContentNode tree -> _elementor_data JSON.
// Lossless except for the targeted field that was patched.

import type { ContentNode } from "../types.js";

/**
 * Serialize a ContentNode tree back to Elementor _elementor_data JSON.
 */
export function serializeElementorData(root: ContentNode): string {
  const elements = root.children.map((child) => serializeElementorNode(child));
  return JSON.stringify(elements, null, 2);
}

function serializeElementorNode(node: ContentNode): Record<string, unknown> {
  const raw = node.raw as Record<string, unknown> | undefined;
  const result: Record<string, unknown> = {
    ...(raw ?? {}),
    settings: { ...node.settings },
  };

  if (node.children.length > 0) {
    result.elements = node.children.map((child) => serializeElementorNode(child));
  }

  return result;
}
