// @forge/providers-wordpress
// Tests for the Rank Math companion transport.

import { describe, expect, it, vi } from "vitest";
import type { WordPressClient } from "./client.js";
import { SeoMetaTransport, SEO_META_COMPANION_PATH } from "./seo-meta-transport.js";

function makeClient() {
  const rawRequest = vi.fn();
  return { client: { rawRequest } as unknown as WordPressClient, rawRequest };
}

describe("SeoMetaTransport", () => {
  it("reads metadata from the companion endpoint", async () => {
    const { client, rawRequest } = makeClient();
    rawRequest.mockResolvedValue({
      postId: 6,
      plugin: "rank-math",
      fields: { title: "Title", description: "Description" },
    });

    const transport = new SeoMetaTransport(client);
    const result = await transport.read(6);

    expect(rawRequest).toHaveBeenCalledWith(`${SEO_META_COMPANION_PATH}/6`, "GET");
    expect(result.fields.title).toBe("Title");
  });

  it("writes only the provided fields and returns verification data", async () => {
    const { client, rawRequest } = makeClient();
    rawRequest.mockResolvedValue({
      postId: 6,
      plugin: "rank-math",
      written: ["title"],
      verified: true,
      old: { title: "Old" },
      new: { title: "New" },
    });

    const transport = new SeoMetaTransport(client);
    const result = await transport.write(6, { title: "New" });

    expect(rawRequest).toHaveBeenCalledWith(`${SEO_META_COMPANION_PATH}/6`, "POST", {
      fields: { title: "New" },
    });
    expect(result.verified).toBe(true);
    expect(result.written).toEqual(["title"]);
  });

  it("propagates transport errors (no silent success)", async () => {
    const { client, rawRequest } = makeClient();
    rawRequest.mockRejectedValue(new Error("404 companion endpoint missing"));

    const transport = new SeoMetaTransport(client);
    await expect(transport.read(6)).rejects.toThrow("404 companion endpoint missing");
  });
});
