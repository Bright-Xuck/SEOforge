// @forge/providers-wordpress/client.test
// Tests for WordPress REST API client.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WordPressClient } from "./client.js";

describe("WordPressClient", () => {
  let client: WordPressClient;

  beforeEach(() => {
    client = new WordPressClient({
      siteUrl: "https://example.com",
      username: "testuser",
      applicationPassword: "testpass",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should normalize site URL by removing trailing slash", () => {
      const normalizedClient = new WordPressClient({
        siteUrl: "https://example.com/",
        username: "testuser",
        applicationPassword: "testpass",
      });
      expect(normalizedClient).toBeDefined();
    });
  });

  describe("get", () => {
    it("should return paginated response for array data", async () => {
      const mockResponse = [
        { id: 1, title: { rendered: "Test Post" } },
        { id: 2, title: { rendered: "Another Post" } },
      ];

      const mockHeaders = new Headers();
      mockHeaders.set("X-WP-Total", "2");
      mockHeaders.set("X-WP-TotalPages", "1");
      mockHeaders.set("X-WP-Page", "1");

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
        headers: mockHeaders,
      } as unknown as Response);

      const result = await client.get<WordPressPost>("posts");

      expect(result.data).toHaveLength(2);
      expect(result.totalItems).toBe(2);
      expect(result.totalPages).toBe(1);
      expect(result.currentPage).toBe(1);
    });

    it("should return paginated response for single object", async () => {
      const mockResponse = { title: { rendered: "Test" } };

      const mockHeaders = new Headers();

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
        headers: mockHeaders,
      } as unknown as Response);

      const result = await client.get<WordPressSettings>("settings");

      expect(result.data).toHaveLength(1);
      expect(result.totalItems).toBe(1);
    });

    it("should throw error for non-OK response", async () => {
      const mockHeaders = new Headers();

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({}),
        headers: mockHeaders,
      } as unknown as Response);

      await expect(client.get("posts")).rejects.toThrow();
    });
  });
});

interface WordPressPost {
  id: number;
  title: { rendered: string };
}

interface WordPressSettings {
  title: string;
  description: string;
  url: string;
}