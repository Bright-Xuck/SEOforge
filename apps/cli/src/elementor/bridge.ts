// @forge/cli/elementor-bridge (Sprint 25)
//
// The Elementor/WordPress write bridge. This is the composition root that
// connects the provider-neutral Elementor document layer (@forge/dom-engine)
// with the provider-specific transport (@forge/providers-wordpress).
//
// It lives in the CLI so no package boundary changes: the CLI already depends
// on dom-engine, providers-wordpress, and execution-engine.
//
// Safety properties enforced here:
//   - dry-run performs ZERO remote mutations (resolve + validate + preview only)
//   - resolution is deterministic and conservative (typed error codes)
//   - stale patches are rejected, never silently applied
//   - the whole document is mutated locally then written atomically
//   - every write is verified by re-reading the source
//   - rollback restores the exact original document
//
// All writes still pass through the Execution Engine (see the CLI apply
// command) — there is no AI → WordPress or Generation → WordPress path.

import {
  parseElementorDocument,
  resolveElementorPatch,
  applyElementorMutations,
  verifyElementorMutation,
  mapUniversalPageToElementor,
  sanitizeElementorRichText,
  assertElementorContentCompatible,
  checkElementorDocumentSupport,
  buildUniversalPage,
} from "@forge/dom-engine";
import type {
  ElementorDocument,
  ElementorPatchResolution,
  ResolvedElementorTarget,
  ElementorMutation,
  ElementorMutationVerification,
} from "@forge/dom-engine";
import type { UniversalPage } from "@forge/dom-engine";
import type { ElementorDocumentRead, ElementorDocumentWriteResult } from "@forge/providers-wordpress";

/**
 * Minimal provider surface the bridge needs (mockable in tests).
 */
export interface ElementorProviderLike {
  getElementorDocument(postId: number | string): Promise<ElementorDocumentRead | null>;
  updateElementorDocument(
    postId: number | string,
    data: string,
    expected?: { elementorVersion?: string; fingerprint?: string; modified?: string },
  ): Promise<ElementorDocumentWriteResult>;
}

export interface ElementorPatchInput {
  readonly id?: string;
  readonly currentContent?: string;
  readonly proposedContent: string;
  readonly target?: { format: "elementor"; elementId: string; settingsKey: string };
  readonly semanticIntent?: { kind: string; value?: string; sectionKind?: string };
  readonly sourceFingerprint?: string;
}

/**
 * Rollback payload: enough information to restore the exact document state
 * that SEO Forge modified.
 */
export interface ElementorRollbackPayload {
  readonly postId: number | string;
  readonly originalData: string;
  readonly originalFingerprint: string;
  readonly originalModified?: string;
}

export interface ElementorWriteResult {
  readonly executionId: string;
  readonly postId: number | string;
  readonly dryRun: boolean;
  readonly applied: boolean;
  readonly rolledBack: boolean;
  readonly resolution: ElementorPatchResolution;
  readonly mutation: ElementorMutation | null;
  readonly verification: ElementorMutationVerification | null;
  readonly rollbackPayload: ElementorRollbackPayload | null;
  readonly message: string;
}

export interface ElementorInspectResult {
  readonly postId: number | string;
  readonly title: string;
  readonly elementorVersion?: string;
  readonly editMode?: string;
  readonly support: ReturnType<typeof checkElementorDocumentSupport>;
  readonly document: ElementorDocument;
  readonly widgetCount: number;
  readonly editableWidgets: { elementId: string; widgetType: string; settingsKeys: string[]; richText: boolean }[];
  readonly universalMapping?: ReturnType<typeof mapUniversalPageToElementor>;
}

export interface ElementorPreviewResult {
  readonly postId: number | string;
  readonly resolution: ElementorPatchResolution;
  readonly targets: ResolvedElementorTarget[];
  readonly mutation: ElementorMutation | null;
  readonly rollbackPayload: ElementorRollbackPayload | null;
  readonly compatible: boolean;
  readonly problems: string[];
  readonly message: string;
}

const WIDGET_TEXT_SETTING_KEYS = ["title", "editor", "text"];

/**
 * Create the Elementor write bridge for a provider.
 */
