// @forge/content-intelligence
// Shared DOM traversal helpers for the content graph and section boundaries.
// NO AI. Deterministic.

import {
  generateBlockId,
  generateParagraphId,
  generateSentenceId,
} from "../page-dna/id-generator.js";

export function splitBlocks(html: string): string[] {
  if (!html) return [];
  const blocks = html
    .split(/<\/?(section|div|article|ul|ol|table|header|footer)[^>]*>/i)
    .filter((chunk) => chunk.trim().length > 0);
  return blocks.length > 0 ? blocks : [html];
}

export function splitParagraphs(html: string): string[] {
  return html.split(/<\/p>|<\/li>|<\/blockquote>|<br\s*\/?>/i).map((chunk) => chunk.trim()).filter(Boolean);
}

export function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).map((chunk) => chunk.trim()).filter(Boolean);
}

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}

/**
 * Enumerate all block/paragraph/sentence node ids contained within a section,
 * in document order. Deterministic and matches buildContentGraph id generation.
 */
export function enumerateSectionNodeIds(sectionHtml: string, sectionId: string): string[] {
  const ids: string[] = [];
  const blocks = splitBlocks(sectionHtml);
  blocks.forEach((blockHtml, blockIndex) => {
    const blockId = generateBlockId(sectionId, blockIndex);
    ids.push(blockId);
    const paragraphs = splitParagraphs(blockHtml);
    paragraphs.forEach((paragraphHtml, paragraphIndex) => {
      const paragraphText = stripHtml(paragraphHtml).trim();
      if (!paragraphText) return;
      const paragraphId = generateParagraphId(blockId, paragraphIndex);
      ids.push(paragraphId);
      const sentences = splitSentences(paragraphText);
      sentences.forEach((_sentence, sentenceIndex) => {
        ids.push(generateSentenceId(paragraphId, sentenceIndex));
      });
    });
  });
  return ids;
}
