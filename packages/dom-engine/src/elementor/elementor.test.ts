// @forge/dom-engine
// Sprint 25 Elementor layer tests: document model, round-trip, mapping,
// resolution (all error codes), rich text, mutation, verification.

import { describe, it, expect } from "vitest";
import {
  parseElementorDocument,
  serializeElementorDocument,
  checkElementorDocumentSupport,
  fingerprintElementorTree,
} from "./document.js";
import {
  resolveElementorPatch,
} from "./patch-resolver.js";
import {
  applyElementorMutations,
  verifyElementorMutation,
} from "./mutator.js";
import {
  sanitizeElementorRichText,
  textContentOfRichText,
  assertElementorContentCompatible,
} from "./rich-text.js";
import {
  mapUniversalPageToElementor,
} from "./universal-mapper.js";
import { buildUniversalPage } from "../page/builder.js";
import {
  FIXTURE_A_HERO,
  FIXTURE_A_RENDERED_HTML,
  FIXTURE_B_NESTED,
  FIXTURE_C_MULTIPLE,
  FIXTURE_D_RICH_TEXT,
  FIXTURE_E_UNKNOWN,
  FIXTURE_F_GLOBALS,
  FIXTURE_I_UNSUPPORTED,
} from "./fixtures.js";

function parse(raw: string, version = "3.24.0") {
  const doc = parseElementorDocument(raw, { elementorVersion: version, editMode: "builder" });
  if (!doc) throw new Error("fixture did not parse");
  return doc;
}

function headingPatch(target?: { elementId: string; settingsKey: string }) {
  return {
    currentContent: "Accounting Software for Small Businesses",
    proposedContent: "Modern Accounting Software for Growing Businesses",
    target: { format: "elementor" as const, ...(target ?? { elementId: "heading-1", settingsKey: "title" }) },
  };
}

describe("ElementorDocument model", () => {
  it("parses a hero container (Fixture A)", () => {
    const doc = parse(FIXTURE_A_HERO);
    expect(doc.root.type).toBe("root");
    expect(doc.root.children).toHaveLength(1);
    expect(doc.fingerprint).toMatch(/^[0-9a-z]+$/);
  });

  it("round-trips losslessly (parse → serialize → parse → same fingerprint)", () => {
    const doc = parse(FIXTURE_A_HERO);
    const serialized = serializeElementorDocument(doc);
    const reParsed = parseElementorDocument(serialized, {});
    expect(reParsed).not.toBeNull();
    if (!reParsed) throw new Error("re-parse failed");
    expect(fingerprintElementorTree(reParsed.root)).toBe(doc.fingerprint);
  });

  it("preserves unknown settings (Fixture E)", () => {
    const doc = parse(FIXTURE_E_UNKNOWN);
    const serialized = serializeElementorDocument(doc);
    expect(serialized).toContain("vendor_specific_setting");
    expect(serialized).toContain("animation");
    expect(serialized).toContain("custom_theme_thing");
  });

  it("preserves __globals__ references (Fixture F)", () => {
    const doc = parse(FIXTURE_F_GLOBALS);
    const serialized = serializeElementorDocument(doc);
    expect(serialized).toContain("__globals__");
    expect(serialized).toContain("globals/colors?id=primary");
    expect(serialized).toContain("globals/typography?id=heading");
  });

  it("rejects documents older than the supported version (unsupported_document_version)", () => {
    const doc = parse(FIXTURE_A_HERO, "1.9.0");
    const support = checkElementorDocumentSupport(doc);
    expect(support.supported).toBe(false);
    if (!support.supported) expect(support.code).toBe("unsupported_document_version");
  });

  it("accepts current container-era versions", () => {
    const doc = parse(FIXTURE_A_HERO, "3.24.0");
    expect(checkElementorDocumentSupport(doc).supported).toBe(true);
  });

  it("supports legacy section/column layouts (still parseable)", () => {
    const legacy = JSON.stringify([
      { id: "s1", elType: "section", settings: {}, elements: [
        { id: "c1", elType: "column", settings: { _column_size: 50 }, elements: [
          { id: "w1", elType: "widget", widgetType: "heading", settings: { title: "Legacy" }, elements: [] },
        ] },
      ] },
    ]);
    const doc = parse(legacy);
    expect(checkElementorDocumentSupport(doc).supported).toBe(true);
  });
});

