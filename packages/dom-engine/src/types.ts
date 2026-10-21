// @forge/dom-engine
// Shared types for the Structured Content Patching Engine.
// Sprint 21: supports Elementor JSON tree, Gutenberg block grammar, and generic HTML.

/**
 * JSON Patch operation verbs (RFC 6902 subset used by this engine).
 */
export type PatchOperation = "add" | "remove" | "replace" | "move" | "copy" | "test";

/**
 * Target format discriminator — determines which resolver applies a patch.
 */
export type PatchFormat = "elementor" | "gutenberg" | "generic-html";

/**
 * Elementor patch target: existing element id + settings key.
 * Example: { elementId: "6a637978", settingsKey: "title" }
 */
export interface ElementorPatchTarget {
  readonly format: "elementor";
  readonly elementId: string;
  readonly settingsKey: string;
  /** WordPress post/page id that owns the document. */
  readonly pageId?: number;
  /** Widget type observed when the patch was created (stale guard). */
  readonly expectedWidgetType?: string;
  /** Elementor document fingerprint observed when the patch was created. */
  readonly sourceFingerprint?: string;
  /** Whether the control stores rich text HTML. */
  readonly richText?: boolean;
}

/**
 * Gutenberg patch target: structural path + content fingerprint + field name.
 * Example: { blockPath: [2, 0], fingerprint: {...}, field: "content" }
 */
export interface GutenbergPatchTarget {
  readonly format: "gutenberg";
  readonly blockPath: number[];
  readonly fingerprint: BlockFingerprint;
  readonly field: string;
}

/**
 * Generic HTML patch target: resolved selector with confidence metadata.
 */
export interface GenericHtmlPatchTarget {
  readonly format: "generic-html";
  readonly resolvedSelector: ResolvedSelector;
}

/**
 * Discriminated union of all patch targets.
 */
export type PatchTarget = ElementorPatchTarget | GutenbergPatchTarget | GenericHtmlPatchTarget;

/**
 * Semantic intent carried by a ContentPatch when the meaning is unambiguous.
 * Used by dom-engine to translate AI output into a concrete PatchTarget.
 */
export interface SemanticIntent {
  readonly kind: string;
  readonly value: string;
  readonly sectionKind?: string;
}

/**
 * A self-contained patch describing a proposed content change.
 * Extends the existing ContentPatch model with format-aware targeting.
 */
export interface ContentPatch {
  readonly id: string;
  readonly sectionId: string;
  readonly operation: PatchOperation;
  readonly selector?: string;
  readonly currentContent?: string;
  readonly proposedContent: string;
  readonly diff?: SectionDiff;
  readonly validation: ValidationReport;
  readonly confidence: number;
  readonly estimatedImpact: string;
  readonly warnings: string[];
  readonly generatedBy: string;
  readonly provider: string;
  readonly promptVersion: string;
  readonly createdAt: string;
  readonly target?: PatchTarget;
  readonly semanticIntent?: SemanticIntent;
  /** Document fingerprint captured when the patch was created (stale guard). */
  readonly sourceFingerprint?: string;
}

/**
 * Section diff metadata.
 */
export interface SectionDiff {
  readonly sectionId: string;
  readonly current: string;
  readonly generated: string;
  readonly changedSentences: string[];
  readonly addedEntities: string[];
  readonly removedEntities: string[];
  readonly seoScoreDelta: number;
}

/**
 * Validation report for a generated or patched section.
 */
export interface ValidationReport {
  readonly valid: boolean;
  readonly errors: string[];
  readonly warnings: string[];
}

/**
 * Generic tree node used by both Elementor and Gutenberg parsers.
 */
export interface ContentNode {
  readonly id: string;
  readonly type: string;
  readonly widgetType?: string;
  readonly settings: Record<string, unknown>;
  readonly children: ContentNode[];
  readonly raw: unknown;
}

/**
 * Gutenberg block fingerprint for stable addressing across saves.
 */
export interface BlockFingerprint {
  readonly hash: string;
  readonly blockName: string;
  readonly stableAttrs: Record<string, unknown>;
  readonly siblingIndex: number;
}

/**
 * Resolved selector with strategy and confidence metadata.
 */
export interface ResolvedSelector {
  readonly selector: string;
  readonly confidence: number;
  readonly strategy: "attribute" | "text-anchor" | "structural" | "sibling" | "css" | "xpath";
}

/**
 * Patch preview with honest render fidelity reporting.
 */
export interface PatchPreview {
  readonly before: string;
  readonly after: string;
  readonly diff?: string;
  readonly renderFidelity: "exact-html" | "structured-diff";
  readonly warnings: string[];
}

/**
 * Detected page format.
 */
export type DetectedFormat = "elementor" | "gutenberg" | "generic-html";

/**
 * Format detection result.
 */
export interface FormatDetectionResult {
  readonly format: DetectedFormat;
  readonly confidence: number;
  readonly metadata: Record<string, unknown>;
}

/**
 * Tree diff entry.
 */
export interface TreeDiffEntry {
  readonly path: string[];
  readonly operation: PatchOperation;
  readonly oldValue?: unknown;
  readonly newValue?: unknown;
}

/**
 * Patch application result.
 */
export interface PatchApplyResult {
  readonly success: boolean;
  readonly patchedContent: string;
  readonly preview: PatchPreview;
  readonly warnings: string[];
}

/**
 * Merge result for multiple patches.
 */
export interface MergeResult {
  readonly patches: ContentPatch[];
  readonly conflicts: string[];
  readonly order: string[];
}
