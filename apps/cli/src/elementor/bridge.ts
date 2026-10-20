// @forge/cli/elementor-bridge (Sprint 25 / hardened in Sprint 26)
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
//   - every write is verified by re-reading the source AND comparing the
//     structural fingerprint (Sprint 26) — an HTTP 200 alone is never success
//   - rollback validates its payload, refuses to overwrite a document that
//     changed since the apply (default), and reports the final fingerprint
//
// All writes still pass through the provider/transport — there is no
// AI → WordPress or Generation → WordPress path.

import {
  parseElementorDocument,
  resolveElementorPatch,
  applyElementorMutations,
  verifyElementorMutation,
  mapUniversalPageToElementor,
  sanitizeElementorRichText,
  assertElementorContentCompatible,
  checkElementorDocumentSupport,
  inventoryElementorDocument,
  buildUniversalPage,
  ELEMENTOR_MIN_VERSION_MAJOR,
} from "@forge/dom-engine";
import type {
  ElementorDocument,
  ElementorPatchResolution,
  ElementorPatchResolutionCode,
  ResolvedElementorTarget,
  ElementorMutation,
  ElementorMutationVerification,
  ElementorDocumentInventory,
} from "@forge/dom-engine";
import type { UniversalPage } from "@forge/dom-engine";
import {
  ElementorTransportError,
} from "@forge/providers-wordpress";
import type {
  ElementorDocumentRead,
  ElementorDocumentWriteResult,
  ElementorSystemStatus,
} from "@forge/providers-wordpress";

// ─── Sprint 26: unified, typed failure taxonomy ─────────────────────────────

/**
 * Typed, actionable failure codes surfaced by the bridge (Sprint 26).
 * These are the primary CLI error surface — raw PHP/HTTP errors never are.
 */
export type ElementorBridgeErrorCode =
  | "ELEMENTOR_NOT_INSTALLED"
  | "ELEMENTOR_VERSION_UNSUPPORTED"
  | "PAGE_NOT_FOUND"
  | "NOT_ELEMENTOR_DOCUMENT"
  | "AUTHENTICATION_FAILED"
  | "DOCUMENT_UNAVAILABLE"
  | "DOCUMENT_STALE"
  | "UNSUPPORTED_WIDGET"
  | "UNSUPPORTED_SETTING"
  | "WRITE_FAILED"
  | "VERIFICATION_FAILED"
  | "ROLLBACK_FAILED"
  | "INVALID_ROLLBACK_PAYLOAD"
  | "PATCH_REJECTED";

export class ElementorBridgeError extends Error {
  public readonly code: ElementorBridgeErrorCode;

  constructor(code: ElementorBridgeErrorCode, message: string) {
    super(message);
    this.name = "ElementorBridgeError";
    this.code = code;
  }
}

/**
 * Map a typed transport failure to the unified bridge taxonomy.
 */
export function toBridgeError(error: unknown): ElementorBridgeError {
  if (error instanceof ElementorBridgeError) return error;
  if (error instanceof ElementorTransportError) {
    switch (error.code) {
      case "ELEMENTOR_ENDPOINT_UNAVAILABLE":
        return new ElementorBridgeError(
          "ELEMENTOR_NOT_INSTALLED",
          `The Forge Elementor bridge plugin is not installed or not reachable on this site. ` +
            `Install packages/providers-wordpress/companion/forge-elementor-bridge.php (v0.2.0+) and activate it. (${error.message})`,
        );
      case "AUTHENTICATION_FAILED":
        return new ElementorBridgeError("AUTHENTICATION_FAILED", `${error.message} Check the WordPress username/application password.`);
      case "ELEMENTOR_FORBIDDEN":
        return new ElementorBridgeError("AUTHENTICATION_FAILED", `The credentials cannot edit this document (edit_post capability required). ${error.message}`);
      case "ELEMENTOR_DOCUMENT_NOT_FOUND":
        return new ElementorBridgeError("PAGE_NOT_FOUND", `The target page does not exist (or is not a readable page/post). ${error.message}`);
      case "ELEMENTOR_NOT_ACTIVE":
        return new ElementorBridgeError("NOT_ELEMENTOR_DOCUMENT", `The target page is not an Elementor-managed document. ${error.message}`);
      case "ELEMENTOR_VERSION_CONFLICT":
        return new ElementorBridgeError("DOCUMENT_STALE", `The document changed remotely since it was read; the write was rejected (optimistic concurrency). Re-read and retry. ${error.message}`);
      case "ELEMENTOR_VERSION_UNSUPPORTED":
        return new ElementorBridgeError("ELEMENTOR_VERSION_UNSUPPORTED", `${error.message}`);
      case "WRITE_FAILED":
        return new ElementorBridgeError("WRITE_FAILED", `${error.message}`);
      case "VERIFICATION_FAILED":
        return new ElementorBridgeError("VERIFICATION_FAILED", `${error.message}`);
      default:
        return new ElementorBridgeError("DOCUMENT_UNAVAILABLE", `${error.message}`);
    }
  }
  return new ElementorBridgeError("DOCUMENT_UNAVAILABLE", error instanceof Error ? error.message : String(error));
}

