import { describe, expect, it } from "vitest";
import { createMissionPlan } from "./index.js";

const context = {
  project: "demo",
  projectProfile: {} as never,
  knowledge: {
    primaryKeywords: ["accessibility", "performance"],
  } as never,
  memorySummary: {} as never,
  strategyContext: {
    project: "demo",
    projectProfile: {} as never,
    knowledge: {} as never,
    memorySummary: {} as never,
    latestFindings: [] as unknown[],
    recommendations: [] as unknown[],
    executionPlans: [] as unknown[],
    validationReports: [] as unknown[],
    executionHistory: [] as unknown[],
    pipelineRegistry: {
      listPipelines: () => [{ id: "website-audit" }] as never,
      exists: () => true,
    },
    skillRegistry: {
      list: () => [{ id: "skill.generate-alt" }] as never,
      exists: () => true,
    },
    providerRegistry: {
      list: () => [{ id: "openai", name: "OpenAI" }],
      exists: () => true,
    },
  },
  availableAgents: [
    { id: "accessibility-agent", name: "Accessibility", supportedPipelines: [] as string[], supportedSkills: [] as string[] },
    { id: "content-agent", name: "Content", supportedPipelines: [] as string[], supportedSkills: [] as string[] },
  ],
} as const;

describe("MissionPlanner", () => {
  it("builds a mission plan", () => {
    const plan = createMissionPlan(context);
    expect(plan.mission.steps.length).toBeGreaterThan(0);
    expect(plan.strategies.length).toBe(plan.mission.steps.length);
  });
});
