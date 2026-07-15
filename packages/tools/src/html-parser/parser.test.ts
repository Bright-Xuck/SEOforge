import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, it, expect } from "vitest";
import { parseHtml } from "./parser.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, "..", "fixtures");

function loadFixture(name: string): string {
  return readFileSync(join(fixtures, name), "utf-8");
}

describe("parseHtml", () => {
  const sample = loadFixture("sample-page.html");
  const baseUrl = "https://example.com/";

  describe("Title extraction", () => {
    it("extracts the page title", () => {
      const result = parseHtml(sample, baseUrl);
      expect(result.pageTitle).toBe("Example Website");
    });

    it("returns empty title when absent", () => {
      const minimal = loadFixture("minimal-page.html");
      const result = parseHtml(minimal, "https://example.com/");
      expect(result.pageTitle).toBe("Minimal");
    });
  });

  describe("Meta description", () => {
    it("extracts meta description", () => {
      const result = parseHtml(sample, baseUrl);
      expect(result.metaDescription).toBe("A sample website for testing Forge's HTML parser.");
    });
  });

  describe("Canonical extraction", () => {
    it("extracts canonical URL", () => {
      const result = parseHtml(sample, baseUrl);
      expect(result.canonicalUrl).toBe("https://example.com/");
    });
  });

  describe("Heading extraction", () => {
    it("extracts all headings with levels", () => {
      const result = parseHtml(sample, baseUrl);
      expect(result.headings).toHaveLength(4);
      const [h0, h1, h2, h3] = result.headings;
      expect(h0).toEqual({ level: 1, text: "Main Heading" });
      expect(h1).toEqual({ level: 2, text: "Section One" });
      expect(h2).toEqual({ level: 2, text: "Section Two" });
      expect(h3).toEqual({ level: 3, text: "Subsection" });
    });
  });

  describe("Language and charset", () => {
    it("extracts html lang attribute", () => {
      const result = parseHtml(sample, baseUrl);
      expect(result.language).toBe("en");
    });

    it("extracts charset from meta charset", () => {
      const result = parseHtml(sample, baseUrl);
      expect(result.charset).toBe("utf-8");
    });
  });

  describe("Link extraction", () => {
    it("extracts internal and external links", () => {
      const result = parseHtml(sample, baseUrl);
      const [l0, l1] = result.links;
      expect(l0).toEqual({
        href: "https://example.com/about",
        text: "link to about",
        isInternal: true,
      });
      expect(l1).toEqual({
        href: "https://external.com",
        text: "visit",
        isInternal: false,
      });
    });

    it("skips anchor links", () => {
      const result = parseHtml(sample, baseUrl);
      const hasAnchor = result.links.some((l) => l.href.includes("#anchor"));
      expect(hasAnchor).toBe(false);
    });
  });

  describe("Image extraction", () => {
    it("extracts images with alt text and resolved src", () => {
      const result = parseHtml(sample, baseUrl);
      const [img0] = result.images;
      expect(img0).toEqual({
        src: "https://example.com/images/logo.png",
        alt: "Company Logo",
      });
    });
  });

  describe("Script and stylesheet extraction", () => {
    it("extracts external scripts", () => {
      const result = parseHtml(sample, baseUrl);
      const vendorScript = result.scripts.find((s) => s.src?.includes("vendor"));
      expect(vendorScript).toBeDefined();
      expect(vendorScript?.src).toBe("https://example.com/vendor.js");
      expect(vendorScript?.inline).toBe(false);
    });

    it("extracts stylesheets (link + inline style)", () => {
      const result = parseHtml(sample, baseUrl);
      const [sheet0, sheet1] = result.stylesheets;
      expect(sheet0).toEqual({
        href: "https://example.com/styles/main.css",
        inline: false,
      });
      expect(sheet1?.inline).toBe(true);
    });
  });

  describe("JSON-LD extraction", () => {
    it("extracts JSON-LD blocks", () => {
      const result = parseHtml(sample, baseUrl);
      const [ld0] = result.jsonLd;
      expect(ld0?.["@type"]).toBe("WebSite");
    });
  });

  describe("Open Graph metadata", () => {
    it("extracts Open Graph metadata", () => {
      const result = parseHtml(sample, baseUrl);
      expect(result.openGraph.title).toBe("Example Website");
      expect(result.openGraph.description).toBe("Open Graph description");
      expect(result.openGraph.image).toBe("https://example.com/og.png");
      expect(result.openGraph.type).toBe("website");
      expect(result.openGraph.siteName).toBe("Example");
    });
  });

  describe("Twitter Card metadata", () => {
    it("extracts Twitter Card metadata", () => {
      const result = parseHtml(sample, baseUrl);
      expect(result.twitterCard.card).toBe("summary_large_image");
      expect(result.twitterCard.title).toBe("Example Website");
      expect(result.twitterCard.image).toBe("https://example.com/twitter.png");
      expect(result.twitterCard.site).toBe("@example");
    });
  });

  describe("Robots directives", () => {
    it("parses robots meta directives", () => {
      const result = parseHtml(sample, baseUrl);
      expect(result.robots.noindex).toBe(true);
      expect(result.robots.nofollow).toBe(true);
      expect(result.robots.noarchive).toBe(false);
      expect(result.robots.nosnippet).toBe(false);
    });
  });

  describe("Favicon", () => {
    it("resolves favicon URL against base", () => {
      const result = parseHtml(sample, baseUrl);
      expect(result.favicon).toBe("https://example.com/favicon.ico");
    });
  });
});