/**
 * Map a deterministic patch-resolution failure to the unified taxonomy.
 */
export function resolutionToBridgeCode(code: ElementorPatchResolutionCode): ElementorBridgeErrorCode {
  switch (code) {
    case "PATCH_STALE":
      return "DOCUMENT_STALE";
    case "PATCH_WIDGET_TYPE_CHANGED":
      return "DOCUMENT_STALE";
    case "PATCH_TARGET_NOT_FOUND":
      return "DOCUMENT_STALE";
    case "PATCH_UNSUPPORTED_WIDGET":
      return "UNSUPPORTED_WIDGET";
    case "PATCH_UNSUPPORTED_SETTING":
      return "UNSUPPORTED_SETTING";
    case "PATCH_UNSUPPORTED_VERSION":
      return "ELEMENTOR_VERSION_UNSUPPORTED";
    default:
      return "PATCH_REJECTED";
  }
}

/**
 * Minimal provider surface the bridge needs (mockable in tests).
 * Sprint 26: `readElementorDocument` is the strict read — it throws typed
 * `ElementorTransportError`s so failures stay actionable instead of becoming
 * an opaque `null`.
 */
export interface ElementorProviderLike {
  readElementorDocument(postId: number | string): Promise<ElementorDocumentRead>;
  updateElementorDocument(
    postId: number | string,
    data: string,
    expected?: { elementorVersion?: string; fingerprint?: string; modified?: string },
  ): Promise<ElementorDocumentWriteResult>;
  /** Optional typed health source (companion plugin 0.2.0+). */
  getElementorSystemStatus?(): Promise<ElementorSystemStatus>;
}

export interface ElementorPatchInput {
  readonly id?: string;
  readonly currentContent?: string;
  readonly proposedContent: string;
  readonly target?: { format: "elementor"; elementId: string; settingsKey: string };
  readonly semanticIntent?: { kind: string; value?: string; sectionKind?: string };
  readonly sourceFingerprint?: string;
  /** Widget type the patch was reviewed against (Sprint 26 stale protection). */
  readonly expectedWidgetType?: string;
}

/**
 * Rollback payload: enough information to restore the exact document state
 * that SEO Forge modified — and (Sprint 26) to detect any newer edit made
 * after the apply.
 */
export interface ElementorRollbackPayload {
  readonly postId: number | string;
  readonly originalData: string;
  readonly originalFingerprint: string;
  readonly originalModified?: string;
  /** Fingerprint of the document immediately after the apply (Sprint 26). */
  readonly appliedFingerprint?: string;
  readonly appliedAt?: string;
  readonly patchId?: string;
  readonly executionId?: string;
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
  /** Typed bridge code for structured failures (Sprint 26). */
  readonly errorCode?: ElementorBridgeErrorCode;
  /** Structural fingerprint before the write (Sprint 26). */
  readonly fingerprintBefore?: string;
  /** Structural fingerprint after a verified write (Sprint 26). */
  readonly fingerprintAfter?: string;
}

