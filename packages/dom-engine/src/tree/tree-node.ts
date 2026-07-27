// @forge/dom-engine
// Generic ContentNode used by both Elementor and Gutenberg parsers.

import type { ContentNode } from "../types.js";
export type { ContentNode };

/**
 * Create a leaf ContentNode.
 */
export function createLeaf(id: string, type: string, settings: Record<string, unknown> = {}, raw?: unknown): ContentNode {
  return {
    id,
    type,
    settings,
    children: [],
    raw: raw ?? settings,
  };
}

/**
 * Create a ContentNode with children.
 */
export function createNode(
  id: string,
  type: string,
  settings: Record<string, unknown> = {},
  children: ContentNode[] = [],
  raw?: unknown,
): ContentNode {
  return {
    id,
    type,
    settings,
    children,
    raw: raw ?? { ...settings, children: children.map((c) => c.raw) },
  };
}

/**
 * Find a node by id in a tree (breadth-first).
 */
export function findNodeById(root: ContentNode, id: string): ContentNode | undefined {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findNodeById(child, id);
    if (found) return found;
  }
  return undefined;
}

/**
 * Find a node by type at a given path (array of child indices).
 */
export function findNodeByPath(root: ContentNode, path: number[]): ContentNode | undefined {
  let current: ContentNode = root;
  for (const index of path) {
    if (index < 0 || index >= current.children.length) return undefined;
    const child = current.children[index];
    if (!child) return undefined;
    current = child;
  }
  return current;
}

/**
 * Clone a ContentNode tree (shallow clone of each node, deep clone of children).
 */
export function cloneTree(node: ContentNode): ContentNode {
  return {
    ...node,
    settings: { ...node.settings },
    children: node.children.map(cloneTree),
    raw: structuredClone(node.raw),
  };
}

/**
 * Compute a stable fingerprint for a ContentNode based on type, id, and settings subset.
 */
export function fingerprintNode(node: ContentNode, stableAttrKeys: string[] = ["id", "widgetType", "blockName", "className"]): string {
  const parts = [node.type, node.widgetType ?? "", node.id];
  for (const key of stableAttrKeys) {
    if (key in node.settings) {
      parts.push(`${key}=${JSON.stringify(node.settings[key])}`);
    }
  }
  return parts.join("|");
}