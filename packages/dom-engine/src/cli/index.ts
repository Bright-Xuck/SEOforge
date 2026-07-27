// @forge/dom-engine
// CLI commands for DOM inspection and patching.

import type { ContentPatch, DetectedFormat } from "../types.js";
import { detectFormat } from "../format-detector.js";
import { parseElementorData } from "../elementor/elementor-parser.js";
import { parseGutenbergBlocks } from "../gutenberg/block-grammar-parser.js";
import { mapHtmlToDom } from "../generic-html/html-dom-mapper.js";
import { applyPatches } from "../patch/patch-applier.js";

/**
 * Map a page to its structured representation.
 */
export async function mapPage(rawContent: string, elementorData?: string, elementorEditMode?: string): Promise<{
  format: DetectedFormat;
  tree: unknown;
}> {
  const { format } = detectFormat(elementorData, elementorEditMode, rawContent);

  switch (format) {
    case "elementor":
      const elementorTree = parseElementorData(elementorData ?? "");
      return { format, tree: elementorTree };
    case "gutenberg":
      const gutenbergTree = parseGutenbergBlocks(rawContent);
      return { format, tree: gutenbergTree };
    case "generic-html":
      const domSections = mapHtmlToDom(rawContent);
      return { format, tree: domSections };
    default:
      return { format: "generic-html", tree: null };
  }
}

/**
 * Preview patches against raw content.
 */
export async function previewPatches(rawContent: string, patches: ContentPatch[]): Promise<{
  success: boolean;
  preview: unknown;
  warnings: string[];
}> {
  const result = await applyPatches(rawContent, patches);
  return {
    success: result.success,
    preview: result.preview,
    warnings: result.warnings,
  };
}

/**
 * Apply patches to raw content.
 */
export async function patchContent(rawContent: string, patches: ContentPatch[]): Promise<{
  success: boolean;
  patchedContent: string;
  warnings: string[];
}> {
  const result = await applyPatches(rawContent, patches);
  return {
    success: result.success,
    patchedContent: result.patchedContent,
    warnings: result.warnings,
  };
}

/**
 * Validate patches against raw content.
 */
export async function validatePatches(rawContent: string, patches: ContentPatch[]): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  for (const patch of patches) {
    const result = await applyPatches(rawContent, [patch]);
    if (!result.success) {
      errors.push(...result.warnings);
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Inspect a page: detect format and return summary.
 */
export async function inspectPage(rawContent: string, elementorData?: string, elementorEditMode?: string): Promise<{
  format: DetectedFormat;
  confidence: number;
  metadata: Record<string, unknown>;
}> {
  const result = detectFormat(elementorData, elementorEditMode, rawContent);
  return {
    format: result.format,
    confidence: result.confidence,
    metadata: result.metadata,
  };
}