export interface ElementorInspectResult {
  readonly postId: number | string;
  readonly title: string;
  /** Permalink (when the companion plugin provides it). */
  readonly pageUrl?: string;
  readonly elementorVersion?: string;
  readonly editMode?: string;
  readonly modified?: string;
  readonly support: ReturnType<typeof checkElementorDocumentSupport>;
  /** Structural document fingerprint (Sprint 26). */
  readonly fingerprint: string;
  readonly document: ElementorDocument;
  /** Deterministic widget inventory: supported/unsupported fields, text. */
  readonly inventory: ElementorDocumentInventory;
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
  /** Typed bridge code for structured failures (Sprint 26). */
  readonly errorCode?: ElementorBridgeErrorCode;
}

export interface ElementorRollbackResult {
  readonly restored: boolean;
  /** True when the rollback REFUSED to overwrite a newer document. */
  readonly refused: boolean;
  readonly message: string;
  /** Structural fingerprint of the document after the rollback attempt. */
  readonly finalFingerprint?: string;
}

// ─── Sprint 26: health / capability check ───────────────────────────────────

export interface ElementorHealthCheck {
  readonly id: string;
  readonly label: string;
  readonly ok: boolean;
  readonly detail?: string;
  readonly code?: ElementorBridgeErrorCode;
}

export interface ElementorHealthResult {
  readonly ok: boolean;
  readonly checks: ElementorHealthCheck[];
  readonly site?: ElementorSystemStatus;
  readonly document?: {
    readonly postId: number | string;
    readonly fingerprint: string;
    readonly elementorVersion?: string;
    readonly modified?: string;
    readonly supported: boolean;
  };
}

/**
 * Read + parse the live Elementor document. Throws typed ElementorBridgeError
 * on any transport/parse failure — failures are never collapsed into null.
 */
async function readLiveDocument(provider: ElementorProviderLike, postId: number | string): Promise<{ read: ElementorDocumentRead; document: ElementorDocument }> {
  const read = await provider.readElementorDocument(postId).catch((error: unknown) => {
    throw toBridgeError(error);
  });
  const document = parseElementorDocument(read.data, {
    postId: read.postId,
    title: read.title,
    elementorVersion: read.elementorVersion,
    editMode: read.editMode,
    modified: read.modified,
    source: "companion-endpoint",
  });
  if (!document) {
    throw new ElementorBridgeError("DOCUMENT_UNAVAILABLE", "The site returned _elementor_data that did not parse as an Elementor element array.");
  }
  return { read, document };
}

/**
 * Create the Elementor write bridge for a provider.
 */
