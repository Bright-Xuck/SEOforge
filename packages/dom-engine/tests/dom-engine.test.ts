// @forge/dom-engine — tests

import { describe, it, expect } from "vitest";
import { detectFormat, isGutenbergContent, isActiveElementor } from "../src/format-detector.js";
import { createLeaf, createNode, findNodeById, findNodeByPath, cloneTree, fingerprintNode } from "../src/tree/tree-node.js";
import { applyPatch, diffTrees } from "../src/tree/tree-patcher.js";
import { computeTreeDiff } from "../src/tree/tree-differ.js";
import { validatePatch, validatePatchSequence } from "../src/tree/tree-validator.js";
import { parseElementorData } from "../src/elementor/elementor-parser.js";
import { serializeElementorData } from "../src/elementor/elementor-serializer.js";
import { resolveElementorSettingsKey, ELEMENTOR_WIDGET_SCHEMA } from "../src/elementor/widget-schema.js";
import { parseGutenbergBlocks, extractBlockNames } from "../src/gutenberg/block-grammar-parser.js";
import { serializeGutenbergBlocks } from "../src/gutenberg/block-grammar-serializer.js";
import { computeBlockFingerprint, fingerprintsEqual } from "../src/gutenberg/block-fingerprint.js";
import { mapHtmlToDom } from "../src/generic-html/html-dom-mapper.js";
import { mergePatches } from "../src/patch/patch-merger.js";

