// @forge/dom-engine
// Public API for the Structured Content Patching Engine.

export type {
  PatchOperation,
  PatchFormat,
  ElementorPatchTarget,
  GutenbergPatchTarget,
  GenericHtmlPatchTarget,
  PatchTarget,
  SemanticIntent,
  ContentPatch,
  SectionDiff,
  ValidationReport,
  ContentNode,
  BlockFingerprint,
  ResolvedSelector,
  PatchPreview,
  DetectedFormat,
  FormatDetectionResult,
  TreeDiffEntry,
  PatchApplyResult,
  MergeResult,
} from "./types.js";

export { detectFormat, isGutenbergContent, isActiveElementor } from "./format-detector.js";
export { createLeaf, createNode, findNodeById, findNodeByPath, cloneTree, fingerprintNode } from "./tree/tree-node.js";
export { applyPatch, diffTrees } from "./tree/tree-patcher.js";
export { computeTreeDiff } from "./tree/tree-differ.js";
export { validatePatch, validatePatchSequence } from "./tree/tree-validator.js";
export { parseElementorData } from "./elementor/elementor-parser.js";
export { serializeElementorData } from "./elementor/elementor-serializer.js";
export { resolveElementorSettingsKey, ELEMENTOR_WIDGET_SCHEMA } from "./elementor/widget-schema.js";
export { resolveElementorTarget, buildElementorTarget } from "./elementor/elementor-target-resolver.js";
export { parseGutenbergBlocks, extractBlockNames } from "./gutenberg/block-grammar-parser.js";
export { serializeGutenbergBlocks, serializeGutenbergPost } from "./gutenberg/block-grammar-serializer.js";
export { computeBlockFingerprint, fingerprintsEqual } from "./gutenberg/block-fingerprint.js";
export { resolveGutenbergTarget } from "./gutenberg/gutenberg-target-resolver.js";
export { mapHtmlToDom, domSectionToContentNode } from "./generic-html/html-dom-mapper.js";
export { resolveSelector } from "./generic-html/selector-resolver.js";
export { buildTextAnchor, buildSiblingAnchor, buildHeadingAnchor, buildStructuralPath, resolveAnchor } from "./generic-html/anchor-builder.js";
export { resolveGenericTarget, resolveGenericBlock } from "./generic-html/generic-target-resolver.js";
export { applyContentPatch } from "./patch/patch-engine.js";
export { validatePatchAgainstTree } from "./patch/patch-validator.js";
export { mergePatches } from "./patch/patch-merger.js";
export { applyPatches } from "./patch/patch-applier.js";
export { renderStructuredPreview } from "./preview/structured-preview.js";
export { renderHtmlPreview } from "./preview/html-preview.js";
export { mapPage, previewPatches, patchContent, validatePatches, inspectPage } from "./cli/index.js";
