// @forge/dom-engine
// UniversalPage ↔ Elementor mapping (Sprint 25).
//
// The Universal Page Model represents the rendered page:
//   UniversalPage → regions → sections → blocks → elements → text nodes
// Elementor represents the editable source structure:
//   ElementorDocument → containers → widgets → settings
//
// This module builds an explicit, deterministic mapping between the two.
// Elementor element IDs are preferred where they can be reliably recovered
// (rendered Elementor HTML carries data-id="<element id>"). We never rely
// solely on nth-child, DOM position, generated CSS classes, or arbitrary text
// matching.

import type { UniversalPage, DomBlock } from "../universal/types.js";
import type { ElementorDocument } from "./document.js";
import { findNodeById } from "../tree/tree-node.js";
import { normalizeElementorWidgetType } from "./widget-schema.js";
import { textContentOfRichText } from "./rich-text.js";

export type ElementorMapStrategy = "data-id" | "widget-type" | "text-anchor";

/**
 * A single rendered-element → Elementor-element mapping.
 */
export interface ElementorElementMapEntry {
  /** DomBlock id in the Universal Page Model. */
  readonly universalBlockId: string;
  /** Elementor element id (settings source). */
  readonly elementId: string;
  /** Elementor widget type (if the target is a widget). */
  readonly widgetType?: string;
  /** Elementor element type (container/section/column/widget). */
  readonly elType: string;
  /** How the mapping was established. */
  readonly strategy: ElementorMapStrategy;
  /** Deterministic confidence: data-id=1.0, widget-type=0.8, text-anchor=0.6. */
  readonly confidence: number;
}

/**
 * Mapping result.
 */
export interface ElementorElementMap {
  readonly entries: ElementorElementMapEntry[];
  /** Universal block ids that could not be mapped to an Elementor element. */
  readonly unmatchedBlocks: string[];
}

const STRATEGY_CONFIDENCE: Record<ElementorMapStrategy, number> = {
  "data-id": 1.0,
  "widget-type": 0.8,
  "text-anchor": 0.6,
};

/**
 * Build a deterministic mapping from a UniversalPage (rendered page) to an
 * ElementorDocument (editable source). Elementor element IDs are recovered
 * from rendered `data-id` attributes wherever present.
 */
export function mapUniversalPageToElementor(
  page: UniversalPage,
  document: ElementorDocument,
): ElementorElementMap {
  const entries: ElementorElementMapEntry[] = [];
  const unmatched: string[] = [];

  const blocks = collectBlocks(page);

  for (const block of blocks) {
    const mapped = mapBlock(block, document);
    if (mapped) {
      entries.push(mapped);
    } else {
      unmatched.push(block.id);
    }
  }

  return { entries, unmatchedBlocks: unmatched };
}

function collectBlocks(page: UniversalPage): DomBlock[] {
  const blocks: DomBlock[] = [];
  const walk = (region: UniversalPage["regions"][number]): void => {
    for (const section of region.sections) {
      const visit = (b: DomBlock): void => {
        blocks.push(b);
        for (const child of b.children) visit(child);
      };
      for (const block of section.blocks) visit(block);
    }
  };
  for (const region of page.regions) walk(region);
  return blocks;
}

function mapBlock(block: DomBlock, document: ElementorDocument): ElementorElementMapEntry | null {
  // Strategy 1: deterministic data-id (rendered Elementor HTML).
  const dataId = block.metadata?.elementorElementId;
  if (typeof dataId === "string" && dataId.length > 0) {
    const node = findNodeById(document.root, dataId);
    if (node) {
      return {
        universalBlockId: block.id,
        elementId: node.id,
        widgetType: node.widgetType,
        elType: node.type,
        strategy: "data-id",
        confidence: STRATEGY_CONFIDENCE["data-id"],
      };
    }
  }

  // Strategy 2: widget-type equality (normalized, e.g. "heading.default" → "heading").
  const blockWidget = normalizeElementorWidgetType(block.widgetType);
  if (blockWidget) {
    const widgetMatches = findWidgetsByType(document, blockWidget);
    if (widgetMatches.length === 1) {
      const node = widgetMatches[0];
      if (!node) return null;
      return {
        universalBlockId: block.id,
        elementId: node.id,
        widgetType: node.widgetType,
        elType: node.type,
        strategy: "widget-type",
        confidence: STRATEGY_CONFIDENCE["widget-type"],
      };
    }
  }

  // Strategy 3: unique text anchor — the block's visible text matches exactly
  // one widget's primary text setting. Only used when unique; never ambiguous.
  const blockText = collectBlockText(block);
  if (blockText.length > 0) {
    const textMatches = findWidgetsByText(document, blockText);
    if (textMatches.length === 1) {
      const node = textMatches[0];
      if (!node) return null;
      return {
        universalBlockId: block.id,
        elementId: node.id,
        widgetType: node.widgetType,
        elType: node.type,
        strategy: "text-anchor",
        confidence: STRATEGY_CONFIDENCE["text-anchor"],
      };
    }
  }

  return null;
}

function findWidgetsByType(document: ElementorDocument, widgetType: string): NonNullable<ReturnType<typeof findNodeById>>[] {
  const found: NonNullable<ReturnType<typeof findNodeById>>[] = [];
  const walk = (node: NonNullable<ReturnType<typeof findNodeById>>): void => {
    if (node.widgetType && normalizeElementorWidgetType(node.widgetType) === widgetType) {
      found.push(node);
    }
    for (const child of node.children) walk(child);
  };
  walk(document.root);
  return found;
}

function findWidgetsByText(document: ElementorDocument, text: string): NonNullable<ReturnType<typeof findNodeById>>[] {
  const found: NonNullable<ReturnType<typeof findNodeById>>[] = [];
  const walk = (node: NonNullable<ReturnType<typeof findNodeById>>): void => {
    if (node.widgetType && hasPrimaryTextSetting(node, text)) {
      found.push(node);
    }
    for (const child of node.children) walk(child);
  };
  walk(document.root);
  return found;
}

function hasPrimaryTextSetting(node: NonNullable<ReturnType<typeof findNodeById>>, text: string): boolean {
  const candidates = [node.settings.title, node.settings.editor, node.settings.text];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && textContentOfRichText(candidate) === text) {
      return true;
    }
  }
  return false;
}

function collectBlockText(block: DomBlock): string {
  const parts: string[] = [];
  const visitElement = (element: DomBlock["elements"][number]): void => {
    for (const textNode of element.textNodes) parts.push(textNode.text);
    for (const child of element.children) visitElement(child);
  };
  for (const element of block.elements) visitElement(element);
  for (const child of block.children) {
    const childText = collectBlockText(child);
    if (childText.length > 0) parts.push(childText);
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}
