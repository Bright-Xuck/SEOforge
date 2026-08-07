// @forge/dom-engine
// Rich Text Model & Patch (Sprint 23)
// Builds an internal rich-text representation and supports deterministic patches.

import type { RichTextNode, RichTextPatch, RichTextPatchOperation } from "../universal/types.js";

/**
 * Normalize raw HTML into a rich text model.
 * Recognizes headings, paragraphs, lists, tables, links, buttons, inline formatting,
 * images, captions, embeds, videos, icons, forms.
 */
export function normalizeRichText(html: string): RichTextNode[] {
  const nodes: RichTextNode[] = [];
  const lines = html.split(/\n+/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    const node = parseLine(line);
    if (node) {
      nodes.push(node);
    }
  }

  return nodes;
}

function parseLine(line: string): RichTextNode | null {
  // Heading
  const headingMatch = line.match(/^<h([1-6])[^>]*>(.*?)<\/h\1>$/i);
  if (headingMatch) {
    return {
      id: `rt-heading-${hash(line)}`,
      kind: "heading",
      level: parseInt(headingMatch[1] ?? "0", 10),
      text: stripTags(headingMatch[2]),
      children: [],
      metadata: { raw: line },
    };
  }

  // Paragraph
  const paraMatch = line.match(/^<p[^>]*>(.*?)<\/p>$/i);
  if (paraMatch) {
    const content = paraMatch[1] ?? "";
    return {
      id: `rt-para-${hash(line)}`,
      kind: "paragraph",
      text: stripTags(content),
      children: parseInline(content),
      metadata: { raw: line },
    };
  }

  // List
  const listMatch = line.match(/^<(ul|ol)[^>]*>([\s\S]*?)<\/\1>$/i);
  if (listMatch) {
    const listItems = listMatch[2] ?? "";
    const listType = listMatch[1] ?? "";
    const items = [...listItems.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((m) => stripTags(m[1]));
    return {
      id: `rt-list-${hash(line)}`,
      kind: "list",
      items,
      children: [],
      metadata: { ordered: listType.toLowerCase() === "ol", raw: line },
    };
  }

  // Table
  const tableMatch = line.match(/^<table[^>]*>([\s\S]*?)<\/table>$/i);
  if (tableMatch) {
    const tableContent = tableMatch[1] ?? "";
    const rows: string[][] = [];
    for (const rowMatch of tableContent.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const rowText = rowMatch[1] ?? "";
      const rowCells = [...rowText.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => stripTags(m[1]));
      rows.push(rowCells);
    }
    return {
      id: `rt-table-${hash(line)}`,
      kind: "table",
      rows,
      children: [],
      metadata: { raw: line },
    };
  }

  // Link
  const linkMatch = line.match(/^<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>$/i);
  if (linkMatch) {
    return {
      id: `rt-link-${hash(line)}`,
      kind: "link",
      href: linkMatch[1] ?? "",
      text: stripTags(linkMatch[2]),
      children: [],
      metadata: { raw: line },
    };
  }

  // Button
  const buttonMatch = line.match(/^<button[^>]*>(.*?)<\/button>$/i);
  if (buttonMatch) {
    return {
      id: `rt-button-${hash(line)}`,
      kind: "button",
      text: stripTags(buttonMatch[1]),
      children: [],
      metadata: { raw: line },
    };
  }

  // Image
  const imageMatch = line.match(/^<img[^>]*src="([^"]*)"[^>]*>/i);
  if (imageMatch) {
    const altMatch = line.match(/alt="([^"]*)"/i);
    return {
      id: `rt-image-${hash(line)}`,
      kind: "image",
      src: imageMatch[1] ?? "",
      alt: altMatch?.[1],
      children: [],
      metadata: { raw: line },
    };
  }

  // Blockquote
  const quoteMatch = line.match(/^<blockquote[^>]*>([\s\S]*?)<\/blockquote>$/i);
  if (quoteMatch) {
    return {
      id: `rt-quote-${hash(line)}`,
      kind: "quote",
      text: stripTags(quoteMatch[1]),
      children: [],
      metadata: { raw: line },
    };
  }

  // Embed
  const embedMatch = line.match(/^<(iframe|embed|video|audio)[^>]*src="([^"]*)"[^>]*>/i);
  if (embedMatch) {
    return {
      id: `rt-embed-${hash(line)}`,
      kind: embedMatch[1] === "video" ? "video" : "embed",
      src: embedMatch[2] ?? "",
      children: [],
      metadata: { raw: line },
    };
  }

  // Plain text
  if (line.length > 0 && !line.startsWith("<")) {
    return {
      id: `rt-text-${hash(line)}`,
      kind: "text",
      text: line,
      children: [],
      metadata: {},
    };
  }

  return null;
}

function parseInline(html: string): RichTextNode[] {
  const nodes: RichTextNode[] = [];
  const boldMatch = html.match(/<strong[^>]*>([\s\S]*?)<\/strong>/i);
  if (boldMatch) {
    nodes.push({
      id: `rt-bold-${hash(boldMatch[1])}`,
      kind: "inline-format",
      format: "bold",
      text: stripTags(boldMatch[1]),
      children: [],
      metadata: {},
    });
  }
  const italicMatch = html.match(/<em[^>]*>([\s\S]*?)<\/em>/i);
  if (italicMatch) {
    nodes.push({
      id: `rt-italic-${hash(italicMatch[1])}`,
      kind: "inline-format",
      format: "italic",
      text: stripTags(italicMatch[1]),
      children: [],
      metadata: {},
    });
  }
  const codeMatch = html.match(/<code[^>]*>([\s\S]*?)<\/code>/i);
  if (codeMatch) {
    nodes.push({
      id: `rt-code-${hash(codeMatch[1])}`,
      kind: "inline-format",
      format: "code",
      text: stripTags(codeMatch[1]),
      children: [],
      metadata: {},
    });
  }
  return nodes;
}

function stripTags(html: string | undefined): string {
  return (html ?? "").replace(/<[^>]*>/g, "").trim();
}

function hash(input: string | undefined): string {
  const str = input ?? "";
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

/**
 * Create a rich text patch.
 * Supports: replace-paragraph, insert-paragraph, delete-paragraph, replace-heading,
 * replace-button-text, replace-cta, replace-list, replace-table, replace-image-alt,
 * replace-caption, replace-widget-text, replace-html-block, replace-shortcode-content.
 */
export function createPatch(
  operation: RichTextPatchOperation,
  targetId: string,
  selector: string,
  newContent: string,
): RichTextPatch {
  return {
    id: `rtp-${hash(`${operation}:${targetId}:${newContent}`)}`,
    operation,
    targetId,
    selector,
    newContent,
    metadata: { createdAt: new Date().toISOString() },
  };
}
