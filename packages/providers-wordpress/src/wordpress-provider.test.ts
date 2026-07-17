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
