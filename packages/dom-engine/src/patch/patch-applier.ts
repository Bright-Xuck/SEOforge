// @forge/dom-engine
// Patch applier: orchestrates resolve -> validate -> apply -> serialize.

import type { ContentPatch, PatchApplyResult, PatchPreview } from "../types.js";
import { applyContentPatch } from "./patch-engine.js";
import { mergePatches } from "./patch-merger.js";

/**
 * Apply a list of patches to raw content.
 */
export async function applyPatches(rawContent: string, patches: ContentPatch[]): Promise<PatchApplyResult> {
  const { patches: sorted, conflicts } = mergePatches(patches);

  let currentContent = rawContent;
  const allWarnings: string[] = [...conflicts];
  let lastPreview: PatchPreview = {
    before: rawContent,
    after: rawContent,
    renderFidelity: "exact-html",
    warnings: allWarnings,
  };

  for (const patch of sorted) {
    const result = await applyContentPatch(currentContent, patch);
    if (!result.success) {
      allWarnings.push(...result.warnings);
      continue;
    }
    currentContent = result.patchedContent;
    lastPreview = result.preview;
  }

  return {
    success: true,
    patchedContent: currentContent,
    preview: lastPreview,
    warnings: allWarnings,
  };
}
