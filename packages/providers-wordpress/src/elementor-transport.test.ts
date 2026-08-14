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
});
