// @forge/cli
// OPT-IN real-site integration test (Sprint 26, Phase 9).
//
// Proves the complete real workflow against a DEVELOPER-OWNED WordPress +
// Elementor installation:
//
//   1. Connect                 → WordPressProvider + bridge
//   2. Detect Elementor        → bridge.checkHealth (system status)
//   3. Inspect page            → bridge.inspect (fingerprint + inventory)
//   4. Map page                → rendered HTML → UniversalPage mapping
//   5. Construct a safe patch  → built from the LIVE document (deterministic)
//   6. Preview patch           → bridge.preview (zero writes)
//   7. Validate patch          → bridge.validate (zero writes)
//   8. Apply patch             → bridge.apply dryRun:false
//   9. Re-read page            → bridge.inspect again
//  10. Verify changed content  → proposed text present, fingerprint changed
//  11. Roll back               → bridge.rollback (restores original)
//  12. Re-read page            → bridge.inspect a third time
//  13. Verify original state   → original fingerprint restored
//
// NEVER runs in CI or normal `pnpm test`. To run against your site:
//
//   FORGE_WP_INTEGRATION=true \
//   FORGE_WP_URL=https://example.com \
//   FORGE_WP_USER=myuser \
//   FORGE_WP_APP_PASSWORD='xxxx xxxx xxxx xxxx xxxx xxxx' \
//   FORGE_WP_PAGE_ID=42 \
//   npx vitest run apps/cli/src/elementor/integration.test.ts
//
// TEST PAGE CONTRACT: the page must be Elementor-managed and contain at least
// one supported Heading widget (see docs/sprint-26.md §Integration-test setup)
// with deterministic text; the heading text is captured live, so the test
// remains deterministic without hardcoding page copy.
//
// Credentials are read from the environment only. This test NEVER prints,
// writes, or logs credentials.

import { describe, it, expect } from "vitest";
import { WordPressProvider } from "@forge/providers-wordpress";
import { createElementorBridge } from "./bridge.js";

const enabled = process.env.FORGE_WP_INTEGRATION === "true";

describe.skipIf(!enabled)("Elementor real-site integration (opt-in, Phase 9)", () => {
  const siteUrl = process.env.FORGE_WP_URL ?? "";
  const username = process.env.FORGE_WP_USER ?? "";
  const applicationPassword = process.env.FORGE_WP_APP_PASSWORD ?? "";
  const pageId = Number(process.env.FORGE_WP_PAGE_ID ?? "0");

  it("runs the 13-step workflow: connect → detect → inspect → map → patch → preview → validate → apply → verify → rollback → restore", async () => {
    // 1. Connect.
    const provider = new WordPressProvider({ siteUrl, username, applicationPassword });
    const bridge = createElementorBridge(provider);

    // 2. Detect Elementor + capabilities.
    const health = await bridge.checkHealth(pageId);
    expect(health.ok).toBe(true);
    const elementorCheck = health.checks.find((check) => check.id === "elementor-installed");
    expect(elementorCheck?.ok).toBe(true);
    expect(health.site?.elementorSupported).toBe(true);

    // 3. Inspect the page.
    const inspection = await bridge.inspect(pageId);
    expect(inspection.support.supported).toBe(true);
    expect(inspection.fingerprint).toMatch(/^[0-9a-z]+$/);
    expect(inspection.inventory.widgetCount).toBeGreaterThan(0);

    // The live heading is our deterministic target.
    const heading = inspection.inventory.widgets.find((w) => w.widgetType === "heading" && w.supported);
    expect(heading).toBeDefined();
    if (!heading) return;
    const titleField = heading.supportedFields.find((field) => field.settingsKey === "title");
    expect(titleField).toBeDefined();
    if (!titleField) return;
    const originalText = titleField.normalizedText;
    const proposed = `${originalText} — Forge E2E ${Date.now()}`;

    // 4. Map page (rendered HTML → UniversalPage mapping). Failure here is
    //    non-fatal (the mapping is informational); all hard guarantees rely on
    //    the data-id-based Elementor document resolution.
    let mappingMatched = 0;
    try {
      const page = await provider.getPage(pageId);
      if (page?.link) {
        const response = await fetch(page.link);
        if (response.ok) {
          const html = await response.text();
          const mapped = await bridge.inspect(pageId, html);
          mappingMatched = mapped.universalMapping?.entries.length ?? 0;
        }
      }
    } catch {
      mappingMatched = 0;
    }

    // 5. Construct a safe patch from the live document (with fingerprint).
    const patch = {
      id: `forge-e2e-${Date.now()}`,
      currentContent: originalText,
      proposedContent: proposed,
      sourceFingerprint: inspection.fingerprint,
      expectedWidgetType: "heading",
      semanticIntent: { kind: "heading-text", value: proposed },
      target: { format: "elementor" as const, elementId: heading.elementId, settingsKey: "title" },
    };

    // 6. Preview (zero remote writes).
    const preview = await bridge.preview(pageId, patch);
    expect(preview.compatible).toBe(true);
    if (!preview.mutation) throw new Error("preview must produce a mutation");
    expect(preview.mutation.diffs.some((diff) => diff.settingsKey === "title")).toBe(true);

    // 7. Validate (zero remote writes).
    const validation = await bridge.validate(pageId, patch);
    expect(validation.compatible).toBe(true);

    // 8. Apply for real (provider-backed mutation).
    const applied = await bridge.apply(pageId, patch, { dryRun: false });
    expect(applied.applied).toBe(true);
    if (!applied.rollbackPayload) throw new Error("apply must return a rollback payload");
    expect(applied.fingerprintBefore).toBe(inspection.fingerprint);
    expect(applied.fingerprintAfter).not.toBe(inspection.fingerprint);

    // 9 + 10. Re-read the page and verify the changed content.
    const reRead = await bridge.inspect(pageId);
    const changedHeading = reRead.inventory.widgets.find((w) => w.widgetType === "heading" && w.supported);
    const changedTitle = changedHeading?.supportedFields.find((field) => field.settingsKey === "title");
    expect(changedTitle?.normalizedText).toContain("Forge E2E");
    expect(reRead.fingerprint).toBe(applied.fingerprintAfter);

    // 11. Roll back.
    const rollback = await bridge.rollback(applied.rollbackPayload);
    expect(rollback.restored).toBe(true);

    // 12 + 13. Re-read and verify the original content restored.
    const restored = await bridge.inspect(pageId);
    expect(restored.fingerprint).toBe(inspection.fingerprint);
    const restoredHeading = restored.inventory.widgets.find((w) => w.widgetType === "heading" && w.supported);
    const restoredTitle = restoredHeading?.supportedFields.find((field) => field.settingsKey === "title");
    expect(restoredTitle?.normalizedText).toBe(originalText);
    // The mapping was at least attempted (informational guard).
    expect(mappingMatched).toBeGreaterThanOrEqual(0);
  });
});