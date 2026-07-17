import type { Action, ExecutionPlan } from "@forge/action-engine";
import type { FindingId } from "@forge/core";
import { validateExecutionPlan } from "@forge/preflight-validator";
import type { HomepageAnalysis, HomepageOptimizationAction, HomepageOptimizationPlan, HomepagePreviewItem, HomepageContext } from "./types.js";

function priorityFromSeverity(severity: string): HomepageOptimizationAction["priority"] {
  if (severity === "critical") return "critical";
  if (severity === "high") return "high";
  if (severity === "medium") return "medium";
  return "low";
}

function riskFromSeverity(severity: string): HomepageOptimizationAction["risk"] {
  if (severity === "critical") return "critical";
  if (severity === "high") return "high";
  if (severity === "medium") return "moderate";
  return "safe";
}

export class HomepagePlanner {
  plan(context: HomepageContext, analysis: HomepageAnalysis): HomepageOptimizationPlan {
    const actions = analysis.findings.map((finding, index) => this.createAction(context, finding, index));
    return {
      homepage: context,
      analysis,
      generatedAt: new Date().toISOString(),
      actions,
      summary: {
        totalActions: actions.length,
        approvalRequired: actions.filter((action) => action.approvalRequired).length,
        byPriority: actions.reduce<Record<"low" | "medium" | "high" | "critical", number>>(
          (acc, action) => {
            acc[action.priority] += 1;
            return acc;
          },
          { low: 0, medium: 0, high: 0, critical: 0 },
        ),
      },
    };
  }

  preview(plan: HomepageOptimizationPlan): HomepagePreviewItem[] {
    return plan.actions.map((action) => ({
      actionId: action.id,
      currentValue: action.currentValue,
      proposedValue: action.proposedValue,
      reason: action.reason,
      risk: action.risk,
      affectedComponent: action.affectedComponent,
      executionStatus: "preview",
    }));
  }

  toExecutionPlan(plan: HomepageOptimizationPlan): ExecutionPlan {
    const actions: Action[] = plan.actions.map((action) => ({
      id: action.id,
      recommendationId: action.id,
      findingId: action.id as FindingId,
      type: "content.update-content",
      title: action.title,
      description: action.description,
      priority: action.priority === "critical" ? "critical" : action.priority === "high" ? "high" : action.priority === "medium" ? "medium" : "low",
      risk: action.risk,
      automatable: !action.approvalRequired,
      requiresApproval: action.approvalRequired,
      rollbackSupported: true,
      estimatedDuration: "5m",
      requiredProvider: "wordpress",
      payload: action.proposedValue as Record<string, unknown>,
      status: action.approvalRequired ? "pending" : "approved",
    }));
    return {
      url: plan.homepage.siteUrl,
      generatedAt: plan.generatedAt,
      actions,
      approvalQueue: actions.filter((action) => action.requiresApproval).map((action) => action.id),
      summary: {
        total: actions.length,
        automatable: actions.filter((action) => action.automatable).length,
        requiresApproval: actions.filter((action) => action.requiresApproval).length,
        byRisk: {
          safe: actions.filter((action) => action.risk === "safe").length,
          moderate: actions.filter((action) => action.risk === "moderate").length,
          high: actions.filter((action) => action.risk === "high").length,
          critical: actions.filter((action) => action.risk === "critical").length,
        },
      },
      estimatedDuration: `${actions.length * 5} minutes`,
      riskSummary: {
        safe: actions.filter((action) => action.risk === "safe").length,
        moderate: actions.filter((action) => action.risk === "moderate").length,
        high: actions.filter((action) => action.risk === "high").length,
        critical: actions.filter((action) => action.risk === "critical").length,
      },
    };
  }

  validate(plan: HomepageOptimizationPlan): { valid: boolean; issues: string[] } {
    const executionPlan = this.toExecutionPlan(plan);
    const validation = validateExecutionPlan(executionPlan, {});
    return {
      valid: validation.blockedActions.length === 0,
      issues: [...validation.errors, ...validation.warnings],
    };
  }

  private createAction(context: HomepageContext, finding: { id: string; title: string; description: string; severity: string }, index: number): HomepageOptimizationAction {
    const title = finding.title;
    const proposedValue = this.proposeValue(context, finding.id);
    return {
      id: `homepage-action-${index + 1}-${finding.id}`,
      title,
      description: finding.description,
      priority: priorityFromSeverity(finding.severity),
      risk: riskFromSeverity(finding.severity),
      estimatedImpact: finding.severity === "critical" ? "high" : finding.severity === "high" ? "medium" : "low",
      approvalRequired: finding.severity !== "low",
      currentValue: this.currentValue(context, finding.id),
      proposedValue,
      reason: `Rule-based fix for ${finding.id}.`,
      affectedComponent: this.affectedComponent(finding.id),
      executionStatus: "pending",
      writeOperation: undefined,
    };
  }

  private currentValue(context: HomepageContext, findingId: string): unknown {
    switch (findingId) {
      case "homepage.missing_title":
        return context.snapshot.pageTitle;
      case "homepage.missing_meta_description":
        return context.snapshot.metaDescription;
      case "homepage.missing_canonical":
        return context.snapshot.canonicalUrl;
      default:
        return "";
    }
  }

  private proposeValue(context: HomepageContext, findingId: string): unknown {
    const brand = context.knowledge.brand ?? context.project;
    switch (findingId) {
      case "homepage.missing_title":
        return `${brand} | ${context.knowledge.primaryKeywords[0] ?? "Homepage"}`;
      case "homepage.missing_meta_description":
        return `Discover ${brand} and explore what makes it different.`;
      case "homepage.missing_hero":
        return { section: "hero", headline: `${brand} made better`, cta: "Get Started" };
      case "homepage.missing_cta":
        return { cta: "Get Started" };
      case "homepage.missing_faq":
        return { section: "faq", items: [] };
      default:
        return { suggestion: findingId };
    }
  }

  private affectedComponent(findingId: string): string {
    if (findingId.includes("title") || findingId.includes("meta_description")) return "metadata";
    if (findingId.includes("hero") || findingId.includes("cta")) return "content";
    if (findingId.includes("faq")) return "schema";
    if (findingId.includes("footer")) return "navigation";
    return "homepage";
  }
}
