// @forge/dom-engine
// Generic HTML target resolver.
// Resolves a SectionKind + optional context into a concrete cheerio selector.

import * as cheerio from "cheerio";
import { resolveSelector, type SelectorResolutionOptions } from "./selector-resolver.js";
import type { SectionKind } from "@forge/content-intelligence";

export interface GenericTargetOptions {
  readonly textAnchor?: string;
  readonly headingContext?: string;
  readonly siblingContext?: string;
}

/**
 * Resolve a target section/block in generic HTML.
 */
export function resolveGenericTarget(html: string, kind: SectionKind, options: GenericTargetOptions = {}): { selector: string; confidence: number } | null {
  const $ = cheerio.load(html);
  const resolutionOptions: SelectorResolutionOptions = {
    textAnchor: options.textAnchor,
    headingContext: options.headingContext,
    siblingContext: options.siblingContext,
  };

  const resolved = resolveSelector($, kind, resolutionOptions);
  if (!resolved) return null;

  const element = $(resolved.selector);
  if (element.length === 0) return null;

  const first = element.first();

  const structuralPath = buildStructuralPath(first);
  const structuralSelector = structuralPath.length > 0 ? structuralPath.join(" > ") : null;

  if (structuralSelector && $(structuralSelector).length > 0) {
    return { selector: structuralSelector, confidence: resolved.confidence * 0.95 };
  }

  return { selector: resolved.selector, confidence: resolved.confidence };
}

function buildStructuralPath($el: cheerio.Cheerio<any>): string[] {
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
 * Resolve a block within a section in generic HTML.
 */
export function resolveGenericBlock(html: string, sectionKind: SectionKind, blockKind: string): { selector: string; confidence: number } | null {
  const $ = cheerio.load(html);
  const sectionSelectors = [
    `section.${sectionKind}`,
    `[data-section="${sectionKind}"]`,
    `.${sectionKind}-section`,
  ];

  for (const sectionSel of sectionSelectors) {
    const section = $(sectionSel);
    if (section.length === 0) continue;

    const blockMap: Record<string, string> = {
      heading: "h1, h2, h3, h4, h5, h6",
      paragraph: "p",
      list: "ul, ol",
      button: 'a[href], button',
      image: "img",
      "faq-item": '[data-faq], .faq-item',
      card: '[data-card], .card',
      text: "div, span",
    };

    const blockSelector = blockMap[blockKind] || "div";
    const block = section.find(blockSelector).first();
    if (block.length > 0) {
      const path = buildStructuralPath(block);
      if (path.length > 0) {
        const fullSelector = `${sectionSel} > ${path.join(" > ")}`;
        if ($(fullSelector).length > 0) {
          return { selector: fullSelector, confidence: 0.8 };
        }
      }
      return { selector: `${sectionSel} ${blockSelector}`, confidence: 0.7 };
    }
  }

  return null;
}
