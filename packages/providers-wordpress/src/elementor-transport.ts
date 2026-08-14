// @forge/providers-wordpress/elementor-transport
// Elementor document transport (Sprint 25).
//
// Elementor stores page structure as structured JSON in the `_elementor_data`
// post meta. That meta is PRIVATE — it is not exposed through the standard
// wp/v2 REST API. Direct REST access to Elementor's internal data is therefore
// not safely available (Path B rejected). SEO Forge uses a minimal optional
// companion plugin (Path C) that exposes a controlled, authenticated interface:
//
//   GET  /wp-json/forge/v1/elementor/documents/{id}
//   PUT  /wp-json/forge/v1/elementor/documents/{id}
//
// The plugin performs the actual save through Elementor's native server-side
// API (Path D) with optimistic concurrency. This transport is provider-
// specific: it knows WordPress REST endpoints, Elementor meta names, and
// authentication. It deals in raw JSON strings — it never parses Elementor
// structure. Everything below this layer stays provider-neutral.

import type { WordPressClient } from "./client.js";

export type ElementorTransportErrorCode =
  | "ELEMENTOR_ENDPOINT_UNAVAILABLE"
  | "ELEMENTOR_DOCUMENT_NOT_FOUND"
  | "ELEMENTOR_VERSION_CONFLICT"
  | "ELEMENTOR_FORBIDDEN"
  | "ELEMENTOR_NOT_ACTIVE"
  | "ELEMENTOR_INVALID_RESPONSE";

export class ElementorTransportError extends Error {
  public readonly code: ElementorTransportErrorCode;
  public readonly statusCode?: number;

