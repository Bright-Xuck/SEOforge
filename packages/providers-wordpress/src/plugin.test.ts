// @forge/providers-wordpress/plugin.test
// Unit tests for WordPress plugin registration.

import { describe, it, expect } from "vitest";
import { wordpressPlugin } from "./wordpress-plugin.js";
import type { CapabilityManifest } from "@forge/core";

describe("WordPress Plugin", () => {
  it("exports a valid plugin object", () => {
    expect(wordpressPlugin.id).toBe("wordpress");
    expect(wordpressPlugin.name).toBe("WordPress Provider");
    expect(wordpressPlugin.version).toBe("0.1.0");
    expect(wordpressPlugin.description).toBe("WordPress REST API provider for Forge");
  });

  it("has valid manifest", () => {
    const manifest = wordpressPlugin.manifest as CapabilityManifest;
    expect(manifest.id).toBe("wordpress-provider");
    expect(manifest.supportedPlatforms).toContain("wordpress");
    expect(manifest.supportedInputs).toContain("credentials");
  });

  it("declares supported actions", () => {
    expect(wordpressPlugin.supportedActions).toContain("read");
  });
});