import { afterEach, describe, expect, it, vi } from "vitest";
import { WordPressProvider } from "./wordpress-provider.js";
import { WordPressClient } from "./client.js";

const config = {
  siteUrl: "https://example.com",
  username: "user",
  applicationPassword: "password",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("WordPressProvider write operations", () => {
  it("verifies REST authentication with the canonical current-user endpoint", async () => {
    const get = vi.spyOn(WordPressClient.prototype, "get").mockResolvedValue({
      data: [{ id: 7, name: "Admin", slug: "admin" }],
      totalItems: 1,
      totalPages: 1,
      currentPage: 1,
    } as never);
    const provider = new WordPressProvider(config);

    await expect(provider.getCurrentUser()).resolves.toEqual({ id: 7, name: "Admin", slug: "admin" });
    expect(get).toHaveBeenCalledWith("users/me");
  });

  it("creates a write result for preview mode without mutating", async () => {
    const provider = new WordPressProvider(config);
    const result = await provider.previewWrite({
      id: "op-1",
      type: "page.update",
      resourceType: "page",
      resourceId: 1,
      mode: "preview",
      timestamp: new Date().toISOString(),
      oldValue: { title: "Old" },
      newValue: { title: "New" },
      diffs: [{ field: "title", oldValue: "Old", newValue: "New" }],
      summary: { totalChanges: 1, changedFields: ["title"], preview: true, rollbackSupported: true },
    });

    expect(result.preview).toBe(true);
    expect(result.applied).toBe(false);
    expect(result.oldValue).toEqual({ title: "Old" });
  });

  it("routes elementor-document writes to the companion endpoint and verifies", async () => {
    const originalData = JSON.stringify([{ id: "h1", elType: "widget", widgetType: "heading", settings: { title: "Old" }, elements: [] }]);
    const newData = JSON.stringify([{ id: "h1", elType: "widget", widgetType: "heading", settings: { title: "New" }, elements: [] }]);

    const rawRequestBody: { data?: string } = {};
    const rawRequestMock: never = (async (_path: string, method?: string, body?: unknown) => {
      if (method === "PUT") {
        rawRequestBody.data = (body as { data?: string })?.data;
        return { postId: 5, written: true, data: rawRequestBody.data, elementorVersion: "3.24.0", modified: "2026-08-02T00:00:00Z" };
      }
      return { postId: 5, title: "Home", type: "page", elementorVersion: "3.24.0", editMode: "builder", data: originalData, modified: "2026-08-01T00:00:00Z" };
    }) as never;
    vi.spyOn(WordPressClient.prototype, "rawRequest").mockImplementation(rawRequestMock);
    vi.spyOn(WordPressClient.prototype, "get").mockResolvedValue({ data: [], totalItems: 0, totalPages: 0, currentPage: 1 } as never);

    const provider = new WordPressProvider(config);
    const result = await provider.applyWrite({
      id: "elementor-op",
      type: "content.update-elementor",
      resourceType: "elementor-document",
      resourceId: 5,
      mode: "apply",
      timestamp: new Date().toISOString(),
      oldValue: {},
      newValue: { elementor_data: newData, expectedFingerprint: "abc" },
      diffs: [{ field: "elementor_data", oldValue: originalData, newValue: newData }],
      summary: { totalChanges: 1, changedFields: ["elementor_data"], preview: false, rollbackSupported: true },
    });

    expect(result.applied).toBe(true);
    expect(result.oldValue).toEqual({ elementor_data: originalData });
    expect(result.newValue).toEqual({ elementor_data: newData });
    expect(rawRequestBody.data).toBe(newData);
  });

  it("accepts a structurally equivalent Elementor re-read when serialization differs", async () => {
    const originalData = JSON.stringify([
      { id: "h1", elType: "widget", widgetType: "heading", settings: { title: "Old" }, elements: [] },
    ]);
    const newData = JSON.stringify([
      { id: "h1", elType: "widget", widgetType: "heading", settings: { title: "New" }, elements: [] },
    ]);
    // Elementor re-serializes the document: key order, whitespace and default
    // `isInner:false` differ from the payload even though content is equal.
    const reReadData = JSON.stringify(
      [
        {
          elements: [],
          settings: { title: "New" },
          widgetType: "heading",
          elType: "widget",
          id: "h1",
        },
      ],
      null,
      2,
    );

    const rawRequestMock: never = (async (_path: string, method?: string) => {
      if (method === "PUT") {
        return {
          postId: 5,
          written: true,
          verified: true,
          data: reReadData,
          elementorVersion: "3.24.0",
          modified: "2026-08-02T00:00:00Z",
        };
      }
      return { postId: 5, title: "Home", type: "page", elementorVersion: "3.24.0", editMode: "builder", data: originalData, modified: "2026-08-01T00:00:00Z" };
    }) as never;
    vi.spyOn(WordPressClient.prototype, "rawRequest").mockImplementation(rawRequestMock);
    vi.spyOn(WordPressClient.prototype, "get").mockResolvedValue({ data: [], totalItems: 0, totalPages: 0, currentPage: 1 } as never);

    const provider = new WordPressProvider(config);
    const result = await provider.applyWrite({
      id: "elementor-op",
      type: "content.update-elementor",
      resourceType: "elementor-document",
      resourceId: 5,
      mode: "apply",
      timestamp: new Date().toISOString(),
      oldValue: {},
      newValue: { elementor_data: newData, expectedFingerprint: "abc" },
      diffs: [{ field: "elementor_data", oldValue: originalData, newValue: newData }],
      summary: { totalChanges: 1, changedFields: ["elementor_data"], preview: false, rollbackSupported: true },
    });

    expect(result.applied).toBe(true);
    expect(result.oldValue).toEqual({ elementor_data: originalData });
    expect(result.newValue).toEqual({ elementor_data: reReadData });
  });

  it("updates page content through the REST client", async () => {
    const putSpy = vi.spyOn(WordPressClient.prototype, "put").mockResolvedValue({
      id: 1,
      title: "Updated title",
      content: "Updated content",
      excerpt: "",
      slug: "updated-title",
      status: "draft",
      type: "page",
      link: "https://example.com/updated-title",
      date: "",
      modified: "",
      featuredMedia: 0,
    } as never);
    vi.spyOn(WordPressClient.prototype, "get").mockResolvedValue({
      data: [{ id: 1, title: "Original title", content: "Original content" }],
      totalItems: 1,
      totalPages: 1,
      currentPage: 1,
    } as never);

    const provider = new WordPressProvider(config);
    const result = await provider.updatePage(1, { title: "Updated title" });

    expect(putSpy).toHaveBeenCalled();
    expect(result.applied).toBe(true);
    expect(result.resourceId).toBe(1);
    expect(result.newValue).toMatchObject({ id: 1, title: "Updated title" });
  });
});
