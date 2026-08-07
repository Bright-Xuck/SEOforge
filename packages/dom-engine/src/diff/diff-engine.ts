// @forge/dom-engine
// DOM Diff Engine (Sprint 23)
// Compares two UniversalPage objects and produces structured diffs.

import type {
  UniversalPage,
  DomRegion,
  DomSection,
  DomBlock,
  DomElement,
  DomDiffResult,
  DomDiffEntry,
} from "../universal/types.js";

/**
 * Diff two UniversalPage objects.
 * Produces added/removed/modified/moved nodes, attribute changes, structural changes.
 */
export function diffDom(before: UniversalPage, after: UniversalPage): DomDiffResult {
  const entries: DomDiffEntry[] = [];

  // Diff regions
  const beforeRegions = new Map(before.regions.map((r) => [r.id, r]));
  const afterRegions = new Map(after.regions.map((r) => [r.id, r]));

  for (const [id] of afterRegions) {
    if (!beforeRegions.has(id)) {
      entries.push({
        operation: "added",
        nodeType: "region",
        nodeId: id,
        path: [id],
      });
    } else {
      diffRegion(beforeRegions.get(id)!, afterRegions.get(id)!, [id], entries);
    }
  }

  for (const [id] of beforeRegions) {
    if (!afterRegions.has(id)) {
      entries.push({
        operation: "removed",
        nodeType: "region",
        nodeId: id,
        path: [id],
      });
    }
  }

  return {
    entries,
    addedCount: entries.filter((e) => e.operation === "added").length,
    removedCount: entries.filter((e) => e.operation === "removed").length,
    modifiedCount: entries.filter((e) => e.operation === "modified").length,
    movedCount: entries.filter((e) => e.operation === "moved").length,
  };
}

function diffRegion(
  before: DomRegion,
  after: DomRegion,
  path: string[],
  entries: DomDiffEntry[],
): void {
  if (before.kind !== after.kind) {
    entries.push({
      operation: "modified",
      nodeType: "region",
      nodeId: after.id,
      path,
      oldValue: before.kind,
      newValue: after.kind,
    });
  }

  // Diff sections
  const beforeSections = new Map(before.sections.map((s) => [s.id, s]));
  const afterSections = new Map(after.sections.map((s) => [s.id, s]));

  for (const [id, section] of afterSections) {
    if (!beforeSections.has(id)) {
      entries.push({
        operation: "added",
        nodeType: "section",
        nodeId: id,
        path: [...path, id],
      });
    } else {
      diffSection(beforeSections.get(id)!, section, [...path, id], entries);
    }
  }

  for (const [id] of beforeSections) {
    if (!afterSections.has(id)) {
      entries.push({
        operation: "removed",
        nodeType: "section",
        nodeId: id,
        path: [...path, id],
      });
    }
  }
}

function diffSection(
  before: DomSection,
  after: DomSection,
  path: string[],
  entries: DomDiffEntry[],
): void {
  if (before.kind !== after.kind) {
    entries.push({
      operation: "modified",
      nodeType: "section",
      nodeId: after.id,
      path,
      oldValue: before.kind,
      newValue: after.kind,
    });
  }

  // Diff blocks
  const beforeBlocks = new Map(before.blocks.map((b) => [b.id, b]));
  const afterBlocks = new Map(after.blocks.map((b) => [b.id, b]));

  for (const [id, block] of afterBlocks) {
    if (!beforeBlocks.has(id)) {
      entries.push({
        operation: "added",
        nodeType: "block",
        nodeId: id,
        path: [...path, id],
      });
    } else {
      diffBlock(beforeBlocks.get(id)!, block, [...path, id], entries);
    }
  }

  for (const [id] of beforeBlocks) {
    if (!afterBlocks.has(id)) {
      entries.push({
        operation: "removed",
        nodeType: "block",
        nodeId: id,
        path: [...path, id],
      });
    }
  }
}

function diffBlock(
  before: DomBlock,
  after: DomBlock,
  path: string[],
  entries: DomDiffEntry[],
): void {
  if (before.kind !== after.kind) {
    entries.push({
      operation: "modified",
      nodeType: "block",
      nodeId: after.id,
      path,
      oldValue: before.kind,
      newValue: after.kind,
    });
  }

  // Diff elements
  const beforeElements = new Map(before.elements.map((e) => [e.id, e]));
  const afterElements = new Map(after.elements.map((e) => [e.id, e]));

  for (const [id, element] of afterElements) {
    if (!beforeElements.has(id)) {
      entries.push({
        operation: "added",
        nodeType: "element",
        nodeId: id,
        path: [...path, id],
      });
    } else {
      diffElement(beforeElements.get(id)!, element, [...path, id], entries);
    }
  }

  for (const [id] of beforeElements) {
    if (!afterElements.has(id)) {
      entries.push({
        operation: "removed",
        nodeType: "element",
        nodeId: id,
        path: [...path, id],
      });
    }
  }
}

function diffElement(
  before: DomElement,
  after: DomElement,
  path: string[],
  entries: DomDiffEntry[],
): void {
  // Compare attributes
  const beforeAttrs = new Map(before.attributes.map((a) => [a.name, a.value]));
  const afterAttrs = new Map(after.attributes.map((a) => [a.name, a.value]));
  const attributeChanges: { name: string; oldValue?: string; newValue?: string }[] = [];

  for (const [name, value] of afterAttrs) {
    if (!beforeAttrs.has(name)) {
      attributeChanges.push({ name, newValue: value });
    } else if (beforeAttrs.get(name) !== value) {
      attributeChanges.push({ name, oldValue: beforeAttrs.get(name), newValue: value });
    }
  }

  for (const [name, value] of beforeAttrs) {
    if (!afterAttrs.has(name)) {
      attributeChanges.push({ name, oldValue: value });
    }
  }

  if (attributeChanges.length > 0) {
    entries.push({
      operation: "modified",
      nodeType: "element",
      nodeId: after.id,
      path,
      attributeChanges,
    });
  }

  // Compare text nodes
  const beforeText = before.textNodes.map((t) => t.text).join(" ");
  const afterText = after.textNodes.map((t) => t.text).join(" ");

  if (beforeText !== afterText) {
    entries.push({
      operation: "modified",
      nodeType: "text-node",
      nodeId: after.id,
      path: [...path, "text"],
      oldValue: beforeText,
      newValue: afterText,
    });
  }
}
