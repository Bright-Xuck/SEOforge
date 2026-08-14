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
  let current = initialData;
  const writes: { data: string }[] = [];
  return {
    writes,
    get current() {
      return current;
    },
    async getElementorDocument() {
      return {
        postId: 5,
        title: "Home",
        type: "page",
        elementorVersion: version,
        editMode: "builder",
        data: current,
        modified: "2026-08-01T00:00:00Z",
      };
    },
    async updateElementorDocument(_postId, data) {
      writes.push({ data });
      current = data;
      return {
        postId: 5,
        written: true,
        reRead: {
          postId: 5,
          title: "Home",
          type: "page",
          elementorVersion: version,
          editMode: "builder",
          data: current,
          modified: "2026-08-01T00:00:00Z",
        },
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
  it("inspects a document and inventories editable widgets", async () => {
    const provider = memoryProvider(HERO_DOC);
    const bridge = createElementorBridge(provider);
    const result = await bridge.inspect(5);
    expect(result.title).toBe("Home");
    expect(result.support.supported).toBe(true);
    expect(result.widgetCount).toBe(3);
    expect(result.editableWidgets.map((w) => w.widgetType)).toEqual(["heading", "text-editor", "button"]);
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
      async getElementorDocument() {
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
});
