import type { Agent, AgentContext, AgentResult } from "./types.js";
import { createDeterministicDecision, reviewDecision } from "./policies.js";

function createAgent(
  id: string,
  name: string,
  description: string,
  goal: string,
  supportedPipelines: string[],
  supportedSkills: string[],
  keywords: string[],
): Agent {
  return {
    metadata: {
      id,
      name,
      version: "1.1.0-beta.1",
      description,
      goal,
      supportedProviders: [],
      supportedProjects: ["workspace", "website", "project"],
      supportedPipelines,
      supportedSkills,
      capabilities: ["select-pipeline", "review-findings", "review-recommendations", "review-execution"],
    },
    decide(context: AgentContext) {
      const decision = createDeterministicDecision(id, {
        ...context,
        currentTask: context.currentTask ?? keywords.join(" "),
      });
      return {
        ...decision,
        rationale: `${goal}. ${decision.rationale}`,
      };
    },
    async execute(context: AgentContext, runtime): Promise<AgentResult> {
      const decision = this.decide(context);
      const messages = reviewDecision(context, decision);
      if (decision.stopExecution) {
        return { agentId: id, status: "stopped", decision, messages };
      }
      if (decision.escalateForApproval) {
        return { agentId: id, status: "escalated", decision, messages };
      }
      if (runtime.dryRun) {
        return { agentId: id, status: "success", decision, messages: [...messages, "Dry run; no pipeline executed."] };
      }
      const pipeline = await runtime.invokePipeline(decision.pipelineId, context);
      return {
        agentId: id,
        status: "success",
        decision,
        execution: { decision, pipeline },
        messages,
      };
    },
    review(context: AgentContext, decision) {
      return reviewDecision(context, decision);
    },
  };
}

export const SEOAgent = createAgent(
  "seo-agent",
  "SEO Agent",
  "Selects SEO-oriented pipelines deterministically.",
  "Improve discoverability and metadata quality.",
  ["website-audit", "weekly-optimization", "validation-only"],
  ["skill.generate-title", "skill.generate-meta-description"],
  ["seo", "metadata", "title", "description"],
);

export const ContentAgent = createAgent(
  "content-agent",
  "Content Agent",
  "Selects content optimization pipelines deterministically.",
  "Improve content clarity and usefulness.",
  ["website-audit", "weekly-optimization"],
  ["skill.generate-meta-description", "skill.expand-thin-content"],
  ["content", "copy", "rewrite"],
);

export const LinkingAgent = createAgent(
  "linking-agent",
  "Linking Agent",
  "Selects internal linking workflows deterministically.",
  "Improve internal link structure.",
  ["website-audit", "weekly-optimization"],
  ["skill.generate-internal-links"],
  ["link", "internal link", "navigation"],
);

export const SchemaAgent = createAgent(
  "schema-agent",
  "Schema Agent",
  "Selects structured data workflows deterministically.",
  "Improve structured data coverage.",
  ["website-audit", "validation-only"],
  ["skill.generate-faq-schema", "skill.generate-open-graph"],
  ["schema", "jsonld", "structured data"],
);

export const AccessibilityAgent = createAgent(
  "accessibility-agent",
  "Accessibility Agent",
  "Selects accessibility workflows deterministically.",
  "Improve accessibility outcomes.",
  ["website-audit", "weekly-optimization"],
  ["skill.generate-alt", "skill.rewrite-heading"],
  ["accessibility", "alt", "heading"],
);

export const PerformanceAgent = createAgent(
  "performance-agent",
  "Performance Agent",
  "Selects performance-oriented workflows deterministically.",
  "Improve page performance and content weight.",
  ["weekly-optimization"],
  ["skill.expand-thin-content"],
  ["performance", "speed", "weight"],
);

export const LearningAgent = createAgent(
  "learning-agent",
  "Learning Agent",
  "Selects learning and validation workflows deterministically.",
  "Capture lessons from prior executions.",
  ["validation-only", "weekly-optimization"],
  ["skill.generate-title"],
  ["learn", "history", "memory", "validation"],
);
