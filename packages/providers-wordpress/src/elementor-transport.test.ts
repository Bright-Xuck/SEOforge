// @forge/providers-wordpress
// Elementor transport tests (mocked fetch — no network, no credentials).

import { describe, it, expect, afterEach } from "vitest";
import { WordPressClient } from "./client.js";
import {
  ElementorDocumentTransport,
  ELEMENTOR_COMPANION_PATH,
} from "./elementor-transport.js";

const ORIGINAL_DATA = JSON.stringify([
  { id: "h1", elType: "widget", widgetType: "heading", settings: { title: "Old" }, elements: [] },
]);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockFetch(handler: (url: string, init?: RequestInit) => Response): void {
  globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as { url: string }).url;
    return handler(url, init);
  }) as typeof fetch;
}

afterEach(() => {
  delete (globalThis as { fetch?: typeof fetch }).fetch;
});

function makeTransport(): ElementorDocumentTransport {
  const client = new WordPressClient({
    siteUrl: "https://example.com",
    username: "forge",
    applicationPassword: "test-password",
  });
  return new ElementorDocumentTransport(client);
}

describe("ElementorDocumentTransport", () => {
  it("reads a document from the companion endpoint", async () => {
    mockFetch((url) => {
      expect(url).toBe(`https://example.com/${ELEMENTOR_COMPANION_PATH}/5`);
      return jsonResponse({
        postId: 5,
        title: "Home",
        type: "page",
        elementorVersion: "3.24.0",
        editMode: "builder",
        data: ORIGINAL_DATA,
        modified: "2026-08-01T00:00:00Z",
      });
    });
    const read = await makeTransport().readDocument(5);
    expect(read.postId).toBe(5);
    expect(read.data).toBe(ORIGINAL_DATA);
    expect(read.elementorVersion).toBe("3.24.0");
    expect(read.editMode).toBe("builder");
  });

  it("throws ELEMENTOR_DOCUMENT_NOT_FOUND on 404", async () => {
    mockFetch(() => jsonResponse({ error: "document_not_found" }, 404));
    await expect(makeTransport().readDocument(999)).rejects.toMatchObject({
      code: "ELEMENTOR_DOCUMENT_NOT_FOUND",
    });
  });

  it("throws ELEMENTOR_FORBIDDEN on 403", async () => {
    mockFetch(() => jsonResponse({ error: "forbidden" }, 403));
    await expect(makeTransport().readDocument(5)).rejects.toMatchObject({
      code: "ELEMENTOR_FORBIDDEN",
    });
  });

  it("writes a document and returns the re-read payload", async () => {
    const newData = JSON.stringify([
      { id: "h1", elType: "widget", widgetType: "heading", settings: { title: "New" }, elements: [] },
    ]);
    mockFetch((url, init) => {
      expect(init?.method).toBe("PUT");
      expect(url).toBe(`https://example.com/${ELEMENTOR_COMPANION_PATH}/5`);
      const body = JSON.parse(String(init?.body));
      expect(body.data).toBe(newData);
      expect(body.expectedVersion).toBe("3.24.0");
      return jsonResponse({
        postId: 5,
        written: true,
        data: newData,
        elementorVersion: "3.24.0",
        modified: "2026-08-02T00:00:00Z",
      });
    });
    const result = await makeTransport().writeDocument(5, newData, { elementorVersion: "3.24.0" });
    expect(result.written).toBe(true);
    expect(result.reRead?.data).toBe(newData);
  });

  it("throws ELEMENTOR_VERSION_CONFLICT on 409", async () => {
    mockFetch(() => jsonResponse({ error: "version_conflict" }, 409));
    await expect(makeTransport().writeDocument(5, ORIGINAL_DATA)).rejects.toMatchObject({
      code: "ELEMENTOR_VERSION_CONFLICT",
    });
  });

  it("throws ELEMENTOR_INVALID_RESPONSE when the read has no data", async () => {
    mockFetch(() => jsonResponse({ postId: 5, title: "Home" }));
    await expect(makeTransport().readDocument(5)).rejects.toMatchObject({
      code: "ELEMENTOR_INVALID_RESPONSE",
    });
  });

  // ─── Sprint 26: typed health check + plugin-code-driven failures ──────

  it("reads the typed system status from the companion system endpoint", async () => {
    mockFetch((url) => {
      expect(url).toBe("https://example.com/wp-json/forge/v1/system");
      return jsonResponse({
        plugin: "forge-elementor-bridge",
        pluginVersion: "0.2.0",
        generatedAt: "2026-08-14T12:00:00+00:00",
        wordpress: { version: "6.7.1" },
        authentication: { valid: true },
        elementor: {
          installed: true,
          version: "3.24.0",
          minimumSupportedMajor: 2,
          supported: true,
        },
        capabilities: {
          readDocument: true,
          writeDocument: true,
          supportedWidgets: ["heading", "text-editor", "button", "image"],
          unsupportedWidgets: ["html", "form"],
        },
      });
    });
    const status = await makeTransport().readSystemStatus();
    expect(status.plugin).toBe("forge-elementor-bridge");
    expect(status.pluginVersion).toBe("0.2.0");
    expect(status.wordpressVersion).toBe("6.7.1");
    expect(status.authenticated).toBe(true);
    expect(status.elementorInstalled).toBe(true);
    expect(status.elementorVersion).toBe("3.24.0");
    expect(status.elementorSupported).toBe(true);
    expect(status.supportedWidgets).toContain("heading");
    expect(status.unsupportedWidgets).toContain("html");
  });

  it("throws ELEMENTOR_ENDPOINT_UNAVAILABLE when the system endpoint is missing (plugin absent)", async () => {
    mockFetch(() => jsonResponse({ code: "rest_no_route", message: "No route was found." }, 404));
    await expect(makeTransport().readSystemStatus()).rejects.toMatchObject({
      code: "ELEMENTOR_ENDPOINT_UNAVAILABLE",
    });
  });

  it("throws AUTHENTICATION_FAILED when credentials are rejected (401)", async () => {
    mockFetch(() => jsonResponse({ code: "rest_cannot_read", message: "Unauthorized." }, 401));
    await expect(makeTransport().readSystemStatus()).rejects.toMatchObject({
      code: "AUTHENTICATION_FAILED",
    });
    await expect(makeTransport().readDocument(5)).rejects.toMatchObject({
      code: "AUTHENTICATION_FAILED",
    });
  });

  it("maps plugin typed error bodies to transport codes (page_not_found)", async () => {
    mockFetch(() => jsonResponse({ code: "page_not_found", message: "No readable page/post exists for this id." }, 404));
    await expect(makeTransport().readDocument(999)).rejects.toMatchObject({
      code: "ELEMENTOR_DOCUMENT_NOT_FOUND",
      message: "No readable page/post exists for this id.",
    });
  });

  it("maps plugin typed error bodies to transport codes (not_elementor_document)", async () => {
    mockFetch(() => jsonResponse({ code: "not_elementor_document", message: "This document is not managed by Elementor." }, 501));
    await expect(makeTransport().readDocument(5)).rejects.toMatchObject({
      code: "ELEMENTOR_NOT_ACTIVE",
    });
  });

  it("throws VERIFICATION_FAILED when the plugin reports an unverified write", async () => {
    mockFetch(() =>
      jsonResponse({
        postId: 5,
        written: true,
        verified: false,
        data: ORIGINAL_DATA,
      }, 200),
    );
    await expect(makeTransport().writeDocument(5, ORIGINAL_DATA)).rejects.toMatchObject({
      code: "VERIFICATION_FAILED",
    });
  });

  it("accepts a verified write and returns the re-read payload", async () => {
    mockFetch(() =>
      jsonResponse({
        postId: 5,
        written: true,
        verified: true,
        data: ORIGINAL_DATA,
        modified: "2026-08-02T00:00:00+00:00",
      }, 200),
    );
    const result = await makeTransport().writeDocument(5, ORIGINAL_DATA);
    expect(result.written).toBe(true);
    expect(result.reRead?.data).toBe(ORIGINAL_DATA);
  });

  it("maps invalid write payloads to typed codes", async () => {
    mockFetch(() => jsonResponse({ code: "invalid_structure", message: "Not an Elementor element array." }, 400));
    await expect(makeTransport().writeDocument(5, ORIGINAL_DATA)).rejects.toMatchObject({
      code: "ELEMENTOR_INVALID_RESPONSE",
    });
  });
});