describe("UniversalPage ↔ Elementor mapping", () => {
  it("maps rendered widgets via data-id (Fixture A rendered HTML)", () => {
    const doc = parse(FIXTURE_A_HERO);
    const page = buildUniversalPage(FIXTURE_A_RENDERED_HTML, "https://example.com", "Home");
    const map = mapUniversalPageToElementor(page, doc);
    const byStrategy = map.entries.filter((e) => e.strategy === "data-id");
    expect(byStrategy.length).toBeGreaterThanOrEqual(3);
    expect(byStrategy.some((e) => e.elementId === "heading-1" && e.widgetType === "heading")).toBe(true);
    expect(byStrategy.some((e) => e.elementId === "button-1" && e.widgetType === "button")).toBe(true);
    expect(map.entries.every((e) => e.confidence >= 0.6)).toBe(true);
  });
});

describe("Patch resolution", () => {
  it("resolves an element-id target (Fixture A)", () => {
    const doc = parse(FIXTURE_A_HERO);
    const resolution = resolveElementorPatch(doc, headingPatch());
    expect(resolution.ok).toBe(true);
    if (!resolution.ok) return;
    expect(resolution.targets).toHaveLength(1);
    const target = resolution.targets[0];
    expect(target?.elementId).toBe("heading-1");
    expect(target?.settingsKey).toBe("title");
    expect(target?.richText).toBe(true);
    expect(target?.currentValue).toBe("Accounting Software for Small Businesses");
    expect(target?.elementPath).toContain("container");
  });

  it("returns PATCH_TARGET_NOT_FOUND for an unknown element id", () => {
    const doc = parse(FIXTURE_A_HERO);
    const resolution = resolveElementorPatch(doc, headingPatch({ elementId: "nope", settingsKey: "title" }));
    expect(resolution.ok).toBe(false);
    if (resolution.ok) return;
    expect(resolution.code).toBe("PATCH_TARGET_NOT_FOUND");
  });

  it("returns PATCH_TARGET_NOT_FOUND when the setting is absent", () => {
    const doc = parse(FIXTURE_A_HERO);
    const resolution = resolveElementorPatch(doc, {
      proposedContent: "x",
      target: { format: "elementor", elementId: "button-1", settingsKey: "not_a_real_control" },
    });
    expect(resolution.ok).toBe(false);
    if (resolution.ok) return;
    expect(resolution.code).toBe("PATCH_TARGET_NOT_FOUND");
  });

  it("returns PATCH_TARGET_AMBIGUOUS when a semantic intent matches multiple widgets (Fixture C)", () => {
    const doc = parse(FIXTURE_C_MULTIPLE);
    const resolution = resolveElementorPatch(doc, {
      proposedContent: "New heading",
      semanticIntent: { kind: "heading-text" },
    });
    expect(resolution.ok).toBe(false);
    if (resolution.ok) return;
    expect(resolution.code).toBe("PATCH_TARGET_AMBIGUOUS");
  });

  it("returns PATCH_TARGET_NOT_EDITABLE for layout elements", () => {
    const doc = parse(FIXTURE_A_HERO);
    const resolution = resolveElementorPatch(doc, {
      proposedContent: "x",
      target: { format: "elementor", elementId: "hero-container", settingsKey: "title" },
    });
    expect(resolution.ok).toBe(false);
    if (resolution.ok) return;
    expect(resolution.code).toBe("PATCH_TARGET_NOT_EDITABLE");
  });

  it("returns PATCH_UNSUPPORTED_WIDGET for raw HTML widgets (Fixture I)", () => {
    const doc = parse(FIXTURE_I_UNSUPPORTED);
    const resolution = resolveElementorPatch(doc, {
      proposedContent: "x",
      target: { format: "elementor", elementId: "html-1", settingsKey: "html" },
    });
    expect(resolution.ok).toBe(false);
    if (resolution.ok) return;
    expect(resolution.code).toBe("PATCH_UNSUPPORTED_WIDGET");
  });

  it("returns PATCH_STALE when current content no longer matches the patch", () => {
    const doc = parse(FIXTURE_A_HERO);
    const resolution = resolveElementorPatch(doc, {
      currentContent: "The old heading that is no longer live",
      proposedContent: "New heading",
      target: { format: "elementor", elementId: "heading-1", settingsKey: "title" },
    });
    expect(resolution.ok).toBe(false);
    if (resolution.ok) return;
    expect(resolution.code).toBe("PATCH_STALE");
  });

  it("returns PATCH_STALE on fingerprint mismatch (sourceFingerprint)", () => {
    const doc = parse(FIXTURE_A_HERO);
    const resolution = resolveElementorPatch(doc, headingPatch(), { expectedFingerprint: "different-fingerprint" });
    expect(resolution.ok).toBe(false);
    if (resolution.ok) return;
    expect(resolution.code).toBe("PATCH_STALE");
  });

  it("returns PATCH_UNSUPPORTED_VERSION for old documents", () => {
    const doc = parse(FIXTURE_A_HERO, "1.9.0");
    const resolution = resolveElementorPatch(doc, headingPatch());
    expect(resolution.ok).toBe(false);
    if (resolution.ok) return;
    expect(resolution.code).toBe("PATCH_UNSUPPORTED_VERSION");
  });

  it("returns PATCH_INVALID_TARGET when the patch has no target", () => {
    const doc = parse(FIXTURE_A_HERO);
    const resolution = resolveElementorPatch(doc, { proposedContent: "x" });
    expect(resolution.ok).toBe(false);
    if (resolution.ok) return;
    expect(resolution.code).toBe("PATCH_INVALID_TARGET");
  });

  it("resolves nested image.alt via the schema path", () => {
    const imageDoc = JSON.stringify([
      {
        id: "img-container",
        elType: "container",
        settings: {},
        elements: [
          {
            id: "img-1",
            elType: "widget",
            widgetType: "image",
            settings: { image: { id: 42, url: "https://example.com/pic.jpg", alt: "Old alt" } },
            elements: [],
          },
        ],
      },
    ]);
    const doc = parse(imageDoc);
    const resolution = resolveElementorPatch(doc, {
      currentContent: "Old alt",
      proposedContent: "New alt text",
      target: { format: "elementor", elementId: "img-1", settingsKey: "alt" },
    });
    expect(resolution.ok).toBe(true);
    if (!resolution.ok) return;
    expect(resolution.targets[0]?.settingsPath).toEqual(["image", "alt"]);
  });
});

