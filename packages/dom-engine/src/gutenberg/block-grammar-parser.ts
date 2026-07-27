// @forge/dom-engine
// Gutenberg block grammar parser: comment-delimited grammar -> ContentNode tree.
// Implements the same state-machine approach as WordPress core's parse_blocks().

import type { ContentNode } from "../types.js";

const BLOCK_DELIMITER = /<!--\s*wp:([a-zA-Z0-9\/_-]*)(?:\s+([\s\S]*?))?\s*-->([\s\S]*?)<!--\s*\/\s*wp:\1\s*-->/g;

/**
 * Parse Gutenberg block grammar into a ContentNode tree.
 */
export function parseGutenbergBlocks(content: string): ContentNode {
  const blocks: ContentNode[] = [];
  let match: RegExpExecArray | null;

  while ((match = BLOCK_DELIMITER.exec(content)) !== null) {
    const [, blockName, attrsString, innerHtml] = match;
    const block: ContentNode = {
      id: `gutenberg-block-${blocks.length}`,
      type: "block",
      widgetType: blockName,
      settings: {
        blockName,
        attrs: parseAttrs(attrsString),
        innerHtml,
      },
      children: [],
      raw: { blockName, attrs: attrsString, innerHtml },
    };
    blocks.push(block);
  }

  return {
    id: "gutenberg-root",
    type: "root",
    settings: { format: "gutenberg", blockCount: blocks.length },
    children: blocks,
    raw: content,
  };
}

function parseAttrs(attrsString: string | undefined): Record<string, unknown> {
  if (!attrsString || attrsString.trim().length === 0) return {};
  try {
    return JSON.parse(attrsString);
  } catch {
    return { raw: attrsString };
  }
}

/**
 * Extract block names from Gutenberg content without full parsing.
 */
export function extractBlockNames(content: string): string[] {
  const names: string[] = [];
  const regex = /<!--\s*wp:([a-zA-Z0-9\/_-]*)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    if (match[1]) {
      names.push(match[1]);
    }
  }
  return names;
}
