import { describe, expect, it } from "vitest";
import { createKnowledgeGraph, createProjectProfile, type MemorySummaryLike } from "@forge/knowledge-engine";
import { SEOAgent } from "./index.js";
import type { AgentContext } from "./types.js";

const knowledge = createKnowledgeGraph("demo");
const memorySummary: MemorySummaryLike = { project: "demo", total: 0, byType: {} };

const context = {
  project: "demo",
  projectProfile: createProjectProfile(knowledge, memorySummary),
  knowledge,
  memorySummary,
  pipelineRegistry: { listPipelines: () => [], getPipeline: () => ({} as never), exists: (id: string) => id === "website-audit" || id === "validation-only" },
  skillRegistry: { list: () => [], get: () => ({} as never), exists: () => true },
  providerRegistry: { list: () => [], exists: () => true },
  latestFindings: ["seo"],
  recommendations: [],
  executionPlans: [],
  validationReports: [],
  executionHistory: [],
} satisfies AgentContext;

describe("Agent execution", () => {
  it("supports dry-run execution", async () => {
    const result = await SEOAgent.execute(context, {
      dryRun: true,
      invokePipeline: async () => ({ status: "success", pipelineId: "website-audit", pipelineName: "Website Audit", stepsExecuted: [], stepsSkipped: [], durationMs: 0, errors: [], outputs: {}, events: [], stepResults: [] }),
    });

    expect(result.status).toBe("success");
    expect(result.messages.join(" ")).toContain("Dry run");
  });
});
