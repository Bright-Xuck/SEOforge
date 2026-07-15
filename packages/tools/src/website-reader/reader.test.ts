import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, it, expect } from "vitest";
import type { AxiosResponse } from "axios";
import { readWebsite } from "./reader.js";
import type { HttpClient } from "./reader.js";
import { WebsiteReadError } from "@forge/core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, "..", "fixtures");

function loadFixture(name: string): string {
  return readFileSync(join(fixtures, name), "utf-8");
}

function makeResponse(
  data: string,
  status = 200,
  headers: Record<string, string> = { "content-type": "text/html" },
): AxiosResponse<string> {
  return {
    data,
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers,
    config: {} as AxiosResponse["config"],
    request: { res: { responseUrl: "https://example.com/" } },
  };
}

/** In-memory fake HTTP client for deterministic tests. */
function fakeClient(
  handler: (url: string) => AxiosResponse<string> | Promise<AxiosResponse<string>>,
): HttpClient {
  return {
    get: async (url: string) => handler(url),
  };
}

describe("readWebsite", () => {
  it("reads a valid HTML page and returns a snapshot", async () => {
    const html = loadFixture("sample-page.html");
    const client = fakeClient(() => makeResponse(html));

    const snapshot = await readWebsite("https://example.com/", client);

    expect(snapshot.originalUrl).toBe("https://example.com/");
    expect(snapshot.finalUrl).toBe("https://example.com/");
    expect(snapshot.statusCode).toBe(200);
    expect(snapshot.pageTitle).toBe("Example Website");
    expect(snapshot.metaDescription).toBe("A sample website for testing Forge's HTML parser.");
    expect(snapshot.canonicalUrl).toBe("https://example.com/");
    expect(snapshot.language).toBe("en");
    expect(snapshot.headings).toHaveLength(4);
    expect(snapshot.links).toHaveLength(2);
    expect(snapshot.images).toHaveLength(2);
    expect(snapshot.rawHtml).toContain("<html");
  });

  it("throws invalid-url error for malformed URLs", async () => {
    const client = fakeClient(() => makeResponse("<html></html>"));

    await expect(readWebsite("not-a-url", client)).rejects.toBeInstanceOf(WebsiteReadError);

    try {
      await readWebsite("not-a-url", client);
    } catch (error) {
      expect(error).toBeInstanceOf(WebsiteReadError);
      expect((error as WebsiteReadError).kind).toBe("invalid-url");
    }
  });

  it("throws http error for 404", async () => {
    const client = fakeClient(() =>
      makeResponse("<html>404</html>", 404, { "content-type": "text/html" }),
    );

    try {
      await readWebsite("https://example.com/missing", client);
    } catch (error) {
      expect(error).toBeInstanceOf(WebsiteReadError);
      const wre = error as WebsiteReadError;
      expect(wre.kind).toBe("http");
      expect(wre.statusCode).toBe(404);
    }
  });

  it("throws http error for 500", async () => {
    const client = fakeClient(() =>
      makeResponse("<html>500</html>", 500, { "content-type": "text/html" }),
    );

    try {
      await readWebsite("https://example.com/error", client);
    } catch (error) {
      expect(error).toBeInstanceOf(WebsiteReadError);
      expect((error as WebsiteReadError).kind).toBe("http");
      expect((error as WebsiteReadError).statusCode).toBe(500);
    }
  });

  it("throws non-html error for non-HTML content type", async () => {
    const client = fakeClient(() =>
      makeResponse(loadFixture("non-html.txt"), 200, {
        "content-type": "text/plain",
      }),
    );

    try {
      await readWebsite("https://example.com/file.txt", client);
    } catch (error) {
      expect(error).toBeInstanceOf(WebsiteReadError);
      expect((error as WebsiteReadError).kind).toBe("non-html");
    }
  });

  it("throws network error for timeout", async () => {
    const client = fakeClient(() => {
      return Promise.reject(new Error("timeout"));
    });

    try {
      await readWebsite("https://example.com/", client);
    } catch (error) {
      expect(error).toBeInstanceOf(WebsiteReadError);
      expect((error as WebsiteReadError).kind).toBe("network");
    }
  });

  it("throws network error for dns failure", async () => {
    const client = fakeClient(() => {
      return Promise.reject(new Error("dns failure"));
    });

    try {
      await readWebsite("https://nonexistent.invalid/", client);
    } catch (error) {
      expect(error).toBeInstanceOf(WebsiteReadError);
      expect((error as WebsiteReadError).kind).toBe("network");
    }
  });
});
