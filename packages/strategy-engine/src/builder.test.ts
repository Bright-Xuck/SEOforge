import { describe, expect, it } from "vitest";
import { createKnowledgeGraph, createProjectProfile, type MemorySummaryLike } from "@forge/knowledge-engine";
import { StrategyBuilder } from "./index.js";
import type { StrategyContext } from "./types.js";

const knowledge = createKnowledgeGraph("demo");
const memorySummary: MemorySummaryLike = { project: "demo", total: 0, byType: {} };

const context: StrategyContext = {
  project: "demo",
  projectProfile: createProjectProfile(knowledge, memorySummary),
  knowledge,
  memorySummary,
  latestFindings: ["seo"],
  recommendations: [],
  executionPlans: [],
  validationReports: [],
  executionHistory: [],
  pipelineRegistry: { listPipelines: () => [{ id: "website-audit" } as never], exists: (id: string) => id === "website-audit" },
  skillRegistry: { list: () => [{ id: "skill.generate-title" } as never], exists: (id: string) => id === "skill.generate-title" },
  providerRegistry: { list: () => [{ id: "openai", name: "OpenAI" }], exists: () => true },
};

describe("StrategyBuilder", () => {
  it("creates a deterministic strategy", () => {
    const builder = new StrategyBuilder();
    const strategy = builder.build(context);

    expect(strategy.selectedPipelines).toContain("website-audit");
    expect(strategy.selectedSkills).toContain("skill.generate-title");
    expect(strategy.summary.totalPipelines).toBeGreaterThan(0);
  });
});
