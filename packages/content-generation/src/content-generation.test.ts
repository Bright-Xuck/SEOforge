// @forge/content-generation — Sprint 17 unit tests (mock providers only).

import { describe, it, expect } from "vitest";
import { buildSectionDiff } from "./diff/builder.js";
import { buildPatch, summarizePatches } from "./patch/builder.js";
import { validateGeneratedSection } from "./validation/validator.js";
import { buildProjectContext } from "./context/project-context.js";
import { PromptBuilder } from "./prompt/builder.js";
import { generateContent } from "./generate.js";
import type { GeneratedSection, ValidationReport } from "./types.js";
import type { ContentPatch } from "./patch/types.js";
import type { AIEngine } from "@forge/ai-engine";
import type { PromptRegistry } from "@forge/prompt-registry";
import type { KnowledgeGraph, MemorySummaryLike, ProjectProfile } from "@forge/knowledge-engine";
import type { BrandProfile } from "@forge/core";
import type { PageDNA, SectionInfo, SearchIntent, AudienceProfile } from "@forge/content-intelligence";

function makeGeneratedSection(overrides: Partial<GeneratedSection> = {}): GeneratedSection {
  return {
    sectionId: "sec-1",
    sectionKind: "hero",
    currentSection: "old",
    generatedSection: "new and improved hero content",
    reason: { code: "x", description: "d", evidence: [] },
    expectedSeoImpact: "pending",
    confidence: { score: 0.8, basis: "ci" },
    warnings: {
      keywordStuffing: false,
      repeatedPhrases: false,
      unsafePlaceholders: false,
      lengthOutOfBounds: false,
      malformedMarkup: false,
      brokenLinks: false,
      messages: [],
    },
    estimatedTokenCost: 10,
    ...overrides,
  };
}

function makeValidation(valid = true): ValidationReport {
  return { valid, errors: valid ? [] : ["bad"], warnings: [] };
}

describe("buildSectionDiff", () => {
  it("computes changed sentences and entity deltas", () => {
    const diff = buildSectionDiff("sec", "We sell shoes. Old text.", "We sell shoes. New improved text. Acme brand.");
    expect(diff.changedSentences.length).toBeGreaterThan(0);
    expect(diff.addedEntities).toContain("Acme");
    expect(typeof diff.seoScoreDelta).toBe("number");
  });
});

describe("buildPatch", () => {
  it("produces a self-contained ContentPatch", () => {
    const section = makeGeneratedSection();
    const validation = makeValidation(true);
    const patch = buildPatch(section, "replace", "[data-section=hero]", validation, {
      provider: "openai",
      model: "gpt-4",
      promptVersion: "1.0.0",
      generatedBy: "test",
    });
    expect(patch.id).toBeTruthy();
    expect(patch.sectionId).toBe("sec-1");
    expect(patch.operation).toBe("replace");
    expect(patch.proposedContent).toBe("new and improved hero content");
    expect(patch.validation.valid).toBe(true);
    expect(patch.provider).toBe("openai");
    expect(patch.model).toBe("gpt-4");
  });

  it("summarizes patches", () => {
    const patches: ContentPatch[] = [
      buildPatch(makeGeneratedSection(), "replace", "s", makeValidation(true), { provider: "p", promptVersion: "1", generatedBy: "t" }),
      buildPatch(makeGeneratedSection({ sectionId: "sec-2" }), "append", "s2", makeValidation(false), { provider: "p", promptVersion: "1", generatedBy: "t" }),
    ];
    const summary = summarizePatches(patches);
    expect(summary.total).toBe(2);
    expect(summary.valid).toBe(1);
    expect(summary.invalid).toBe(1);
    expect(summary.byOperation.replace).toBe(1);
    expect(summary.byOperation.append).toBe(1);
  });
});

describe("validateGeneratedSection", () => {
  it("passes valid content", () => {
    const report = validateGeneratedSection(makeGeneratedSection());
    expect(report.valid).toBe(true);
    expect(report.errors.length).toBe(0);
  });

  it("flags empty content", () => {
    const report = validateGeneratedSection(makeGeneratedSection({ generatedSection: "" }));
    expect(report.valid).toBe(false);
    expect(report.errors.some((e) => e.includes("empty"))).toBe(true);
  });

  it("flags unresolved placeholders", () => {
    const report = validateGeneratedSection(makeGeneratedSection({ generatedSection: "Hello {{name}} world" }));
    expect(report.valid).toBe(false);
  });
});

describe("buildProjectContext", () => {
  it("aggregates knowledge into a ProjectContext", () => {
    const knowledge = { brandVoice: "bold", competitors: ["a"], targetAudience: "devs" } as unknown as KnowledgeGraph;
    const memory = { project: "p", total: 0, byType: {} } as unknown as MemorySummaryLike;
    const profile = { project: "p", knowledge, memorySummary: memory } as unknown as ProjectProfile;
    const ctx = buildProjectContext({ project: "p", profile, knowledge, memory });
    expect(ctx.brandVoice).toBe("bold");
    expect(ctx.competitors).toEqual(["a"]);
    expect(ctx.targetAudience).toBe("devs");
  });
});

describe("PromptBuilder", () => {
  it("builds variables from a PromptContext", () => {
    const builder = new PromptBuilder();
    const ctx = {
      pageDNA: {} as PageDNA,
      section: { kind: "hero" } as SectionInfo,
      knowledge: {} as KnowledgeGraph,
      memory: {} as MemorySummaryLike,
      audience: { level: "general" } as AudienceProfile,
      intent: { primary: "informational" } as SearchIntent,
      tone: "bold",
      brand: { brand: "Acme" } as BrandProfile,
      existingSection: "old",
      targetKeywords: ["shoes"],
      missingTopics: [],
    };
    const vars = builder.buildVariables(ctx);
    expect(vars.sectionKind).toBe("hero");
    expect(vars.targetKeywords).toBe("shoes");
    expect(vars.brand).toBe("Acme");
  });
});

describe("generateContent (mock engine)", () => {
  it("produces patches for each section", async () => {
    const engine = {
      constructor: { name: "MockEngine" },
      generate: async () => ({ output: "Generated hero text that is long enough to pass validation checks.", provider: "mock", model: "m1" }),
    } as unknown as AIEngine;
    const registry = { resolve: () => ({ id: "p", name: "n", template: "t", variables: [], versions: [{ version: "1.0.0", createdAt: "" }] }) } as unknown as PromptRegistry;
    const knowledge = { brandVoice: "bold" } as unknown as KnowledgeGraph;
    const memory = { project: "p", total: 0, byType: {} } as unknown as MemorySummaryLike;
    const profile = { project: "p", knowledge, memorySummary: memory } as unknown as ProjectProfile;
    const brand = { brand: "Acme" } as BrandProfile;

    const result = await generateContent(
      {
        project: "p",
        pageDNA: {} as PageDNA,
        sections: [{ kind: "hero", present: true, confidence: 0.8, evidence: ["x"], id: "s1", selector: "sel" } as SectionInfo],
        projectContext: buildProjectContext({ project: "p", profile, knowledge, memory }),
        brand,
        targetKeyword: "shoes",
        intent: { primary: "informational" } as SearchIntent,
        audience: { level: "general" } as AudienceProfile,
      },
      { engine, registry, knowledge, memory, profile, brand },
    );

    expect(result.patches.length).toBe(1);
    expect(result.generated.length).toBe(1);
    expect(result.patches[0].proposedContent).toBe("Generated hero text that is long enough to pass validation checks.");
    expect(result.validation.valid).toBe(true);
  });
});
