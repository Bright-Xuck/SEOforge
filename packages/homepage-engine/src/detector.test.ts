import { describe, expect, it } from "vitest";
import { HomepageDetector } from "./index.js";

const detector = new HomepageDetector();

describe("HomepageDetector", () => {
  it("detects a front page from the root URL", () => {
    const snapshot = {
      finalUrl: "https://example.com/",
      pageTitle: "Example",
      metaDescription: "",
      rawHtml: "<html><body><footer></footer></body></html>",
      headings: [],
      jsonLd: [],
    } as never;
    expect(detector.detectType(snapshot, "https://example.com")).toBe("front-page");
  });
});
