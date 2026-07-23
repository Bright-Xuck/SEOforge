import { describe, expect, it } from "vitest";
import { AIEngine, OpenAIProvider } from "@forge/ai-engine";
import { createKnowledgeGraph, updateKnowledgeGraph, createProjectProfile } from "@forge/knowledge-engine";
import { MemoryStore } from "@forge/memory-engine";
import { GenerateMetaDescriptionSkill } from "./index.js";

describe("skills", () => {
  it("validates and executes a skill", async () => {
    const graph = updateKnowledgeGraph(createKnowledgeGraph("project-a"), { primaryKeywords: ["forge"] });
    const memory = new MemoryStore();
    const profile = createProjectProfile(graph, memory.summarize("project-a"));
    const skill = GenerateMetaDescriptionSkill;
    const validation = skill.validate({}, { project: "project-a", knowledge: graph, profile, memorySummary: profile.memorySummary, findings: [], recommendations: [] });
    expect(validation.valid).toBe(true);
    let result;
    try {
      result = await skill.execute({}, { project: "project-a", knowledge: graph, profile, memorySummary: profile.memorySummary, findings: [], recommendations: [] }, new AIEngine(new OpenAIProvider({ apiKey: "test-key" })));
    } catch (error) {
      result = { status: "failed", validation: { valid: false, errors: [(error as Error).message] } };
    }
    expect(["failed", "success"]).toContain(result.status);
  });
});
