// @forge/optimization-orchestrator
// Tests for the content-generation adapter's deterministic metadata-only mode.

import { describe, expect, it } from "vitest";
import type { BrandProfile } from "@forge/core";
import type { KnowledgeGraph, MemorySummaryLike, ProjectProfile } from "@forge/knowledge-engine";
import type { PageDNA } from "@forge/content-intelligence";
import type { OptimizationContext } from "../context.js";
import { createContentGenerationEngine } from "./content-generation-adapter.js";

const brand = {
  companyName: "Acme",
  industry: "accounting software",
  tone: "confident",
  writingStyle: "clear",
  readingLevel: "general",
  products: ["Acme Books"],
  services: ["Bookkeeping"],
  audiences: ["small businesses"],
} as unknown as BrandProfile;

const knowledge = {
  brand: "Acme",
  brandVoice: "confident",
  competitors: [],
  primaryKeywords: ["accounting software"],
  secondaryKeywords: [],
} as unknown as KnowledgeGraph;

const memory = { project: "project-1" } as unknown as MemorySummaryLike;
const profile = { project: "project-1" } as unknown as ProjectProfile;

const pageDNA = {
  url: "https://example.com/accounting",
  intent: { primary: "commercial", scores: {}, evidence: [] },
  audience: { level: "small-business", confidence: 1, signals: [] },
  topics: [{ term: "accounting software" }],
} as unknown as PageDNA;

function makeContext(overrides: Partial<OptimizationContext> = {}): OptimizationContext {
  return {
    id: "run-1",
    project: "project-1",
    workflow: { id: "homepage-optimization", steps: [] } as never,
    pageId: 6,
    pageUrl: "https://example.com/accounting",
    pageDNA,
    seoMeta: { title: "Old title", description: "Old description" },
    target: { pageUrl: "https://example.com/accounting", pageId: 6, title: "Accounting" },
    ...overrides,
  } as OptimizationContext;
}

function createAdapter(skipAi: boolean) {
  return createContentGenerationEngine({
    skipAi,
    knowledge,
    memory,
    profile,
    brand,
  });
}

describe("createContentGenerationEngine metadata-only mode", () => {
  it("emits Rank Math patches without an AI engine", async () => {
    const context = makeContext();
    await createAdapter(true).execute(context);

    const patches = context.generatedPatches as Array<{ target?: { format?: string } }>;
    expect(patches).toHaveLength(2);
    expect(patches.every((patch) => patch.target?.format === "rank-math")).toBe(true);
    expect(context.metadataProposal).toMatchObject({ pageId: 6, source: "deterministic" });
    expect(context.brandProfile).toBeDefined();
  });

  it("does not produce a no-op patch when metadata already matches", async () => {
    const first = makeContext();
    await createAdapter(true).execute(first);
    const proposal = first.metadataProposal as { title: string; description: string };

    const second = makeContext({
      seoMeta: { title: proposal.title, description: proposal.description },
    });
    await createAdapter(true).execute(second);

    expect(second.generatedPatches).toEqual([]);
  });

  it("fails clearly when AI is requested without an engine", async () => {
    const context = makeContext({
      documentSections: [
        {
          id: "elementor-e1-title",
          kind: "hero",
          present: true,
          confidence: 1,
          evidence: [],
          containedNodes: [],
          childSections: [],
        },
      ],
    });

    await expect(createAdapter(false).execute(context)).rejects.toThrow(
      "Content generation requires an AI engine and prompt registry",
    );
  });
});