export function createElementorBridge(provider: ElementorProviderLike) {
  return {
    /**
     * Read + parse an Elementor document and inventory its editable widgets.
     * Never writes. Optional rendered HTML enables the UniversalPage mapping.
     */
    async inspect(postId: number | string, renderedHtml?: string): Promise<ElementorInspectResult> {
      const read = await provider.getElementorDocument(postId);
      if (!read) {
        throw new Error(
          "ELEMENTOR_ENDPOINT_UNAVAILABLE: The Forge Elementor companion endpoint is not available on this site. " +
            "Install the forge-elementor-bridge plugin (packages/providers-wordpress/companion) to read/write Elementor documents.",
        );
      }
      const document = parseElementorDocument(read.data, {
        postId: read.postId,
        title: read.title,
        elementorVersion: read.elementorVersion,
        editMode: read.editMode,
        modified: read.modified,
        source: "companion-endpoint",
      });
      if (!document) {
        throw new Error("ELEMENTOR_INVALID_DOCUMENT: The site returned _elementor_data that did not parse.");
      }
      const support = checkElementorDocumentSupport(document);
      const editable = inventoryEditableWidgets(document);
      const universalMapping = renderedHtml ? buildUniversalMapping(renderedHtml, document) : undefined;
      return {
        postId: read.postId,
        title: read.title,
        elementorVersion: read.elementorVersion,
        editMode: read.editMode,
        support,
        document,
        widgetCount: countWidgets(document),
        editableWidgets: editable,
        universalMapping,
      };
    },

    /**
     * Resolve a patch against the live document (no mutation, no write).
     */
    async resolve(postId: number | string, patch: ElementorPatchInput): Promise<ElementorPatchResolution> {
      const read = await provider.getElementorDocument(postId);
      if (!read) throw new Error("ELEMENTOR_ENDPOINT_UNAVAILABLE: companion endpoint not available.");
      const document = parseElementorDocument(read.data, {
        postId: read.postId,
        elementorVersion: read.elementorVersion,
        editMode: read.editMode,
        modified: read.modified,
        source: "companion-endpoint",
      });
      if (!document) throw new Error("ELEMENTOR_INVALID_DOCUMENT: _elementor_data did not parse.");
      return resolveElementorPatch(document, patch, {
        expectedFingerprint: patch.sourceFingerprint,
      });
    },

    /**
     * Preview the exact proposed change for a patch.
     * Resolves + mutates locally and produces the rollback payload.
     * Performs ZERO remote mutations.
     */
    async preview(postId: number | string, patch: ElementorPatchInput): Promise<ElementorPreviewResult> {
      const read = await provider.getElementorDocument(postId);
      if (!read) throw new Error("ELEMENTOR_ENDPOINT_UNAVAILABLE: companion endpoint not available.");
      const document = parseElementorDocument(read.data, {
        postId: read.postId,
        elementorVersion: read.elementorVersion,
        editMode: read.editMode,
        modified: read.modified,
        source: "companion-endpoint",
      });
      if (!document) throw new Error("ELEMENTOR_INVALID_DOCUMENT: _elementor_data did not parse.");
      return buildPreview(document, read, patch);
    },

    /**
     * Validate a patch: resolution + content compatibility + mutation validity.
     * Never writes.
     */
    async validate(postId: number | string, patch: ElementorPatchInput): Promise<ElementorPreviewResult> {
      return this.preview(postId, patch);
    },

    /**
     * Apply a patch.
     *
     * dryRun=true (default): resolve + mutate + verify locally, produce the
     * exact proposed change and rollback payload, perform ZERO remote writes.
     *
     * dryRun=false: resolve (blocks on error codes), mutate locally, write the
     * whole document atomically, verify by re-reading, and return rollback
     * information. On write/verify failure the original document is restored.
     */
    async apply(postId: number | string, patch: ElementorPatchInput, options: { dryRun?: boolean } = {}): Promise<ElementorWriteResult> {
      const dryRun = options.dryRun ?? true;
      const executionId = `elementor-${postId}-${Date.now()}`;

      const read = await provider.getElementorDocument(postId);
      if (!read) throw new Error("ELEMENTOR_ENDPOINT_UNAVAILABLE: companion endpoint not available.");
      const document = parseElementorDocument(read.data, {
        postId: read.postId,
        elementorVersion: read.elementorVersion,
        editMode: read.editMode,
        modified: read.modified,
        source: "companion-endpoint",
      });
      if (!document) throw new Error("ELEMENTOR_INVALID_DOCUMENT: _elementor_data did not parse.");

      const resolution = resolveElementorPatch(document, patch, {
        expectedFingerprint: patch.sourceFingerprint,
      });
      if (!resolution.ok) {
        return {
          executionId,
          postId,
          dryRun,
          applied: false,
          rolledBack: false,
          resolution,
          mutation: null,
          verification: null,
          rollbackPayload: null,
          message: `${resolution.code}: ${resolution.message}`,
        };
      }

      const mutation = applyElementorMutations(document, resolution.targets);
      const verification = verifyElementorMutation(document, mutation.document, resolution.targets);
      const rollbackPayload: ElementorRollbackPayload = {
        postId,
        originalData: document.rawData,
        originalFingerprint: document.fingerprint,
        originalModified: read.modified,
      };

      if (dryRun) {
        return {
          executionId,
          postId,
          dryRun: true,
          applied: false,
          rolledBack: false,
          resolution,
          mutation,
          verification,
          rollbackPayload,
          message: "Dry run: no remote mutation performed.",
        };
      }

      if (!verification.ok) {
        return {
          executionId,
          postId,
          dryRun,
          applied: false,
          rolledBack: false,
          resolution,
          mutation,
          verification,
          rollbackPayload,
          message: `Mutation verification failed locally: ${verification.errors.join("; ")}`,
        };
      }

      try {
        await provider.updateElementorDocument(postId, mutation.document.rawData, {
          elementorVersion: read.elementorVersion,
          fingerprint: document.fingerprint,
          modified: read.modified,
        });
      } catch (error) {
        // Write failed — attempt rollback to the original document.
        const rollbackError = await attemptRollback(provider, postId, rollbackPayload);
        return {
          executionId,
          postId,
          dryRun,
          applied: false,
          rolledBack: rollbackError === null,
          resolution,
          mutation,
          verification,
          rollbackPayload,
          message: `Write failed: ${error instanceof Error ? error.message : String(error)}` +
            (rollbackError === null ? " Original document restored." : ` Rollback also failed: ${rollbackError}`),
        };
      }

      // Verify by re-reading the source (structural fingerprint must match the
      // locally-mutated document).
      const reRead = await provider.getElementorDocument(postId);
      const verified = reRead !== null && reRead.data === mutation.document.rawData;
      if (!verified) {
        const rollbackError = await attemptRollback(provider, postId, rollbackPayload);
        return {
          executionId,
          postId,
          dryRun,
          applied: false,
          rolledBack: rollbackError === null,
          resolution,
          mutation,
          verification,
          rollbackPayload,
          message: "Verification failed: re-read document does not match the written document." +
            (rollbackError === null ? " Original document restored." : ` Rollback also failed: ${rollbackError}`),
        };
      }

      return {
        executionId,
        postId,
        dryRun,
        applied: true,
        rolledBack: false,
        resolution,
        mutation,
        verification,
        rollbackPayload,
        message: `Applied ${resolution.targets.length} target(s) and verified by re-read.`,
      };
    },

    /**
     * Rollback: restore the exact original document and verify.
     */
    async rollback(rollbackPayload: ElementorRollbackPayload): Promise<{ restored: boolean; message: string }> {
      const error = await attemptRollback(provider, rollbackPayload.postId, rollbackPayload);
      if (error !== null) {
        return { restored: false, message: error };
      }
      return { restored: true, message: "Original Elementor document restored and verified." };
    },
  };
}

