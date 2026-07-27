// @forge/dom-engine
// Patch engine: routes ContentPatch to the correct resolver by format.

import type { ContentPatch, PatchApplyResult } from "../types.js";
import { applyPatch } from "../tree/tree-patcher.js";
import { findNodeByPath } from "../tree/tree-node.js";
import { resolveElementorTarget } from "../elementor/elementor-target-resolver.js";
import { renderStructuredPreview } from "../preview/structured-preview.js";
import { renderHtmlPreview } from "../preview/html-preview.js";
import { parseElementorData } from "../elementor/elementor-parser.js";
import { serializeElementorData } from "../elementor/elementor-serializer.js";
import { parseGutenbergBlocks } from "../gutenberg/block-grammar-parser.js";
import { serializeGutenbergPost } from "../gutenberg/block-grammar-serializer.js";

/**
 * Apply a ContentPatch to content in the appropriate format.
 */
export async function applyContentPatch(
  rawContent: string,
  patch: ContentPatch,
): Promise<PatchApplyResult> {
  const target = patch.target;

  if (!target) {
    return {
      success: false,
      patchedContent: rawContent,
      preview: { before: rawContent, after: rawContent, renderFidelity: "exact-html", warnings: ["No target specified"] },
      warnings: ["No target specified"],
    };
  }

  try {
    switch (target.format) {
      case "elementor":
        return applyElementorPatch(rawContent, patch, target);
      case "gutenberg":
        return applyGutenbergPatch(rawContent, patch, target);
      case "generic-html":
        return applyGenericHtmlPatch(rawContent, patch, target);
      default:
        return {
          success: false,
          patchedContent: rawContent,
          preview: { before: rawContent, after: rawContent, renderFidelity: "structured-diff", warnings: [`Unknown format: ${(target as { format: string }).format}`] },
          warnings: [`Unknown format: ${(target as { format: string }).format}`],
        };
    }
  } catch (error) {
    return {
      success: false,
      patchedContent: rawContent,
      preview: { before: rawContent, after: rawContent, renderFidelity: "structured-diff", warnings: [String(error)] },
      warnings: [String(error)],
    };
  }
}

function applyElementorPatch(rawContent: string, patch: ContentPatch, target: { format: "elementor"; elementId: string; settingsKey: string }): PatchApplyResult {
  const root = parseElementorData(rawContent);
  if (!root) {
    return { success: false, patchedContent: rawContent, preview: { before: rawContent, after: rawContent, renderFidelity: "structured-diff", warnings: ["Invalid Elementor data"] }, warnings: ["Invalid Elementor data"] };
  }

  const node = resolveElementorTarget(root, target);
  if (!node) {
    return { success: false, patchedContent: rawContent, preview: { before: rawContent, after: rawContent, renderFidelity: "structured-diff", warnings: ["Element not found"] }, warnings: ["Element not found"] };
  }

  const before = JSON.stringify(node.settings[target.settingsKey]);
  const cloned = applyPatch(root, [], "replace", { [target.settingsKey]: patch.proposedContent });
  const after = JSON.stringify(cloned.settings[target.settingsKey]);

  const patched = serializeElementorData(cloned);
  const preview = renderStructuredPreview(before, after, target.settingsKey);

  return { success: true, patchedContent: patched, preview, warnings: [] };
}

function applyGutenbergPatch(rawContent: string, patch: ContentPatch, target: { blockPath: number[]; fingerprint: unknown; field: string }): PatchApplyResult {
  const root = parseGutenbergBlocks(rawContent);

  const node = findNodeByPath(root, target.blockPath);
  if (!node) {
    return { success: false, patchedContent: rawContent, preview: { before: rawContent, after: rawContent, renderFidelity: "structured-diff", warnings: ["Block not found"] }, warnings: ["Block not found"] };
  }

  const before = String(node.settings[target.field] ?? "");
  const cloned = applyPatch(root, [], "replace", { [target.field]: patch.proposedContent });
  const after = String(cloned.settings[target.field] ?? "");

  const patched = serializeGutenbergPost(cloned, rawContent);
  const preview = renderStructuredPreview(before, after, target.field);

  return { success: true, patchedContent: patched, preview, warnings: [] };
}

function applyGenericHtmlPatch(rawContent: string, patch: ContentPatch, _target: { resolvedSelector: { selector: string } }): PatchApplyResult {
  const before = rawContent;
  const patched = rawContent.replace(patch.currentContent ?? "", patch.proposedContent);
  const preview = renderHtmlPreview(before, patched);

  return { success: true, patchedContent: patched, preview, warnings: [] };
}