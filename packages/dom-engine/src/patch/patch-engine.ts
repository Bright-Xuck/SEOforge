// @forge/dom-engine
// Patch engine: routes ContentPatch to the correct resolver by format.

import type { ContentPatch, PatchApplyResult } from "../types.js";
import { applyPatch } from "../tree/tree-patcher.js";
import { findNodeByPath } from "../tree/tree-node.js";
import { renderStructuredPreview } from "../preview/structured-preview.js";
import { renderHtmlPreview } from "../preview/html-preview.js";
import { parseElementorDocument, serializeElementorDocument } from "../elementor/document.js";
import { resolveElementorPatch } from "../elementor/patch-resolver.js";
import { applyElementorMutations } from "../elementor/mutator.js";
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
  const document = parseElementorDocument(rawContent, {});
  if (!document) {
    return { success: false, patchedContent: rawContent, preview: { before: rawContent, after: rawContent, renderFidelity: "structured-diff", warnings: ["Invalid Elementor data"] }, warnings: ["Invalid Elementor data"] };
  }

  const patchLike = {
    id: patch.id,
    currentContent: patch.currentContent,
    proposedContent: patch.proposedContent,
    target: { format: "elementor" as const, elementId: target.elementId, settingsKey: target.settingsKey },
  };
  const expectedFingerprint =
    typeof (patch as ContentPatch & { sourceFingerprint?: string }).sourceFingerprint === "string"
      ? (patch as ContentPatch & { sourceFingerprint?: string }).sourceFingerprint
      : undefined;

  const resolution = resolveElementorPatch(document, patchLike, { expectedFingerprint });
  if (!resolution.ok) {
    const message = `${resolution.code}: ${resolution.message}`;
    return { success: false, patchedContent: rawContent, preview: { before: rawContent, after: rawContent, renderFidelity: "structured-diff", warnings: [message] }, warnings: [message] };
  }

  const before = JSON.stringify(resolution.targets[0]?.currentValue ?? null);
  const mutation = applyElementorMutations(document, resolution.targets);
  const after = JSON.stringify(mutation.diffs[0]?.after ?? null);

  const patched = serializeElementorDocument(mutation.document);
  const preview = renderStructuredPreview(before, after, resolution.targets[0]?.settingsKey ?? "settings");

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