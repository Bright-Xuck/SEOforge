import type { AgentContext, AgentDecision } from "./types.js";

function summaryText(context: AgentContext): string {
  return [
    context.currentTask ?? "",
    JSON.stringify(context.latestFindings ?? []),
    JSON.stringify(context.recommendations ?? []),
    JSON.stringify(context.executionPlans ?? []),
    JSON.stringify(context.validationReports ?? []),
    JSON.stringify(context.executionHistory ?? []),
  ]
    .join(" ")
    .toLowerCase();
}

export function createDeterministicDecision(agentId: string, context: AgentContext): AgentDecision {
  const text = summaryText(context);
  const pipelineId =
    text.includes("validate") ? "validation-only" : text.includes("weekly") ? "weekly-optimization" : "website-audit";
  const requiredSkillIds =
    text.includes("schema") || agentId === "schema-agent"
      ? ["skill.generate-faq-schema"]
      : text.includes("link") || agentId === "linking-agent"
        ? ["skill.generate-internal-links"]
        : text.includes("access") || agentId === "accessibility-agent"
          ? ["skill.generate-alt"]
          : text.includes("performance") || agentId === "performance-agent"
            ? ["skill.expand-thin-content"]
            : text.includes("content") || agentId === "content-agent"
              ? ["skill.generate-meta-description"]
              : ["skill.generate-title"];

  const escalateForApproval = text.includes("critical") || text.includes("approve");
  const stopExecution = text.includes("stop") || text.includes("halt");
  const continueExecution = !stopExecution && !escalateForApproval;

  return {
    agentId,
    pipelineId,
    requiredSkillIds,
    continueExecution,
    stopExecution,
    escalateForApproval,
    rationale: `Deterministic policy selected ${pipelineId} from project context.`,
  };
}

export function reviewDecision(context: AgentContext, decision: AgentDecision): string[] {
  const notes: string[] = [];
  if (!context.pipelineRegistry.exists(decision.pipelineId)) {
    notes.push(`Pipeline not registered: ${decision.pipelineId}`);
  }
  for (const skillId of decision.requiredSkillIds) {
    if (!context.skillRegistry.exists(skillId)) {
      notes.push(`Skill not registered: ${skillId}`);
    }
  }
  if (decision.escalateForApproval) {
    notes.push("Decision requires approval.");
  }
  if (decision.stopExecution) {
    notes.push("Decision requests stop.");
  }
  return notes;
}
