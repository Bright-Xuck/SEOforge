// @forge/cli
// Elementor write bridge tests (Sprint 25).
// Uses an in-memory mock provider — no network, no credentials.

import { describe, it, expect } from "vitest";
import { createElementorBridge } from "./bridge.js";
import type { ElementorProviderLike } from "./bridge.js";

// Fixture A mirror (test fixtures are not exported from @forge/dom-engine).
const HERO_DOC = JSON.stringify([
  {
    id: "hero-container",
    elType: "container",
    settings: { flex_direction: "row" },
    elements: [
      { id: "heading-1", elType: "widget", widgetType: "heading", settings: { title: "Accounting Software for Small Businesses", header_size: "h1" }, elements: [] },
      { id: "text-1", elType: "widget", widgetType: "text-editor", settings: { editor: "<p>Premium accounting software for modern businesses.</p>" }, elements: [] },
      { id: "button-1", elType: "widget", widgetType: "button", settings: { text: "Get Started", link: { url: "https://example.com/signup" } }, elements: [] },
    ],
  },
]);

const GLOBALS_DOC = JSON.stringify([
  {
    id: "globals-container",
    elType: "container",
    settings: {},
    elements: [
      {
        id: "globals-heading",
        elType: "widget",
        widgetType: "heading",
        settings: {
          title: "Globals heading",
          __globals__: { title_color: "globals/colors?id=primary" },
        },
        elements: [],
      },
    ],
  },
]);

/**
 * In-memory provider double: records every write so tests can assert
 * dry-run performed ZERO remote mutations.
 */
function memoryProvider(initialData: string, version = "3.24.0"): ElementorProviderLike & { writes: { data: string }[]; current: string } {
  const state = { data: initialData };
  const writes: { data: string }[] = [];
  return {
    writes,
    get current() {
      return state.data;
    },
    set current(value: string) {
      state.data = value;
    },
    async readElementorDocument() {
      return {
        postId: 5,
        title: "Home",
        type: "page",
        url: "https://example.com/home",
        elementorVersion: version,
        editMode: "builder",
        data: state.data,
        modified: "2026-08-01T00:00:00Z",
      };
    },
    async updateElementorDocument(_postId, data) {
      writes.push({ data });
      state.data = data;
      return {
        postId: 5,
        written: true,
        verified: true,
        reRead: {
          postId: 5,
          title: "Home",
          type: "page",
          elementorVersion: version,
          editMode: "builder",
          data: state.data,
          modified: "2026-08-01T00:00:00Z",
        },
      };
    },
    async getCurrentUser() {
      return { id: 1, name: "Admin", slug: "admin" };
    },
    async getElementorSystemStatus() {
      return {
        plugin: "forge-elementor-bridge",
        pluginVersion: "0.2.0",
        generatedAt: "2026-08-14T12:00:00+00:00",
        wordpressVersion: "6.7.1",
        authenticated: true,
        elementorInstalled: true,
        elementorVersion: version,
        minimumSupportedMajor: 2,
        elementorSupported: true,
        supportedWidgets: ["heading", "text-editor", "button", "image"],
        unsupportedWidgets: ["html", "shortcode", "form"],
      };
    },
  };
}

const headingPatch = {
  currentContent: "Accounting Software for Small Businesses",
  proposedContent: "Modern Accounting Software for Growing Businesses",
  target: { format: "elementor" as const, elementId: "heading-1", settingsKey: "title" },
};