describe("Rich text rules", () => {
  it("preserves allowed markup and strips unsafe markup (Fixture D)", () => {
    const sanitized = sanitizeElementorRichText(
      '<p>Hello <strong>world</strong> <em>today</em> <a href="https://example.com">link</a></p><script>alert(1)</script><style>body{}</style><ul><li>A</li></ul>',
    );
    expect(sanitized).toContain("<strong>world</strong>");
    expect(sanitized).toContain("<em>today</em>");
    expect(sanitized).toContain('<a href="https://example.com">link</a>');
    expect(sanitized).toContain("<ul>");
    expect(sanitized).not.toContain("<script");
    expect(sanitized).not.toContain("<style");
  });

  it("extracts visible text for stale comparisons", () => {
    expect(textContentOfRichText("<p>Premium <strong>accounting</strong> software.</p>")).toBe("Premium accounting software.");
  });

  it("rejects markup in plain-text controls (button text)", () => {
    expect(assertElementorContentCompatible("button", "text", "<b>Bold</b>").length).toBeGreaterThan(0);
    expect(assertElementorContentCompatible("button", "text", "Plain text")).toHaveLength(0);
  });

  it("accepts markup in rich-text controls (heading title)", () => {
    expect(assertElementorContentCompatible("heading", "title", "<strong>Bold</strong> heading")).toHaveLength(0);
  });
});