describe("format-detector", () => {
  it("detects Elementor when meta is present and active", () => {
    const result = detectFormat('{"id":"6a637978"}', "true", "<p>Hello</p>");
    expect(result.format).toBe("elementor");
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it("detects Gutenberg by block delimiters", () => {
    const result = detectFormat(undefined, undefined, "<!-- wp:paragraph --><p>Hello</p><!-- /wp:paragraph -->");
    expect(result.format).toBe("gutenberg");
  });

  it("falls back to generic-html", () => {
    const result = detectFormat(undefined, undefined, "<html><body>Hello</body></html>");
    expect(result.format).toBe("generic-html");
  });

  it("isGutenbergContent detects block delimiters", () => {
    expect(isGutenbergContent("<!-- wp:paragraph -->")).toBe(true);
    expect(isGutenbergContent("<p>Hello</p>")).toBe(false);
  });

  it("isActiveElementor validates JSON and edit mode", () => {
    expect(isActiveElementor('[]', "true")).toBe(true);
    expect(isActiveElementor('[]', "false")).toBe(false);
    expect(isActiveElementor("not-json", "true")).toBe(false);
  });
});

describe("tree-node", () => {
  it("creates leaf and node trees", () => {
    const leaf = createLeaf("1", "widget", { title: "Hello" });
    expect(leaf.children).toHaveLength(0);
    const node = createNode("2", "section", {}, [leaf]);
    expect(node.children).toHaveLength(1);
  });

  it("finds node by id", () => {
    const tree = createNode("root", "root", {}, [
      createLeaf("a", "widget"),
      createLeaf("b", "widget"),
    ]);
    expect(findNodeById(tree, "b")?.id).toBe("b");
    expect(findNodeById(tree, "missing")).toBeUndefined();
  });

  it("finds node by path", () => {
    const tree = createNode("root", "root", {}, [
      createNode("child-0", "section", {}, [createLeaf("leaf", "widget")]),
    ]);
    expect(findNodeByPath(tree, [0, 0])?.id).toBe("leaf");
    expect(findNodeByPath(tree, [5])).toBeUndefined();
  });

  it("clones tree deeply", () => {
    const tree = createLeaf("1", "widget", { title: "Hello" });
    const cloned = cloneTree(tree);
    expect(cloned.id).toBe("1");
    expect(cloned.settings).not.toBe(tree.settings);
  });

  it("computes stable fingerprint", () => {
    const node = createLeaf("1", "widget", { className: "x" });
    const fp = fingerprintNode(node);
    expect(fp).toContain("widget");
    expect(fp).toContain("1");
  });
});

describe("tree-patcher", () => {
  it("applies replace at root", () => {
    const root = createNode("root", "root", {}, [createLeaf("1", "widget", { title: "Old" })]);
    const patched = applyPatch(root, ["0"], "replace", { title: "New" });
    expect(patched.children[0].settings.title).toBe("New");
  });

  it("computes tree diff", () => {
    const before = createNode("root", "root", {}, [createLeaf("1", "widget", { title: "Old" })]);
    const after = createNode("root", "root", {}, [createLeaf("1", "widget", { title: "New" })]);
    const diffs = diffTrees(before, after);
    expect(diffs.length).toBeGreaterThan(0);
    expect(diffs[0].operation).toBe("replace");
  });
});

describe("tree-validator", () => {
  it("validates test operation", () => {
    const root = createNode("root", "root", {}, [createLeaf("1", "widget", { id: "abc" })]);
    const errors = validatePatch(root, ["0"], "test", "abc");
    expect(errors).toHaveLength(0);
  });

  it("reports missing value for replace", () => {
    const root = createNode("root", "root", {}, [createLeaf("1", "widget")]);
    const errors = validatePatch(root, ["0"], "replace");
    expect(errors.some((e) => e.includes("Missing value"))).toBe(true);
  });

  it("validates patch sequence for duplicates", () => {
    const errors = validatePatchSequence([
      { path: ["0"], operation: "replace" },
      { path: ["0"], operation: "replace" },
    ]);
    expect(errors.some((e) => e.includes("Duplicate"))).toBe(true);
  });
});

describe("elementor-parser", () => {
  it("parses legacy section/column/widget structure", () => {
    const data = JSON.stringify([
      {
        id: "section-1",
        elType: "section",
        elements: [
          {
            id: "column-1",
            elType: "column",
            elements: [
              { id: "widget-1", elType: "widget", widgetType: "heading", settings: { title: "Hello" } },
            ],
          },
        ],
      },
    ]);
    const root = parseElementorData(data);
    expect(root?.children[0].id).toBe("section-1");
    expect(root?.children[0].children[0].id).toBe("column-1");
    expect(root?.children[0].children[0].children[0].id).toBe("widget-1");
  });

  it("serializes round-trips losslessly", () => {
    const data = JSON.stringify([{ id: "w1", elType: "widget", widgetType: "heading", settings: { title: "Hello" }, elements: [] }]);
    const root = parseElementorData(data);
    const serialized = serializeElementorData(root!);
    const reparsed = parseElementorData(serialized);
    expect(reparsed?.children[0].id).toBe("w1");
    expect(reparsed?.children[0].settings.title).toBe("Hello");
  });
});

describe("widget-schema", () => {
  it("resolves settings keys for known widgets", () => {
    expect(resolveElementorSettingsKey("heading", "heading-text")).toBe("title");
    expect(resolveElementorSettingsKey("button", "button-text")).toBe("text");
    expect(resolveElementorSettingsKey("text-editor", "text-content")).toBe("editor");
  });

  it("returns null for unknown widget", () => {
    expect(resolveElementorSettingsKey("unknown", "anything")).toBeNull();
  });
});

describe("block-grammar-parser", () => {
  it("parses block comment delimiters", () => {
    const content = '<!-- wp:paragraph --><p>Hello</p><!-- /wp:paragraph -->';
    const root = parseGutenbergBlocks(content);
    expect(root.children).toHaveLength(1);
    expect(root.children[0].widgetType).toBe("paragraph");
    expect(root.children[0].settings.innerHtml).toBe("<p>Hello</p>");
  });

  it("extracts block names", () => {
    const content = "<!-- wp:heading --><h2>Hi</h2><!-- /wp:heading -->";
    const names = extractBlockNames(content);
    expect(names).toEqual(["heading"]);
  });
});

describe("block-grammar-serializer", () => {
  it("serializes blocks to comment-delimited markup", () => {
    const root = {
      id: "root",
      type: "root",
      settings: {},
      children: [
        { id: "b1", type: "block", widgetType: "paragraph", settings: { blockName: "paragraph", innerHtml: "<p>Hello</p>" }, children: [], raw: null },
      ],
      raw: null,
    };
    const output = serializeGutenbergBlocks(root);
    expect(output).toContain("<!-- wp:paragraph -->");
    expect(output).toContain("<p>Hello</p>");
    expect(output).toContain("<!-- /wp:paragraph -->");
  });
});

describe("block-fingerprint", () => {
  it("computes stable fingerprint", () => {
    const fp = computeBlockFingerprint("core/paragraph", { className: "my-class" }, 0);
    expect(fp.blockName).toBe("core/paragraph");
    expect(fp.siblingIndex).toBe(0);
  });

  it("compares fingerprints for equality", () => {
    const a = computeBlockFingerprint("core/paragraph", {}, 0);
    const b = computeBlockFingerprint("core/paragraph", {}, 0);
    const c = computeBlockFingerprint("core/heading", {}, 0);
    expect(fingerprintsEqual(a, b)).toBe(true);
    expect(fingerprintsEqual(a, c)).toBe(false);
  });
});

describe("html-dom-mapper", () => {
  it("maps HTML sections to DOMSection[]", () => {
    const html = '<section class="hero"><h1>Hello</h1><p>World</p></section>';
    const sections = mapHtmlToDom(html);
    expect(sections.some((s) => s.kind === "hero")).toBe(true);
  });
});

describe("patch-merger", () => {
  it("sorts patches by operation order", () => {
    const patches = [
      { id: "1", confidence: 1, operation: "add" as const, target: { format: "generic-html" as const, resolvedSelector: { selector: "x", confidence: 1, strategy: "css" as const } }, semanticIntent: { kind: "x", value: "y" }, proposedContent: "", validation: { valid: true, errors: [], warnings: [] }, sectionId: "", selector: "", currentContent: "", diff: { sectionId: "", current: "", generated: "", changedSentences: [], addedEntities: [], removedEntities: [], seoScoreDelta: 0 }, estimatedImpact: "", warnings: [], generatedBy: "", provider: "", promptVersion: "", createdAt: "" },
      { id: "2", confidence: 1, operation: "remove" as const, target: { format: "generic-html" as const, resolvedSelector: { selector: "y", confidence: 1, strategy: "css" as const } }, semanticIntent: { kind: "x", value: "y" }, proposedContent: "", validation: { valid: true, errors: [], warnings: [] }, sectionId: "", selector: "", currentContent: "", diff: { sectionId: "", current: "", generated: "", changedSentences: [], addedEntities: [], removedEntities: [], seoScoreDelta: 0 }, estimatedImpact: "", warnings: [], generatedBy: "", provider: "", promptVersion: "", createdAt: "" },
    ];
    const result = mergePatches(patches);
    expect(result.patches[0].id).toBe("2");
    expect(result.patches[1].id).toBe("1");
  });
});