export function createElementorBridge(provider: ElementorProviderLike) {
  return {
    /**
     * Read + parse an Elementor document and build the deterministic widget
     * inventory (Sprint 26: fingerprint, supported/unsupported fields,
     * normalized text). Never writes. Optional rendered HTML enables the
     * UniversalPage mapping.
     */
    async inspect(postId: number | string, renderedHtml?: string): Promise<ElementorInspectResult> {
      const { read, document } = await readLiveDocument(provider, postId);
      const support = checkElementorDocumentSupport(document);
      const inventory = inventoryElementorDocument(document);
      const universalMapping = renderedHtml ? buildUniversalMapping(renderedHtml, document) : undefined;
      return {
        postId: read.postId,
        title: read.title,
        pageUrl: read.url,
        elementorVersion: read.elementorVersion,
        editMode: read.editMode,
        modified: read.modified,
        support,
        fingerprint: document.fingerprint,
        document,
        inventory,
        universalMapping,
      };
    },

    /**
     * Typed health/capability check (Sprint 26). When a post id is provided,
     * the document-level checks (exists, Elementor-managed, readable, safely
     * writable) are performed as well.
     */
    async checkHealth(postId?: number | string): Promise<ElementorHealthResult> {
      const checks: ElementorHealthCheck[] = [];
      let site: ElementorSystemStatus | undefined;

      if (provider.getElementorSystemStatus) {
        try {
          site = await provider.getElementorSystemStatus();
          checks.push({ id: "wordpress-reachable", label: "WordPress reachable (REST)", ok: true });
          checks.push({ id: "authentication", label: "Authentication valid", ok: true });
          checks.push({
            id: "elementor-installed",
            label: "Elementor installed",
            ok: site.elementorInstalled,
            detail: site.elementorVersion ? `Elementor ${site.elementorVersion}` : undefined,
            code: site.elementorInstalled ? undefined : "ELEMENTOR_NOT_INSTALLED",
          });
          checks.push({
            id: "elementor-version",
            label: `Elementor version supported (>= ${site.minimumSupportedMajor}.x)`,
            ok: site.elementorSupported,
            detail: site.elementorVersion,
            code: site.elementorSupported ? undefined : "ELEMENTOR_VERSION_UNSUPPORTED",
          });
          checks.push({
            id: "bridge-plugin",
            label: "Forge bridge plugin",
            ok: true,
            detail: `v${site.pluginVersion}`,
          });
        } catch (error) {
          const bridgeError = toBridgeError(error);
          checks.push({ id: "system", label: "Companion system endpoint", ok: false, detail: bridgeError.message, code: bridgeError.code });
          return { ok: false, checks, site };
        }
      } else {
        checks.push({ id: "system", label: "Companion system endpoint", ok: false, detail: "Provider does not expose getElementorSystemStatus (update the bridge plugin to 0.2.0+)." });
      }

      let documentSummary: ElementorHealthResult["document"];
      if (postId !== undefined) {
        try {
          const { read, document } = await readLiveDocument(provider, postId);
          const support = checkElementorDocumentSupport(document);
          checks.push({ id: "page-exists", label: `Target page exists (id ${postId})`, ok: true, detail: read.title || undefined });
          checks.push({
            id: "elementor-managed",
            label: "Target page is Elementor-managed",
            ok: read.editMode === "builder" || read.editMode === "true",
            detail: `edit mode: ${read.editMode ?? "unknown"}`,
            code: read.editMode === "builder" || read.editMode === "true" ? undefined : "NOT_ELEMENTOR_DOCUMENT",
          });
          checks.push({ id: "document-readable", label: "Document can be read", ok: true, detail: `fingerprint ${document.fingerprint}` });
          checks.push({
            id: "document-writable",
            label: `Document can be safely written (version >= ${ELEMENTOR_MIN_VERSION_MAJOR}.x)`,
            ok: support.supported,
            detail: support.supported ? `layout: ${support.layout.join(", ")}` : support.reason,
            code: support.supported ? undefined : "ELEMENTOR_VERSION_UNSUPPORTED",
          });
          documentSummary = {
            postId: read.postId,
            fingerprint: document.fingerprint,
            elementorVersion: read.elementorVersion,
            modified: read.modified,
            supported: support.supported,
          };
        } catch (error) {
          const bridgeError = toBridgeError(error);
          checks.push({ id: "target-document", label: "Target document", ok: false, detail: bridgeError.message, code: bridgeError.code });
        }
      }

      return { ok: checks.every((check) => check.ok), checks, site, document: documentSummary };
    },

    /**
     * Resolve a patch against the live document (no mutation, no write).
     */
    async resolve(postId: number | string, patch: ElementorPatchInput): Promise<ElementorPatchResolution> {
      const { document } = await readLiveDocument(provider, postId);
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
      const { read, document } = await readLiveDocument(provider, postId);
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
     * whole document atomically, verify by re-reading AND comparing the
     * structural fingerprint (Sprint 26 — an HTTP 200 alone is never success),
     * and return rollback information. On write/verify failure the original
     * document is restored.
     */
    async apply(postId: number | string, patch: ElementorPatchInput, options: { dryRun?: boolean } = {}): Promise<ElementorWriteResult> {
      const dryRun = options.dryRun ?? true;
      const executionId = `elementor-${postId}-${Date.now()}`;

      const { read, document } = await readLiveDocument(provider, postId);

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
          errorCode: resolutionToBridgeCode(resolution.code),
          fingerprintBefore: document.fingerprint,
          message: `${resolution.code}: ${resolution.message}`,
        };
      }

      const problems: string[] = [];
      for (const target of resolution.targets) {
        problems.push(...assertElementorContentCompatible(target.widgetType, target.settingsKey, target.proposedValue));
      }
      if (problems.length > 0) {
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
          errorCode: "UNSUPPORTED_SETTING",
          fingerprintBefore: document.fingerprint,
          message: `Patch incompatible: ${problems.join("; ")}`,
        };
      }

      const mutation = applyElementorMutations(document, resolution.targets);
      const verification = verifyElementorMutation(document, mutation.document, resolution.targets);
      const rollbackPayload: ElementorRollbackPayload = {
        postId,
        originalData: document.rawData,
        originalFingerprint: document.fingerprint,
        originalModified: read.modified,
        appliedFingerprint: mutation.document.fingerprint,
        appliedAt: new Date().toISOString(),
        patchId: patch.id,
        executionId,
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
          fingerprintBefore: document.fingerprint,
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
          errorCode: "PATCH_REJECTED",
          fingerprintBefore: document.fingerprint,
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
        const rollback = await attemptRollback(provider, rollbackPayload, document.fingerprint);
        return {
          executionId,
          postId,
          dryRun,
          applied: false,
          rolledBack: rollback.ok,
          resolution,
          mutation,
          verification,
          rollbackPayload,
          errorCode: rollback.ok ? "WRITE_FAILED" : "ROLLBACK_FAILED",
          fingerprintBefore: document.fingerprint,
          message: `Write failed: ${error instanceof Error ? error.message : String(error)}` +
            (rollback.ok ? " Original document restored." : ` Rollback failed: ${rollback.message}`),
        };
      }

      // Verify by re-reading the source and comparing the STRUCTURAL
      // fingerprint (Sprint 26): tolerant of Elementor JSON reformatting,
      // sensitive to any content change. An HTTP 200 alone is never success.
      const reRead = await provider.readElementorDocument(postId).catch((error: unknown) => {
        throw toBridgeError(error);
      });
      const reParsed = parseElementorDocument(reRead.data, {
        postId: reRead.postId,
        elementorVersion: reRead.elementorVersion,
        editMode: reRead.editMode,
        modified: reRead.modified,
        source: "companion-endpoint",
      });
      const verified = reParsed !== null && reParsed.fingerprint === mutation.document.fingerprint;
      if (!verified) {
        const rollback = await attemptRollback(provider, rollbackPayload, mutation.document.fingerprint);
        return {
          executionId,
          postId,
          dryRun,
          applied: false,
          rolledBack: rollback.ok,
          resolution,
          mutation,
          verification,
          rollbackPayload,
          errorCode: rollback.ok ? "VERIFICATION_FAILED" : "ROLLBACK_FAILED",
          fingerprintBefore: document.fingerprint,
          message: "Verification failed: re-read document does not structurally match the written document." +
            (rollback.ok ? " Original document restored." : ` Rollback failed: ${rollback.message}`),
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
        fingerprintBefore: document.fingerprint,
        fingerprintAfter: reParsed.fingerprint,
        message: `Applied ${resolution.targets.length} target(s) and verified by structural re-read.`,
      };
    },

    /**
     * Rollback (Sprint 26): validate the payload, refuse to overwrite a
     * document that changed since the apply (default — see `force`), restore
     * the exact original document, and verify by structural fingerprint.
     */
    async rollback(rollbackPayload: ElementorRollbackPayload, options: { force?: boolean } = {}): Promise<ElementorRollbackResult> {
      // 1. Structural payload validation.
      if (rollbackPayload === null || typeof rollbackPayload !== "object") {
        return { restored: false, refused: false, message: "Invalid rollback payload: expected a JSON object." };
      }
      if (rollbackPayload.postId === undefined || typeof rollbackPayload.originalData !== "string" || rollbackPayload.originalData === "") {
        return { restored: false, refused: false, message: "Invalid rollback payload: missing postId or originalData.", };
      }
      const originalDoc = parseElementorDocument(rollbackPayload.originalData, {});
      if (!originalDoc) {
        return { restored: false, refused: false, message: "Invalid rollback payload: originalData did not parse as an Elementor element array." };
      }
      if (rollbackPayload.originalFingerprint !== undefined && rollbackPayload.originalFingerprint !== originalDoc.fingerprint) {
        return {
          restored: false,
          refused: false,
          message: `Invalid rollback payload: the recorded original fingerprint (${rollbackPayload.originalFingerprint}) does not match the payload data (${originalDoc.fingerprint}). The payload is corrupted or was produced by an incompatible SEO Forge version.`,
        };
      }

      // 2. Read the current document and refuse to overwrite newer work.
      let current: ElementorDocumentRead;
      try {
        current = await provider.readElementorDocument(rollbackPayload.postId);
      } catch (error) {
        throw toBridgeError(error);
      }
      const currentDoc = parseElementorDocument(current.data, {});
      if (!currentDoc) {
        return { restored: false, refused: false, message: "Rollback aborted: the remote document could not be parsed." };
      }
      if (rollbackPayload.appliedFingerprint !== undefined && currentDoc.fingerprint !== rollbackPayload.appliedFingerprint) {
        if (!options.force) {
          return {
            restored: false,
            refused: true,
            finalFingerprint: currentDoc.fingerprint,
            message:
              `Rollback REFUSED: the remote document changed since the original apply ` +
              `(current fingerprint ${currentDoc.fingerprint}, expected ${rollbackPayload.appliedFingerprint}). ` +
              `The document may contain newer work that would be lost. Re-apply or use --force to overwrite deliberately.`,
          };
        }
      }

      // 3. Restore the original document atomically (guarded by the current read).
      try {
        await provider.updateElementorDocument(rollbackPayload.postId, rollbackPayload.originalData, {
          elementorVersion: current.elementorVersion,
          modified: current.modified,
        });
      } catch (error) {
        const bridgeError = toBridgeError(error);
        return { restored: false, refused: false, finalFingerprint: currentDoc.fingerprint, message: `Rollback write failed: ${bridgeError.message}` };
      }

      // 4. Re-read and verify the restoration structurally.
      let reRead: ElementorDocumentRead;
      try {
        reRead = await provider.readElementorDocument(rollbackPayload.postId);
      } catch (error) {
        throw toBridgeError(error);
      }
      const reDoc = parseElementorDocument(reRead.data, {});
      if (!reDoc || reDoc.fingerprint !== originalDoc.fingerprint) {
        return {
          restored: false,
          refused: false,
          finalFingerprint: reDoc?.fingerprint,
          message: "Rollback verification failed: the re-read document does not structurally match the original.",
        };
      }
      return {
        restored: true,
        refused: false,
        finalFingerprint: reDoc.fingerprint,
        message: "Original Elementor document restored and verified.",
      };
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
      errorCode: resolutionToBridgeCode(resolution.code),
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
    appliedFingerprint: mutation.document.fingerprint,
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
 * Attempt to restore the original document during an apply failure.
 *
 * Safety (Sprint 26): before writing, the current remote document is read and
 * its structural fingerprint compared against `expectedCurrentFingerprint`.
 * If the remote changed during the operation the rollback REFUSES (the remote
 * may contain newer work). After writing, the restoration is verified by
 * structural fingerprint — never by HTTP status alone.
 */
async function attemptRollback(
  provider: ElementorProviderLike,
  payload: ElementorRollbackPayload,
  expectedCurrentFingerprint?: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    const current = await provider.readElementorDocument(payload.postId);
    const currentDoc = parseElementorDocument(current.data, {});
    if (!currentDoc) {
      return { ok: false, message: "Rollback aborted: the remote document could not be parsed." };
    }
    if (expectedCurrentFingerprint !== undefined && currentDoc.fingerprint !== expectedCurrentFingerprint) {
      return {
        ok: false,
        message: `Rollback refused: the remote document changed during the operation (expected fingerprint ${expectedCurrentFingerprint}, found ${currentDoc.fingerprint}).`,
      };
    }
    await provider.updateElementorDocument(payload.postId, payload.originalData, {
      elementorVersion: current.elementorVersion,
      modified: current.modified,
    });
    const reRead = await provider.readElementorDocument(payload.postId);
    const reDoc = parseElementorDocument(reRead.data, {});
    if (!reDoc || reDoc.fingerprint !== payload.originalFingerprint) {
      return { ok: false, message: "Rollback write did not verify against the re-read source." };
    }
    return { ok: true, message: "Original document restored." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

function buildUniversalMapping(renderedHtml: string, document: ElementorDocument) {
  const page: UniversalPage = buildUniversalPage(renderedHtml);
  return mapUniversalPageToElementor(page, document);
}

// Re-export helpers used by the CLI commands.
export { sanitizeElementorRichText };