describe("ElementorWriteBridge", () => {
  it("inspects a document and inventories editable widgets (Sprint 26 fingerprint + inventory)", async () => {
    const provider = memoryProvider(HERO_DOC);
    const bridge = createElementorBridge(provider);
    const result = await bridge.inspect(5);
    expect(result.title).toBe("Home");
    expect(result.support.supported).toBe(true);
    expect(result.fingerprint).toMatch(/^[0-9a-z]+$/);
    expect(result.inventory.widgetCount).toBe(3);
    expect(result.inventory.widgets.map((w) => w.widgetType)).toEqual(["heading", "text-editor", "button"]);
    const heading = result.inventory.widgets.find((w) => w.widgetType === "heading");
    expect(heading?.supported).toBe(true);
    expect(heading?.supportedFields.some((f) => f.settingsKey === "title" && f.richText)).toBe(true);
    const button = result.inventory.widgets.find((w) => w.widgetType === "button");
    // `link` is a schema-declared control (button-link → link), so it is supported.
    expect(button?.supportedFields.some((f) => f.settingsKey === "link")).toBe(true);
    expect(result.pageUrl).toBe("https://example.com/home");
  });

  it("checkHealth reports Elementor availability, version support, and document writability (Sprint 26)", async () => {
    const provider = memoryProvider(HERO_DOC);
    const bridge = createElementorBridge(provider);
    const health = await bridge.checkHealth(5);
    expect(health.ok).toBe(true);
    const labels = health.checks.map((c) => c.id);
    expect(labels).toContain("elementor-installed");
    expect(labels).toContain("elementor-version");
    expect(labels).toContain("page-exists");
    expect(labels).toContain("document-writable");
    expect(health.document?.supported).toBe(true);
    expect(health.site?.supportedWidgets).toContain("heading");
  });

  it("reports authentication failure before a missing companion endpoint", async () => {
    const provider = memoryProvider(HERO_DOC);
    provider.getCurrentUser = async () => {
      throw Object.assign(new Error("Invalid credentials"), { statusCode: 401 });
    };
    let systemCalled = false;
    provider.getElementorSystemStatus = async () => {
      systemCalled = true;
      throw new Error("companion endpoint should not be called after auth failure");
    };

    const bridge = createElementorBridge(provider);
    const health = await bridge.checkHealth(5);

    expect(health.ok).toBe(false);
    const authentication = health.checks.find((check) => check.id === "authentication");
    expect(authentication?.ok).toBe(false);
    expect(authentication?.code).toBe("AUTHENTICATION_FAILED");
    expect(health.checks.some((check) => check.id === "system")).toBe(false);
    expect(systemCalled).toBe(false);
  });

  it("distinguishes an unreachable REST API from rejected credentials", async () => {
    const provider = memoryProvider(HERO_DOC);
    provider.getCurrentUser = async () => {
      throw new TypeError("fetch failed", { cause: new Error("getaddrinfo EAI_AGAIN example.test") });
    };

    const bridge = createElementorBridge(provider);
    const health = await bridge.checkHealth(5);

    expect(health.ok).toBe(false);
    const reachable = health.checks.find((check) => check.id === "wordpress-reachable");
    expect(reachable?.ok).toBe(false);
    expect(reachable?.code).toBe("WORDPRESS_UNREACHABLE");
    expect(reachable?.detail).toContain("EAI_AGAIN");
    expect(health.checks.some((check) => check.id === "authentication")).toBe(false);
  });

  it("preview resolves the exact target and performs zero remote writes", async () => {
    const provider = memoryProvider(HERO_DOC);
    const bridge = createElementorBridge(provider);
    const preview = await bridge.preview(5, headingPatch);
    expect(preview.resolution.ok).toBe(true);
    if (!preview.resolution.ok) return;
    const target = preview.targets[0];
    expect(target?.elementId).toBe("heading-1");
    expect(target?.currentValue).toBe("Accounting Software for Small Businesses");
    expect(target?.proposedValue).toBe("Modern Accounting Software for Growing Businesses");
    expect(preview.mutation).not.toBeNull();
    expect(provider.writes).toHaveLength(0);
  });

  it("validate reports incompatibility for markup in plain-text controls", async () => {
    const provider = memoryProvider(HERO_DOC);
    const bridge = createElementorBridge(provider);
    const result = await bridge.validate(5, {
      currentContent: "Get Started",
      proposedContent: "<b>Bold CTA</b>",
      target: { format: "elementor", elementId: "button-1", settingsKey: "text" },
    });
    expect(result.compatible).toBe(false);
    expect(result.problems.length).toBeGreaterThan(0);
    expect(provider.writes).toHaveLength(0);
  });

  it("apply dry-run performs zero remote writes and returns rollback payload", async () => {
    const provider = memoryProvider(HERO_DOC);
    const bridge = createElementorBridge(provider);
    const result = await bridge.apply(5, headingPatch, { dryRun: true });
    expect(result.applied).toBe(false);
    expect(result.dryRun).toBe(true);
    expect(result.verification?.ok).toBe(true);
    expect(result.rollbackPayload?.originalData).toBe(HERO_DOC);
    expect(provider.writes).toHaveLength(0);
    expect(provider.current).toBe(HERO_DOC);
  });

  it("apply writes atomically, verifies by re-read, and returns rollback info", async () => {
    const provider = memoryProvider(HERO_DOC);
    const bridge = createElementorBridge(provider);
    const result = await bridge.apply(5, headingPatch, { dryRun: false });
    expect(result.applied).toBe(true);
    expect(result.rolledBack).toBe(false);
    expect(provider.writes).toHaveLength(1);
    expect(provider.current).toContain("Modern Accounting Software for Growing Businesses");
    expect(provider.current).toContain("Premium accounting software for modern businesses."); // unrelated preserved
    expect(provider.current).toContain("Get Started");
    expect(result.rollbackPayload?.originalData).toBe(HERO_DOC);
  });

  it("blocks stale patches without writing (Fixture G)", async () => {
    const provider = memoryProvider(HERO_DOC);
    const bridge = createElementorBridge(provider);
    const stale = {
      currentContent: "The heading no longer on the page",
      proposedContent: "New heading",
      target: { format: "elementor" as const, elementId: "heading-1", settingsKey: "title" },
    };
    const result = await bridge.apply(5, stale, { dryRun: false });
    expect(result.applied).toBe(false);
    expect(result.resolution.ok).toBe(false);
    if (!result.resolution.ok) expect(result.resolution.code).toBe("PATCH_STALE");
    expect(provider.writes).toHaveLength(0);
  });

  it("blocks ambiguous semantic-intent patches without writing (Fixture H)", async () => {
    const doc = JSON.stringify([
      {
        id: "c",
        elType: "container",
        settings: {},
        elements: [
          { id: "h-x", elType: "widget", widgetType: "heading", settings: { title: "First" }, elements: [] },
          { id: "h-y", elType: "widget", widgetType: "heading", settings: { title: "Second" }, elements: [] },
        ],
      },
    ]);
    const provider = memoryProvider(doc);
    const bridge = createElementorBridge(provider);
    const result = await bridge.apply(5, {
      proposedContent: "Ambiguous",
      semanticIntent: { kind: "heading-text" },
    }, { dryRun: false });
    expect(result.applied).toBe(false);
    if (!result.resolution.ok) expect(result.resolution.code).toBe("PATCH_TARGET_AMBIGUOUS");
    expect(provider.writes).toHaveLength(0);
  });

  it("round-trips: targeted change applies, unrelated Elementor structure unchanged", async () => {
    const provider = memoryProvider(GLOBALS_DOC);
    const bridge = createElementorBridge(provider);
    const result = await bridge.apply(5, {
      currentContent: "Globals heading",
      proposedContent: "New globals heading",
      target: { format: "elementor", elementId: "globals-heading", settingsKey: "title" },
    }, { dryRun: false });
    expect(result.applied).toBe(true);
    expect(provider.current).toContain("New globals heading");
    expect(provider.current).toContain("__globals__");
    expect(provider.current).toContain("globals/colors?id=primary");
  });

  it("rolls back to the exact original document and verifies", async () => {
    const provider = memoryProvider(HERO_DOC);
    const bridge = createElementorBridge(provider);
    const result = await bridge.apply(5, headingPatch, { dryRun: false });
    expect(result.applied).toBe(true);
    if (!result.rollbackPayload) throw new Error("expected rollback payload");
    const payload = result.rollbackPayload;
    const rollback = await bridge.rollback(payload);
    expect(rollback.restored).toBe(true);
    expect(provider.current).toBe(HERO_DOC);
  });

  it("restores the original document when a write fails (Fixture J)", async () => {
    // The first write (the patch) fails; the rollback write must succeed so the
    // original document is restored and verified.
    let failed = false;
    const failing: ElementorProviderLike = {
      async readElementorDocument() {
        return {
          postId: 5,
          title: "Home",
          type: "page",
          elementorVersion: "3.24.0",
          editMode: "builder",
          data: HERO_DOC,
          modified: "2026-08-01T00:00:00Z",
        };
      },
      async updateElementorDocument(_postId, data) {
        if (!failed) {
          failed = true;
          throw new Error("simulated remote failure");
        }
        // Rollback write succeeds and restores the original.
        return {
          postId: 5,
          written: true,
          verified: true,
          reRead: { postId: 5, title: "Home", type: "page", elementorVersion: "3.24.0", editMode: "builder", data, modified: "2026-08-01T00:00:00Z" },
        };
      },
    };
    const bridge = createElementorBridge(failing);
    const result = await bridge.apply(5, headingPatch, { dryRun: false });
    expect(result.applied).toBe(false);
    expect(result.rolledBack).toBe(true);
    expect(result.message).toContain("restored");
  });

  // ─── Sprint 26: deterministic stale protection, verification, rollback ──

  it("rejects a patch whose widget type changed since review (PATCH_WIDGET_TYPE_CHANGED)", async () => {
    const provider = memoryProvider(HERO_DOC);
    const bridge = createElementorBridge(provider);
    const result = await bridge.apply(5, {
      currentContent: "Accounting Software for Small Businesses",
      proposedContent: "New heading",
      expectedWidgetType: "text-editor",
      target: { format: "elementor", elementId: "heading-1", settingsKey: "title" },
    }, { dryRun: false });
    expect(result.applied).toBe(false);
    if (!result.resolution.ok) expect(result.resolution.code).toBe("PATCH_WIDGET_TYPE_CHANGED");
    expect(result.errorCode).toBe("DOCUMENT_STALE");
    expect(provider.writes).toHaveLength(0);
  });

  it("rejects a patch with an unsupported setting (UNSUPPORTED_SETTING)", async () => {
    const provider = memoryProvider(HERO_DOC);
    const bridge = createElementorBridge(provider);
    const result = await bridge.apply(5, {
      proposedContent: "x",
      target: { format: "elementor", elementId: "button-1", settingsKey: "not_a_control" },
    }, { dryRun: false });
    expect(result.applied).toBe(false);
    if (!result.resolution.ok) expect(result.resolution.code).toBe("PATCH_UNSUPPORTED_SETTING");
    expect(result.errorCode).toBe("UNSUPPORTED_SETTING");
    expect(provider.writes).toHaveLength(0);
  });

  it("fails verification and refuses to roll back over a changed document (200 != success)", async () => {
    // The write succeeds but the re-read returns a DIFFERENT document — the
    // classic "HTTP 200 returned but nothing was stored correctly" case. The
    // apply must NOT claim success, and the automatic rollback must REFUSE to
    // overwrite the newer (tampered) remote document.
    let tampered = false;
    const tampering: ElementorProviderLike = {
      async readElementorDocument() {
        return {
          postId: 5,
          title: "Home",
          type: "page",
          elementorVersion: "3.24.0",
          editMode: "builder",
          data: tampered
            ? JSON.stringify([
                { id: "hero-container", elType: "container", settings: {}, elements: [
                  { id: "heading-1", elType: "widget", widgetType: "heading", settings: { title: "SOMEONE ELSE WROTE THIS" }, elements: [] },
                  { id: "text-1", elType: "widget", widgetType: "text-editor", settings: { editor: "<p>x</p>" }, elements: [] },
                  { id: "button-1", elType: "widget", widgetType: "button", settings: { text: "Get Started", link: { url: "https://example.com/signup" } }, elements: [] },
                ] },
              ])
            : HERO_DOC,
          modified: "2026-08-01T00:00:00Z",
        };
      },
      async updateElementorDocument(_postId, data) {
        tampered = data.includes("Modern Accounting Software");
        return {
          postId: 5,
          written: true,
          verified: true,
          reRead: { postId: 5, title: "Home", type: "page", elementorVersion: "3.24.0", editMode: "builder", data, modified: "2026-08-01T00:00:00Z" },
        };
      },
    };
    const bridge = createElementorBridge(tampering);
    const result = await bridge.apply(5, headingPatch, { dryRun: false });
    expect(result.applied).toBe(false);
    // Verification failed; the automatic rollback refused to overwrite the
    // changed remote document — both outcomes fail closed (no success claim).
    expect(["VERIFICATION_FAILED", "ROLLBACK_FAILED"]).toContain(result.errorCode);
    expect(result.rolledBack).toBe(false);
    expect(result.message).toContain("Verification failed");
  });

  it("rollback refuses to overwrite a document changed since the apply (Sprint 26)", async () => {
    const provider = memoryProvider(HERO_DOC);
    const bridge = createElementorBridge(provider);
    const apply = await bridge.apply(5, headingPatch, { dryRun: false });
    expect(apply.applied).toBe(true);
    if (!apply.rollbackPayload) throw new Error("expected rollback payload");

    // Simulate a newer edit after the apply.
    const newer = provider.current.replace("Modern Accounting Software for Growing Businesses", "A NEWER EDIT BY SOMEONE ELSE");
    (provider as { current: string }).current = newer;

    const writesBefore = provider.writes.length;
    const rollback = await bridge.rollback(apply.rollbackPayload);
    expect(rollback.restored).toBe(false);
    expect(rollback.refused).toBe(true);
    expect(rollback.message).toContain("REFUSED");
    // Nothing was written during the refusal.
    expect(provider.writes).toHaveLength(writesBefore);
    expect(provider.current).toBe(newer);
  });

  it("rollback --force overwrites the newer document deliberately (Sprint 26)", async () => {
    const provider = memoryProvider(HERO_DOC);
    const bridge = createElementorBridge(provider);
    const apply = await bridge.apply(5, headingPatch, { dryRun: false });
    if (!apply.rollbackPayload) throw new Error("expected rollback payload");
    (provider as { current: string }).current = provider.current.replace(
      "Modern Accounting Software for Growing Businesses",
      "A NEWER EDIT BY SOMEONE ELSE",
    );
    const rollback = await bridge.rollback(apply.rollbackPayload, { force: true });
    expect(rollback.restored).toBe(true);
    expect(provider.current).toBe(HERO_DOC);
    expect(rollback.finalFingerprint).toBe(apply.rollbackPayload.originalFingerprint);
  });

  it("rollback rejects a corrupted payload (fingerprint mismatch) without writing", async () => {
    const provider = memoryProvider(HERO_DOC);
    const bridge = createElementorBridge(provider);
    const writesBefore = provider.writes.length;
    const corrupted = await bridge.rollback({
      postId: 5,
      originalData: HERO_DOC.replace("Accounting Software for Small Businesses", "Tampered original"),
      originalFingerprint: "deadbeef",
      appliedFingerprint: "deadbeef2",
    });
    expect(corrupted.restored).toBe(false);
    expect(corrupted.message).toContain("Invalid rollback payload");
    expect(provider.writes).toHaveLength(writesBefore);
  });

  it("dry-run regression: preview, validate and apply-dry-run perform zero remote writes (Sprint 26)", async () => {
    const provider = memoryProvider(HERO_DOC);
    const bridge = createElementorBridge(provider);
    await bridge.preview(5, headingPatch);
    await bridge.validate(5, headingPatch);
    await bridge.apply(5, headingPatch, { dryRun: true });
    expect(provider.writes).toHaveLength(0);
  });
});