describe("Mutation + verification", () => {
  it("changes the target and leaves unrelated settings unchanged (round trip)", () => {
    const original = parse(FIXTURE_A_HERO);
    const resolution = resolveElementorPatch(original, headingPatch());
    if (!resolution.ok) throw new Error("expected resolution");
    const mutation = applyElementorMutations(original, resolution.targets);

    // Target changed.
    const heading = mutation.document.root.children[0]?.children[0];
    expect(heading?.settings.title).toBe("Modern Accounting Software for Growing Businesses");

    // Verification passes.
    const verification = verifyElementorMutation(original, mutation.document, resolution.targets);
    expect(verification.ok).toBe(true);
    expect(verification.targetedChanged).toBe(true);
    expect(verification.unrelatedUnchanged).toBe(true);

    // Unrelated settings survive.
    const serialized = serializeElementorDocument(mutation.document);
    expect(serialized).toContain("Premium accounting software for modern businesses.");
    expect(serialized).toContain("Get Started");
  });

  it("preserves __globals__ through a mutation (Fixture F)", () => {
    const original = parse(FIXTURE_F_GLOBALS);
    const resolution = resolveElementorPatch(original, {
      currentContent: "Globals heading",
      proposedContent: "New globals heading",
      target: { format: "elementor", elementId: "globals-heading", settingsKey: "title" },
    });
    if (!resolution.ok) throw new Error("expected resolution");
    const mutation = applyElementorMutations(original, resolution.targets);
    const serialized = serializeElementorDocument(mutation.document);
    expect(serialized).toContain("__globals__");
    expect(serialized).toContain("globals/colors?id=primary");
    expect(verifyElementorMutation(original, mutation.document, resolution.targets).ok).toBe(true);
  });

  it("sanitizes rich text at mutation time (Fixture D)", () => {
    const original = parse(FIXTURE_D_RICH_TEXT);
    const editorBefore = original.root.children[0]?.children[0]?.settings.editor as string | undefined;
    if (typeof editorBefore !== "string") throw new Error("expected editor string");
    const resolution = resolveElementorPatch(original, {
      currentContent: textContentOfRichText(editorBefore),
      proposedContent: "Why Forge<script>bad()</script>",
      target: { format: "elementor", elementId: "rich-1", settingsKey: "editor" },
    });
    if (!resolution.ok) throw new Error("expected resolution");
    const mutation = applyElementorMutations(original, resolution.targets);
    const editor = mutation.document.root.children[0]?.children[0]?.settings.editor as string | undefined;
    expect(String(editor)).not.toContain("<script");
  });

  it("detects unrelated structure changes (verification fails)", () => {
    const original = parse(FIXTURE_A_HERO);
    const tampered = parse(FIXTURE_A_HERO);
    const tamperedNode = tampered.root.children[0]?.children[1];
    if (!tamperedNode) throw new Error("expected tamper target");
    (tamperedNode.settings as Record<string, unknown>).editor = "<p>Tampered</p>";
    const resolution = resolveElementorPatch(original, headingPatch());
    if (!resolution.ok) throw new Error("expected resolution");
    const verification = verifyElementorMutation(original, tampered, resolution.targets);
    expect(verification.ok).toBe(false);
    expect(verification.unrelatedUnchanged).toBe(false);
  });
});

describe("Nested containers (Fixture B)", () => {
  it("resolves and mutates widgets inside nested containers", () => {
    const original = parse(FIXTURE_B_NESTED);
    const resolution = resolveElementorPatch(original, {
      currentContent: "Feature B",
      proposedContent: "Feature B Enhanced",
      target: { format: "elementor", elementId: "b-heading", settingsKey: "title" },
    });
    expect(resolution.ok).toBe(true);
    if (!resolution.ok) return;
    const mutation = applyElementorMutations(original, resolution.targets);
    expect(verifyElementorMutation(original, mutation.document, resolution.targets).ok).toBe(true);
    const serialized = serializeElementorDocument(mutation.document);
    expect(serialized).toContain("Feature B Enhanced");
    expect(serialized).toContain("Feature A");
  });
});
