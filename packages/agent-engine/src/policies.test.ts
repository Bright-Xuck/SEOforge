import { describe, expect, it } from "vitest";
import { createKnowledgeGraph, createProjectProfile, type MemorySummaryLike } from "@forge/knowledge-engine";
import { createDeterministicDecision } from "./policies.js";
import type { AgentContext } from "./types.js";

const knowledge = createKnowledgeGraph("demo");
const memorySummary: MemorySummaryLike = { project: "demo", total: 0, byType: {} };

const baseContext = {
  project: "demo",
  projectProfile: createProjectProfile(knowledge, memorySummary),
  knowledge,
  memorySummary,
  pipelineRegistry: { listPipelines: () => [], getPipeline: () => ({} as never), exists: (id: string) => id === "website-audit" },
  skillRegistry: { list: () => [], get: () => ({} as never), exists: (id: string) => id === "skill.generate-title" },
  providerRegistry: { list: () => [], exists: () => true },
  latestFindings: ["seo"],
  recommendations: [],
  executionPlans: [],
  validationReports: [],
  executionHistory: [],
} satisfies AgentContext;

describe("Decision policies", () => {
  it("selects pipelines deterministically", () => {
    const decision = createDeterministicDecision("seo-agent", { ...baseContext, currentTask: "validate seo metadata" });
    expect(decision.pipelineId).toBe("validation-only");
    expect(decision.requiredSkillIds).toContain("skill.generate-title");
  });
});
