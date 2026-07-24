import type { Action, ExecutionPlan } from "@forge/action-engine";
import type { FindingId } from "@forge/core";
import { validateExecutionPlan } from "@forge/preflight-validator";
import type { HomepageAnalysis, HomepageOptimizationAction, HomepageOptimizationPlan, HomepagePreviewItem, HomepageContext } from "./types.js";
import type { AIEngine } from "@forge/ai-engine";
import type { PromptRegistry } from "@forge/prompt-registry";
import type { ContentBrief } from "@forge/content-generation";
import { buildBrandProfile } from "@forge/content-generation";
import { writeHero, writeFaq, writeCta, writeBenefits, writeFeatures } from "@forge/content-generation";

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

  async optimizeWithAI(
    context: HomepageContext,
    engine: AIEngine,
    registry: PromptRegistry,
  ): Promise<{ plan: HomepageOptimizationPlan; preview: HomepagePreviewItem[]; reviewSession: import("@forge/review-engine").ReviewSession }> {
    const brand = buildBrandProfile({ knowledge: context.knowledge, memory: context.memorySummary, projectId: context.project });
    const brief: ContentBrief = {
      primaryKeyword: context.knowledge.primaryKeywords[0] ?? context.project,
      secondaryKeywords: context.knowledge.secondaryKeywords,
      searchIntent: "informational",
      audience: context.knowledge.targetAudience ?? "general",
      tone: brand.tone,
      readingLevel: brand.readingLevel,
      wordCountTarget: 1200,
      competitors: context.knowledge.competitors,
      pageGoal: "Homepage optimization",
      userQuestions: [],
      requiredEntities: [],
      internalLinks: [],
      ctaGoal: brand.ctaStyle,
      brand,
    };

    const missingSections = detectMissingSections(context.contentMap);
    const generated: { sectionType: string; markdown: string; validation: { valid: boolean; errors: string[] } }[] = [];

    for (const section of missingSections) {
      try {
        let result;
        switch (section) {
          case "hero":
            result = await writeHero({ brief, brand, engine, registry });
            break;
          case "faq":
            result = await writeFaq({ brief, brand, engine, registry });
            break;
          case "cta":
            result = await writeCta({ brief, brand, engine, registry });
            break;
          case "benefits":
            result = await writeBenefits({ brief, brand, engine, registry });
            break;
          case "features":
            result = await writeFeatures({ brief, brand, engine, registry });
            break;
          default:
            continue;
        }
        generated.push({ sectionType: section, markdown: result.content.markdown, validation: result.content.validation });
      } catch {
        // skip failed sections
      }
    }

    const actions = generated.map((item, index) => ({
      id: `ai-${item.sectionType}-${index + 1}`,
      title: `AI-generated ${item.sectionType}`,
      description: `AI-generated ${item.sectionType} section for homepage`,
      priority: "medium" as const,
      risk: "moderate" as const,
      estimatedImpact: "medium",
      approvalRequired: true,
      currentValue: "",
      proposedValue: item.markdown,
      reason: `AI-generated content for ${item.sectionType}`,
      affectedComponent: item.sectionType,
      executionStatus: "pending" as const,
    }));

    const plan: HomepageOptimizationPlan = {
      homepage: context,
      analysis: context.projectProfile ? { url: context.siteUrl, analyzedAt: new Date().toISOString(), homepageType: context.homepageType, contentMap: context.contentMap, findings: [], summary: { total: 0, bySeverity: {}, score: 0, readabilityScore: 0 } } : { url: context.siteUrl, analyzedAt: new Date().toISOString(), homepageType: context.homepageType, contentMap: context.contentMap, findings: [], summary: { total: 0, bySeverity: {}, score: 0, readabilityScore: 0 } },
      generatedAt: new Date().toISOString(),
      actions,
      summary: {
        totalActions: actions.length,
        approvalRequired: actions.length,
        byPriority: { low: 0, medium: actions.length, high: 0, critical: 0 },
      },
    };

    const preview = actions.map((action) => ({
      actionId: action.id,
      currentValue: action.currentValue,
      proposedValue: action.proposedValue,
      reason: action.reason,
      risk: action.risk,
      affectedComponent: action.affectedComponent,
      executionStatus: "preview" as const,
    }));

    const { createReviewSessionFromGeneratedContent } = await import("./review-integration.js");
    const reviewSession = createReviewSessionFromGeneratedContent(context.project, generated.map((g) => ({
      sectionType: g.sectionType,
      markdown: g.markdown,
      html: g.markdown,
      plainText: g.markdown,
      title: g.sectionType,
      summary: g.markdown.slice(0, 160),
      confidence: 0.8,
      seoScore: 70,
      eeatScore: 0,
      readabilityScore: 70,
      naturalnessScore: 70,
      brandVoiceScore: 70,
      overallScore: 70,
      validation: { ...g.validation, warnings: [] },
    })));

    return { plan, preview, reviewSession };
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

function detectMissingSections(contentMap: HomepageContext["contentMap"]): string[] {
  const missing: string[] = [];
  for (const [key, section] of Object.entries(contentMap)) {
    if (!section.present && ["hero", "benefits", "features", "faq", "cta"].includes(key)) {
      missing.push(key);
    }
  }
  return missing;
}
