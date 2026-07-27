// @forge/dom-engine
// Elementor target resolver: PatchTarget -> element id + settings key, O(1).

import type { ContentNode, ElementorPatchTarget } from "../types.js";
import { findNodeById } from "../tree/tree-node.js";
import { resolveElementorSettingsKey } from "./widget-schema.js";

/**
 * Resolve an ElementorPatchTarget against a parsed ContentNode tree.
 * Returns the target node if found, or null.
 */
export function resolveElementorTarget(root: ContentNode, target: ElementorPatchTarget): ContentNode | null {
  const node = findNodeById(root, target.elementId);
  if (!node) return null;

  if (target.settingsKey && !(target.settingsKey in node.settings)) {
    return null;
  }

  return node;
}

/**
 * Build an ElementorPatchTarget from a semantic intent and a parsed tree.
 */
export function buildElementorTarget(root: ContentNode, semanticKind: string, _value: string): ElementorPatchTarget | null {
  const candidates = findCandidateNodes(root, semanticKind);
  if (candidates.length === 0) return null;

  const node = candidates[0]!;
  const widgetType = node.widgetType;
  const settingsKey = resolveElementorSettingsKey(widgetType, semanticKind);
  if (!settingsKey) return null;

  return {
    format: "elementor",
    elementId: node!.id,
    settingsKey,
  };
}

function findCandidateNodes(root: ContentNode, semanticKind: string): ContentNode[] {
  const candidates: ContentNode[] = [];

  function walk(node: ContentNode): void {
    if (node.widgetType && matchesSemanticIntent(node.widgetType, semanticKind)) {
      candidates.push(node);
    }
    for (const child of node.children) {
      walk(child);
    }
  }

  walk(root);
  return candidates;
}

function matchesSemanticIntent(widgetType: string, semanticKind: string): boolean {
  const mapping: Record<string, string[]> = {
    heading: ["heading-text"],
    button: ["button-text", "button-link"],
    "text-editor": ["text-content"],
    image: ["image-alt", "image-caption"],
    "text-path": ["text-content"],
    icon: ["icon-text"],
  };

  const intents = mapping[widgetType];
  if (!intents) return false;
  return intents.includes(semanticKind);
}