export type ElementorBridge = ReturnType<typeof createElementorBridge>;

/**
 * Build a preview/validation result (shared by preview + validate).
 */
function buildPreview(
  document: ElementorDocument,
  read: ElementorDocumentRead,
  patch: ElementorPatchInput,
): ElementorPreviewResult {
  const resolution = resolveElementorPatch(document, patch, {
    expectedFingerprint: patch.sourceFingerprint,
  });
  if (!resolution.ok) {
    return {
      postId: read.postId,
      resolution,
      targets: [],
      mutation: null,
      rollbackPayload: null,
      compatible: false,
      problems: [resolution.message],
      message: `${resolution.code}: ${resolution.message}`,
    };
  }

  const problems: string[] = [];
  for (const target of resolution.targets) {
    problems.push(...assertElementorContentCompatible(target.widgetType, target.settingsKey, target.proposedValue));
  }

  const mutation = applyElementorMutations(document, resolution.targets);
  const rollbackPayload: ElementorRollbackPayload = {
    postId: read.postId,
    originalData: document.rawData,
    originalFingerprint: document.fingerprint,
    originalModified: read.modified,
  };

  return {
    postId: read.postId,
    resolution,
    targets: resolution.targets,
    mutation,
    rollbackPayload,
    compatible: problems.length === 0,
    problems,
    message: problems.length === 0 ? "Patch is compatible and resolves to a single target." : `Patch incompatible: ${problems.join("; ")}`,
  };
}

/**
 * Attempt to restore the original document; returns an error message on failure.
 */
async function attemptRollback(
  provider: ElementorProviderLike,
  postId: number | string,
  payload: ElementorRollbackPayload,
): Promise<string | null> {
  try {
    const result = await provider.updateElementorDocument(postId, payload.originalData, {
      modified: payload.originalModified,
    });
    if (!result.reRead || result.reRead.data !== payload.originalData) {
      return "Rollback write did not verify against the re-read source.";
    }
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

function inventoryEditableWidgets(document: ElementorDocument): { elementId: string; widgetType: string; settingsKeys: string[]; richText: boolean }[] {
  const widgets: { elementId: string; widgetType: string; settingsKeys: string[]; richText: boolean }[] = [];
  const walk = (node: ElementorDocument["root"]): void => {
    if (node.widgetType) {
      const keys = WIDGET_TEXT_SETTING_KEYS.filter((key) => key in node.settings);
      if (keys.length > 0) {
        widgets.push({
          elementId: node.id,
          widgetType: node.widgetType,
          settingsKeys: keys,
          richText: keys.some((key) => typeof node.settings[key] === "string" && /<[a-zA-Z]/.test(String(node.settings[key]))),
        });
      }
    }
    for (const child of node.children) walk(child);
  };
  walk(document.root);
  return widgets;
}

function countWidgets(document: ElementorDocument): number {
  let count = 0;
  const walk = (node: ElementorDocument["root"]): void => {
    if (node.widgetType) count++;
    for (const child of node.children) walk(child);
  };
  walk(document.root);
  return count;
}

function buildUniversalMapping(renderedHtml: string, document: ElementorDocument) {
  const page: UniversalPage = buildUniversalPage(renderedHtml);
  return mapUniversalPageToElementor(page, document);
}

// Re-export helpers used by the CLI commands.
export { sanitizeElementorRichText };
