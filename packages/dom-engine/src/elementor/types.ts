// @forge/dom-engine
// Type barrel for the Sprint 25 Elementor document layer.

export type {
  ElementorDocument,
  ElementorDocumentMeta,
  ElementorDocumentSupport,
} from "./document.js";

export type {
  ElementorElementMapEntry,
  ElementorElementMap,
  ElementorMapStrategy,
} from "./universal-mapper.js";

export type {
  ElementorPatchResolutionCode,
  ElementorTargetStrategy,
  ResolvedElementorTarget,
  ElementorPatchResolution,
  ElementorPatchLike,
  ElementorResolveOptions,
} from "./patch-resolver.js";

export type {
  ElementorSettingDiff,
  ElementorMutation,
  ElementorMutationVerification,
} from "./mutator.js";
