import { describe, expect, it } from "vitest";
import { ContextBuilder } from "./index.js";

describe("ContextBuilder", () => {
  it("creates structured AI context", () => {
    const builder = new ContextBuilder();
    const context = builder.build({
      project: "alpha",
      knowledge: { topic: "seo" },
      memory: [{ event: "published" }],
      projectProfile: { summary: "profile" },
      findings: ["issue"],
      recommendations: ["fix"],
      executionPlan: { steps: 1 },
      validationReport: { valid: true },
      currentTask: "write title",
    });

    expect(context.project).toBe("alpha");
    expect(context.knowledgeSummary).toContain("seo");
    expect(context.memorySummary).toContain("published");
    expect(context.currentTask).toBe("write title");
  });
});