  constructor(code: ElementorTransportErrorCode, message: string, statusCode?: number) {
    super(message);
    this.name = "ElementorTransportError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Raw Elementor document read from the companion endpoint.
 */
export interface ElementorDocumentRead {
  /** WordPress post/page ID. */
  readonly postId: number | string;
  readonly title: string;
  readonly type: string;
  /** Elementor plugin version (e.g. "3.24.0"). */
  readonly elementorVersion?: string;
  /** Elementor edit mode marker. */
  readonly editMode?: string;
  /** Raw `_elementor_data` JSON string. */
  readonly data: string;
  /** Last modified timestamp. */
  readonly modified?: string;
}

/**
 * Result of a successful write.
 */
export interface ElementorDocumentWriteResult {
  readonly postId: number | string;
  readonly written: boolean;
  /** Re-read document after write (verification source). */
  readonly reRead?: ElementorDocumentRead;
}

/**
 * Companion endpoint base path (registered by the forge-elementor-bridge plugin).
 */
export const ELEMENTOR_COMPANION_PATH = "wp-json/forge/v1/elementor/documents";

/**
 * Extract an HTTP status code from any thrown value (the REST client throws
 * plain objects with a statusCode field, not Error instances).
 */
function extractStatus(error: unknown): number | undefined {
  if (error && typeof error === "object" && "statusCode" in error) {
    const status = (error as { statusCode?: unknown }).statusCode;
    if (typeof status === "number") return status;
  }
  return undefined;
}

/**
 * HTTP status → transport error mapping.
 */
function mapStatus(status: number, fallback: string): ElementorTransportError {
  switch (status) {
    case 401:
    case 403:
      return new ElementorTransportError("ELEMENTOR_FORBIDDEN", "Forbidden: the credentials cannot edit this Elementor document.", status);
    case 404:
      return new ElementorTransportError("ELEMENTOR_DOCUMENT_NOT_FOUND", "Elementor document not found.", status);
    case 409:
      return new ElementorTransportError("ELEMENTOR_VERSION_CONFLICT", "Elementor document changed remotely; the write was rejected (optimistic concurrency).", status);
    case 501:
      return new ElementorTransportError("ELEMENTOR_NOT_ACTIVE", "Elementor is not active on the site or the document is not Elementor-built.", status);
    default:
      return new ElementorTransportError("ELEMENTOR_INVALID_RESPONSE", fallback, status);
  }
}

/**
 * Provider-specific Elementor document transport.
 */
export class ElementorDocumentTransport {
  private readonly client: WordPressClient;
  private readonly basePath: string;

  constructor(client: WordPressClient, basePath: string = ELEMENTOR_COMPANION_PATH) {
    this.client = client;
    this.basePath = basePath;
  }

  /**
   * Probe whether the companion endpoint is available.
   * A 404 on a real post id means the plugin is missing (endpoint unavailable),
   * which we surface distinctly from "document not found".
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.client.rawRequest(`${this.basePath}/0`, "GET");
      return true;
    } catch (error) {
      if (error instanceof ElementorTransportError) return false;
      return false;
    }
  }

  /**
   * Read an Elementor document (raw `_elementor_data` JSON string + meta).
   */
  async readDocument(postId: number | string): Promise<ElementorDocumentRead> {
    let response: Record<string, unknown>;
    try {
      response = await this.client.rawRequest<Record<string, unknown>>(`${this.basePath}/${postId}`, "GET");
    } catch (error) {
      throw this.rethrowReadError(error, postId);
    }

    if (typeof response.data !== "string" || response.data.length === 0) {
      throw new ElementorTransportError(
        "ELEMENTOR_INVALID_RESPONSE",
        "Companion endpoint returned no _elementor_data payload.",
      );
    }

    return {
      postId: (response.postId as number | string | undefined) ?? postId,
      title: typeof response.title === "string" ? response.title : "",
      type: typeof response.type === "string" ? response.type : "page",
      elementorVersion: typeof response.elementorVersion === "string" ? response.elementorVersion : undefined,
      editMode: typeof response.editMode === "string" ? response.editMode : undefined,
      data: response.data as string,
      modified: typeof response.modified === "string" ? response.modified : undefined,
    };
  }

  /**
   * Write an Elementor document atomically with optimistic concurrency.
   * The companion plugin compares the current source against `expected`
   * (version + fingerprint) and returns 409 on any mismatch — a partial
   * write is impossible because the whole document is replaced in one PUT.
   */
  async writeDocument(
    postId: number | string,
    data: string,
    expected?: { elementorVersion?: string; fingerprint?: string; modified?: string },
  ): Promise<ElementorDocumentWriteResult> {
    let response: Record<string, unknown>;
    try {
      response = await this.client.rawRequest<Record<string, unknown>>(`${this.basePath}/${postId}`, "PUT", {
        data,
        expectedVersion: expected?.elementorVersion,
        expectedFingerprint: expected?.fingerprint,
        expectedModified: expected?.modified,
      });
    } catch (error) {
      throw this.rethrowWriteError(error, postId);
    }

    const written = response.written === true;
    const reRead = typeof response.data === "string"
      ? {
          postId: (response.postId as number | string | undefined) ?? postId,
          title: typeof response.title === "string" ? response.title : "",
          type: typeof response.type === "string" ? response.type : "page",
          elementorVersion: typeof response.elementorVersion === "string" ? response.elementorVersion : undefined,
          editMode: typeof response.editMode === "string" ? response.editMode : undefined,
          data: response.data as string,
          modified: typeof response.modified === "string" ? response.modified : undefined,
        }
      : undefined;

    if (!written && !reRead) {
      throw new ElementorTransportError("ELEMENTOR_INVALID_RESPONSE", "Companion endpoint returned an unexpected write response.");
    }

    return { postId, written, reRead };
  }

  private rethrowReadError(error: unknown, postId: number | string): never {
    if (error instanceof ElementorTransportError) throw error;
    const status = extractStatus(error);
    if (status !== undefined) {
      throw mapStatus(status, `Failed to read Elementor document ${postId}.`);
    }
    throw new ElementorTransportError("ELEMENTOR_INVALID_RESPONSE", `Failed to read Elementor document ${postId}: ${error instanceof Error ? error.message : String(error)}`);
  }

  private rethrowWriteError(error: unknown, postId: number | string): never {
    if (error instanceof ElementorTransportError) throw error;
    const status = extractStatus(error);
    if (status !== undefined) {
      throw mapStatus(status, `Failed to write Elementor document ${postId}.`);
    }
    throw new ElementorTransportError("ELEMENTOR_INVALID_RESPONSE", `Failed to write Elementor document ${postId}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
