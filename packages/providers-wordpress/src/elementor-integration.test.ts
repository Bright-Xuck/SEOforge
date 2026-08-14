// @forge/providers-wordpress
// OPT-IN integration test against a real WordPress/Elementor site.
//
// NEVER runs in CI or normal `pnpm test`. To run manually against a
// developer-owned installation:
//
//   FORGE_WP_INTEGRATION=true \
//   FORGE_WP_URL=https://example.com \
//   FORGE_WP_USER=myuser \
//   FORGE_WP_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx \
//   FORGE_WP_PAGE_ID=42 \
//   npx vitest run packages/providers-wordpress/src/elementor-integration.test.ts
//
// Credentials are read from the environment only — never committed.
// This file is transport-only (no dom-engine import, no package edge). The
// full resolve → mutate → write → verify → rollback bridge is unit-tested with
// a mocked provider in apps/cli; this file verifies the real companion
// endpoint against a developer-owned site.

import { describe, it, expect } from "vitest";
import { WordPressProvider } from "./wordpress-provider.js";

const enabled = process.env.FORGE_WP_INTEGRATION === "true";

describe.skipIf(!enabled)("Elementor real-provider integration (opt-in)", () => {
  const siteUrl = process.env.FORGE_WP_URL ?? "";
  const username = process.env.FORGE_WP_USER ?? "";
  const applicationPassword = process.env.FORGE_WP_APP_PASSWORD ?? "";
  const pageId = Number(process.env.FORGE_WP_PAGE_ID ?? "0");

  it("requires FORGE_WP_PAGE_ID to target a page", () => {
    expect(pageId).toBeGreaterThan(0);
  });

  it("reads an Elementor document from the companion endpoint and parses its JSON", async () => {
    const provider = new WordPressProvider({ siteUrl, username, applicationPassword });
    const read = await provider.getElementorDocument(pageId);
    if (!read) throw new Error("Companion endpoint unavailable — install forge-elementor-bridge plugin.");
    expect(read.data.length).toBeGreaterThan(0);
    const parsed = JSON.parse(read.data) as unknown;
    expect(Array.isArray(parsed)).toBe(true);
  });
});
