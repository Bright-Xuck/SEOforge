// @forge/dom-engine
// Tests for the Universal Page Model, DOM Diff Engine, and DOM Validation.

import { describe, it, expect } from "vitest";
import { detectBuilder, buildUniversalPage, parse, diffDom, normalizeRichText, createPatch, validateDom } from "./index.js";

describe("Builder Detection", () => {
  it("detects Elementor content", () => {
    const html = '<div class="elementor-element"></div>';
    const result = detectBuilder(html);
    expect(result.builderType).toBe("elementor");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("detects Gutenberg content", () => {
    const html = '<div class="wp-block-group"><!-- wp:paragraph --><p>Hello</p><!-- /wp:paragraph --></div>';
    const result = detectBuilder(html);
    expect(result.builderType).toBe("gutenberg");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("falls back to classic when no builder detected", () => {
    const html = "<div><p>Hello</p></div>";
    const result = detectBuilder(html);
    expect(result.builderType).toBe("classic");
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});

describe("Universal Page Builder", () => {
  it("builds a page from HTML with regions", () => {
    const html = `
      <html><body>
        <header class="site-header">
          <h1>Site Title</h1>
        </header>
        <main>
          <section class="hero">
            <h2>Welcome</h2>
            <p>Hello world</p>
          </section>
        </main>
        <footer class="site-footer">
          <p>Footer text</p>
        </footer>
      </body></html>
    `;
    const page = buildUniversalPage(html, "https://example.com", "Test Page");
    expect(page.url).toBe("https://example.com");
    expect(page.title).toBe("Test Page");
    expect(page.regions.length).toBeGreaterThan(0);
    expect(page.builder.builderType).toBe("classic");
    expect(page.rawHtml).toBe(html);
  });

  it("generates stable IDs", () => {
    const html = "<div><p>Hello</p></div>";
    const page1 = buildUniversalPage(html);
    const page2 = buildUniversalPage(html);
    expect(page1.id).toBe(page2.id);
  });

  it("detects hero sections", () => {
    const html = `
      <html><body>
        <main>
          <section class="hero">
            <h1>Main Title</h1>
            <p>Subtitle</p>
          </section>
        </main>
      </body></html>
    `;
    const page = buildUniversalPage(html);
    const heroSections = page.regions.flatMap((r) =>
      r.sections.filter((s) => s.kind === "hero"),
    );
    expect(heroSections.length).toBeGreaterThan(0);
  });

  it("detects semantic region kinds", () => {
    const html = `
      <html><body>
        <header>Header</header>
        <nav>Nav</nav>
        <main>Main</main>
        <aside class="sidebar">Sidebar</aside>
        <footer>Footer</footer>
      </body></html>
    `;
    const page = buildUniversalPage(html);
    const regionKinds = page.regions.map((r) => r.kind);
    expect(regionKinds).toContain("header");
    expect(regionKinds).toContain("navigation");
    expect(regionKinds).toContain("main");
    expect(regionKinds).toContain("sidebar");
    expect(regionKinds).toContain("footer");
  });

  it("parse() is a shorthand for buildUniversalPage", () => {
    const html = "<div><p>Hello</p></div>";
    const page1 = parse(html);
    const page2 = buildUniversalPage(html);
    expect(page1.id).toBe(page2.id);
  });
});

describe("DOM Diff Engine", () => {
  it("detects added regions", () => {
    const before = buildUniversalPage("<div></div>");
    const after = buildUniversalPage("<header>Header</header><div></div>");
    const diff = diffDom(before, after);
    expect(diff.addedCount).toBeGreaterThan(0);
  });

  it("detects removed sections", () => {
    const before = buildUniversalPage("<main><section><p>A</p></section></main>");
    const after = buildUniversalPage("<main></main>");
    const diff = diffDom(before, after);
    expect(diff.removedCount).toBeGreaterThan(0);
  });

  it("detects section structural changes", () => {
    const before = buildUniversalPage('<section class="hero"><h1>Title</h1></section>');
    const after = buildUniversalPage('<section class="features"><h1>Title</h1></section>');
    const diff = diffDom(before, after);
    // Different class attrs produce different section IDs, so sections are added+removed
    expect(diff.addedCount + diff.removedCount).toBeGreaterThan(0);
  });

  it("produces zero diffs for identical pages", () => {
    const html = "<div><p>Hello</p></div>";
    const before = buildUniversalPage(html);
    const after = buildUniversalPage(html);
    const diff = diffDom(before, after);
    expect(diff.addedCount).toBe(0);
    expect(diff.removedCount).toBe(0);
    expect(diff.modifiedCount).toBe(0);
  });
});

describe("Rich Text Model", () => {
  it("normalizes headings", () => {
    const html = "<h1>Main Title</h1>\n<h2>Subtitle</h2>";
    const nodes = normalizeRichText(html);
    const headings = nodes.filter((n) => n.kind === "heading");
    expect(headings).toHaveLength(2);
    expect(headings[0]!.level).toBe(1);
    expect(headings[1]!.level).toBe(2);
  });

  it("normalizes paragraphs with inline formatting", () => {
    const html = "<p>Hello <strong>world</strong></p>";
    const nodes = normalizeRichText(html);
    const para = nodes.find((n) => n.kind === "paragraph");
    expect(para).toBeDefined();
    expect(para!.children.length).toBe(1);
    const child = para!.children[0];
    expect(child).toBeDefined();
    expect(child!.kind).toBe("inline-format");
    expect(child!.format).toBe("bold");
  });

  it("creates deterministic patch IDs", () => {
    const patch1 = createPatch("replace-paragraph", "target-1", "p", "New text");
    const patch2 = createPatch("replace-paragraph", "target-1", "p", "New text");
    expect(patch1.id).toBe(patch2.id);
  });

  it("creates different patch IDs for different content", () => {
    const patch1 = createPatch("replace-paragraph", "target-1", "p", "Text A");
    const patch2 = createPatch("replace-paragraph", "target-1", "p", "Text B");
    expect(patch1.id).not.toBe(patch2.id);
  });
});

describe("DOM Validation", () => {
  it("detects missing landmarks", () => {
    const page = buildUniversalPage("<div><p>No landmarks</p></div>");
    const report = validateDom(page);
    const landmarkIssues = report.issues.filter((i) => i.code === "MISSING_LANDMARK");
    expect(landmarkIssues.length).toBeGreaterThan(0);
  });

  it("passes for a well-structured page", () => {
    const html = `
      <html><body>
        <header>Header</header>
        <main><p>Content</p></main>
        <footer>Footer</footer>
      </body></html>
    `;
    const page = buildUniversalPage(html);
    const report = validateDom(page);
    const errorIssues = report.issues.filter((i) => i.severity === "error");
    expect(errorIssues).toHaveLength(0);
  });
});
