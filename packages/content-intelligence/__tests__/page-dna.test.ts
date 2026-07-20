import { describe, it, expect } from "vitest";
import * as cheerio from "cheerio";
import { buildPageDNA } from "../src/page-dna/builder.js";
import {
  validatePageDNAVersion,
  isPageDNACompatible,
  getPageDNAWarnings,
  createPageDNAWithVersion,
  SCHEMA_COMPATIBILITY,
} from "../src/page-dna/version-validator.js";
import { makeRichSnapshot } from "./fixtures.js";

describe("buildPageDNA", () => {
  it("aggregates detectors into a versioned DNA", () => {
    const snapshot = makeRichSnapshot();
    const $ = cheerio.load(snapshot.rawHtml);
    const dna = buildPageDNA(snapshot, $);
    expect(dna.schemaVersion).toBe("1.0");
    expect(dna.dnaVersion).toBe("1.0");
    expect(dna.generatorVersion).toBeTruthy();
    expect(dna.analyzedAt).toBeTruthy();
    expect(dna.pageType.kind).toBeTruthy();
    expect(dna.intent.primary).toBeTruthy();
    expect(dna.audience.level).toBeTruthy();
    expect(dna.sectionInventory.sections.length).toBeGreaterThan(0);
    expect(dna.topics.length).toBeGreaterThanOrEqual(0);
    expect(dna.entities.length).toBeGreaterThanOrEqual(0);
  });
});

describe("version-validator", () => {
  it("validates the current schema version", () => {
    expect(validatePageDNAVersion("1.0")).toBe(true);
    expect(validatePageDNAVersion("2.0" as never)).toBe(false);
  });

  it("reports compatibility", () => {
    expect(isPageDNACompatible("1.0")).toBe(true);
    expect(SCHEMA_COMPATIBILITY["1.0"]).toContain("1.0");
  });

  it("creates a versioned DNA wrapper", () => {
    const dna = createPageDNAWithVersion({
      url: "https://x.com",
      pageType: { kind: "generic", confidence: 0.5, evidence: [] },
      intent: { primary: "mixed", scores: {} as never, evidence: [] },
      audience: { level: "general", confidence: 0.5, signals: [] },
      contentLength: 0,
      headingDistribution: { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0, total: 0 },
      readingLevel: "unknown",
      sectionInventory: { sections: [], present: [], missing: [] },
      entities: [],
      topics: [],
      links: { internal: 0, external: 0, total: 0, internalAnchors: [], externalAnchors: [] },
      media: { images: 0, imagesWithAlt: 0, imagesWithoutAlt: 0, videos: 0, hasHeroImage: false },
      trust: { hasTestimonials: false, hasReviews: false, hasCertifications: false, hasSecurityBadges: false, hasAboutPage: false, hasContactInfo: false, hasSocialProof: false, score: 0 },
      schema: { types: [], count: 0, hasOrganization: false, hasProduct: false, hasBreadcrumb: false, hasFAQ: false },
      metadata: { hasTitle: false, hasMetaDescription: false, hasCanonical: false, hasOpenGraph: false, hasTwitterCard: false, hasJsonLd: false, hasLang: false },
    });
    expect(dna.schemaVersion).toBe("1.0");
    expect(dna.dnaVersion).toBe("1.0");
    expect(dna.generatorVersion).toBeTruthy();
    expect(getPageDNAWarnings(dna).length).toBeGreaterThan(0);
  });
});
