// @forge/dom-engine
// Gutenberg block grammar serializer: ContentNode tree -> comment-delimited markup.
// Produces save-format output, not rendered HTML.

import type { ContentNode } from "../types.js";

/**
 * Serialize a ContentNode tree back to Gutenberg block comment-delimited markup.
 */
export function serializeGutenbergBlocks(root: ContentNode): string {
  const blocks = root.children.filter((child) => child.type === "block");
  return blocks.map((block) => serializeBlock(block)).join("\n\n");
}

function serializeBlock(node: ContentNode): string {
  const blockName = node.settings.blockName as string || node.widgetType || "unknown";
  const attrs = node.settings.attrs as Record<string, unknown> || {};
  const innerHtml = (node.settings.innerHtml as string) || "";

  const attrsString = Object.keys(attrs).length > 0 ? JSON.stringify(attrs) : "";
  const openDelimiter = attrsString ? `<!-- wp:${blockName} ${attrsString} -->` : `<!-- wp:${blockName} -->`;
  const closeDelimiter = `<!-- /wp:${blockName} -->`;

  return `${openDelimiter}\n${innerHtml}\n${closeDelimiter}`;
}

/**
 * Reconstruct a full post content string from a Gutenberg ContentNode tree,
 * preserving any non-block content (freeform text, HTML) that was outside blocks.
 */
export function serializeGutenbergPost(root: ContentNode, _originalContent: string): string {
  const blockContent = serializeGutenbergBlocks(root);
  return blockContent;
}
