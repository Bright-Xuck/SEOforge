// @forge/content-intelligence
// Content Graph construction: Page -> Section -> Block -> Paragraph -> Sentence.
// NO AI. Deterministic DOM traversal.

import type { CheerioAPI } from "cheerio";
import type { ContentGraph, GraphNode, GraphNodeType, WebsiteSnapshot } from "../types.js";
import { detectSections } from "../sections/detector.js";
import { generateSectionId } from "../page-dna/id-generator.js";

export function buildContentGraph(snapshot: WebsiteSnapshot, $: CheerioAPI): ContentGraph {
  const pageId = `page-${hashUrl(snapshot.finalUrl || snapshot.originalUrl)}`;
  const nodes: GraphNode[] = [];

  const pageNode: GraphNode = {
    id: pageId,
    type: "page",
    content: snapshot.pageTitle,
    position: 0,
    relationships: [],
    metadata: { url: snapshot.finalUrl || snapshot.originalUrl, title: snapshot.pageTitle },
  };
  nodes.push(pageNode);

  const sections = detectSections(snapshot, $);
  let sectionIndex = 0;

  for (const sectionInfo of sections.sections) {
    if (!sectionInfo.present) continue;
    const sectionId = generateSectionId(sectionInfo.kind, sectionIndex);
    const sectionEl = sectionInfo.selector ? $(sectionInfo.selector).first() : cheerioCheerio($, sectionInfo.kind);

    const sectionNode: GraphNode = {
      id: sectionId,
      type: "section",
      content: sectionInfo.kind,
      position: sectionIndex,
      relationships: [{ type: "contains", targetId: pageId }],
      metadata: { kind: sectionInfo.kind, confidence: sectionInfo.confidence },
    };
    nodes.push(sectionNode);
    pageNode.relationships.push({ type: "contains", targetId: sectionId });

    const sectionHtml = sectionEl.length > 0 ? sectionEl.html() ?? "" : "";
    const blocks = splitBlocks(sectionHtml);
    let blockIndex = 0;

    for (const blockHtml of blocks) {
      const blockId = `${sectionId}-block-${blockIndex}`;
      const blockNode: GraphNode = {
        id: blockId,
        type: "block",
        content: stripHtml(blockHtml).slice(0, 200),
        position: blockIndex,
        relationships: [{ type: "contains", targetId: sectionId }],
        metadata: {},
      };
      nodes.push(blockNode);
      sectionNode.relationships.push({ type: "contains", targetId: blockId });

      const paragraphs = splitParagraphs(blockHtml);
      let paragraphIndex = 0;
      for (const paragraphHtml of paragraphs) {
        const paragraphText = stripHtml(paragraphHtml).trim();
        if (!paragraphText) continue;
        const paragraphId = `${blockId}-p-${paragraphIndex}`;
        const paragraphNode: GraphNode = {
          id: paragraphId,
          type: "paragraph",
          content: paragraphText.slice(0, 400),
          position: paragraphIndex,
          relationships: [{ type: "contains", targetId: blockId }],
          metadata: { wordCount: paragraphText.split(/\s+/).filter(Boolean).length },
        };
        nodes.push(paragraphNode);
        blockNode.relationships.push({ type: "contains", targetId: paragraphId });

        const sentences = splitSentences(paragraphText);
        let sentenceIndex = 0;
        for (const sentence of sentences) {
          const sentenceId = `${paragraphId}-s-${sentenceIndex}`;
          const sentenceNode: GraphNode = {
            id: sentenceId,
            type: "sentence",
            content: sentence,
            position: sentenceIndex,
            relationships: [{ type: "contains", targetId: paragraphId }],
            metadata: { wordCount: sentence.split(/\s+/).filter(Boolean).length },
          };
          nodes.push(sentenceNode);
          paragraphNode.relationships.push({ type: "contains", targetId: sentenceId });
          sentenceIndex += 1;
        }
        paragraphIndex += 1;
      }
      blockIndex += 1;
    }
    sectionIndex += 1;
  }

  const byType: Record<GraphNodeType, number> = { page: 0, section: 0, block: 0, paragraph: 0, sentence: 0 };
  for (const node of nodes) {
    byType[node.type] += 1;
  }

  return { pageId, nodes, nodeCount: nodes.length, byType };
}

function cheerioCheerio($: CheerioAPI, kind: string): ReturnType<CheerioAPI> {
  return $(`[class*="${kind}"], [id*="${kind}"], section.${kind}`).first();
}

function splitBlocks(html: string): string[] {
  if (!html) return [];
  const blocks = html.split(/<\/?(section|div|article|ul|ol|table|header|footer)[^>]*>/i).filter((chunk) => chunk.trim().length > 0);
  return blocks.length > 0 ? blocks : [html];
}

function splitParagraphs(html: string): string[] {
  return html.split(/<\/p>|<\/li>|<\/blockquote>|<br\s*\/?>/i).map((chunk) => chunk.trim()).filter(Boolean);
}

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).map((chunk) => chunk.trim()).filter(Boolean);
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}

function hashUrl(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i += 1) {
    hash = (hash << 5) - hash + url.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
