import { describe, expect, it } from "vitest";
import type { BrandProfile } from "@forge/core";
import type { AudienceProfile } from "@forge/content-intelligence";
import { evaluateContentQuality } from "./evaluator.js";

function makeBrand(overrides: Partial<BrandProfile> = {}): BrandProfile {
  return {
    id: "brand-test",
    projectId: "test",
    companyName: "Acme Accounting",
    industry: "accounting",
    companyType: "business",
    products: [],
    services: [],
    categories: [],
    primaryTopics: [],
    secondaryTopics: [],
    entities: [],
    competitors: [],
    locations: [],
    targetCountries: [],
    languages: [],
    audiences: [],
    buyerPersonas: [],
    customerJourney: [],
    goals: [],
    conversionGoals: [],
    uniqueSellingPoints: [],
    trustSignals: [],
    writingStyle: "conversational",
    tone: "neutral",
    readingLevel: "grade-8",
    forbiddenWords: [],
    preferredVocabulary: [],
    ctaStyle: "action",
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

function makeAudience(overrides: Partial<AudienceProfile> = {}): AudienceProfile {
  return {
    level: "general",
    confidence: 0.5,
    signals: [],
    ...overrides,
  };
}

describe("evaluateContentQuality", () => {
  it("passes grounded, specific, audience-aware copy", () => {
    const result = evaluateContentQuality({
      content:
        "Accounting software that automates invoicing and expense tracking to save small businesses 10 hours a month. Trusted by 2,000+ teams.",
      existingContent:
        "Premium accounting software for small businesses. Customers save 10 hours a month. Trusted by 2,000+ teams.",
      sectionKind: "benefits",
      targetKeyword: "accounting software",
      brand: makeBrand({ audiences: ["small businesses"], trustSignals: ["Trusted by 2,000+ teams"] }),
      audience: makeAudience({ level: "beginner", signals: ["small businesses"] }),
    });

    expect(result.accurate).toBe(true);
    expect(result.useful).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.metrics.ungroundedClaims).toEqual([]);
    expect(result.metrics.specificSignalCount).toBeGreaterThan(0);
    expect(result.checks.find((check) => check.id === "accuracy")?.status).toBe("pass");
  });

  it("fails accuracy for a numeric claim not present in source evidence", () => {
    const result = evaluateContentQuality({
      content: "Trusted by 12,000+ teams.",
      existingContent: "Premium accounting software for small businesses. Trusted by 2,000+ teams.",
      sectionKind: "hero",
      targetKeyword: "accounting software",
      brand: makeBrand({ trustSignals: ["Trusted by 2,000+ teams"] }),
      audience: makeAudience(),
    });

    expect(result.accurate).toBe(false);
    expect(result.errors.join(" ")).toContain("12,000+");
    expect(result.checks.find((check) => check.id === "accuracy")?.status).toBe("fail");
  });

  it("flags generic fluff as low usefulness", () => {
    const result = evaluateContentQuality({
      content:
        "In today's fast-paced world, unlock the power of cutting-edge software and take your business to the next level.",
      existingContent: "",
      sectionKind: "hero",
      targetKeyword: "",
      brand: makeBrand(),
      audience: makeAudience(),
    });

    expect(result.useful).toBe(false);
    expect(result.warnings.join(" ")).toMatch(/generic|concrete|usefulness/i);
    expect(result.checks.find((check) => check.id === "usefulness")?.status).toBe("fail");
  });

  it("warns when the section misses the audience and target keyword", () => {
    const result = evaluateContentQuality({
      content: "Automate invoicing and expense tracking with one dashboard.",
      existingContent: "",
      sectionKind: "features",
      targetKeyword: "payroll software",
      brand: makeBrand({ audiences: ["small businesses"] }),
      audience: makeAudience({ level: "beginner", signals: ["small businesses"] }),
    });

    expect(result.warnings.join(" ")).toContain("Audience mismatch");
    expect(result.warnings.join(" ")).toContain("Keyword mismatch");
    expect(result.checks.find((check) => check.id === "audience")?.status).toBe("warn");
    expect(result.checks.find((check) => check.id === "keyword")?.status).toBe("warn");
  });

  it("warns about hard-to-read body copy", () => {
    const result = evaluateContentQuality({
      content:
        "Our comprehensive accounting platform provides organizations with the ability to reconcile bank accounts, generate financial reports, automate invoice reminders, manage expense approvals, forecast cash flow, coordinate collaboration across distributed finance teams, and maintain compliance with complex regulatory requirements and tight deadlines.",
      existingContent: "",
      sectionKind: "benefits",
      targetKeyword: "accounting platform",
      brand: makeBrand({ audiences: ["finance teams"] }),
      audience: makeAudience({ signals: ["finance teams"] }),
    });

    expect(result.warnings.join(" ")).toMatch(/Readability:/);
    expect(result.checks.find((check) => check.id === "readability")?.status).toBe("warn");
  });

  it("accepts a concrete CTA without requiring a feature signal", () => {
    const result = evaluateContentQuality({
      content: "Start your free trial",
      existingContent: "",
      sectionKind: "cta",
      targetKeyword: "",
      brand: makeBrand(),
      audience: makeAudience(),
    });

    expect(result.useful).toBe(true);
    expect(result.warnings.join(" ")).not.toContain("concrete action");
  });

  it("warns about prohibited brand terms", () => {
    const result = evaluateContentQuality({
      content: "Track expenses instantly and easily.",
      existingContent: "",
      sectionKind: "features",
      targetKeyword: "expense tracking",
      brand: makeBrand({ forbiddenWords: ["easily"] }),
      audience: makeAudience(),
    });

    expect(result.warnings.join(" ")).toContain("prohibited");
    expect(result.checks.find((check) => check.id === "brand")?.status).toBe("warn");
  });
});
