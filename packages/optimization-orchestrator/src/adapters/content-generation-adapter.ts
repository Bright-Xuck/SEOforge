// @forge/optimization-orchestrator
// Adapter: wraps @forge/content-generation into the Engine interface

import type { Engine } from "../types.js";
import type { OptimizationContext } from "../context.js";
import { generateContent } from "@forge/content-generation";
import type {
  ContentGenerationRequest,
  ContentPatch,
  ElementorPatchTarget,
} from "@forge/content-generation";
import { buildMetadataProposal, metadataProposalToPatches } from "@forge/content-generation";
import type { AIEngine } from "@forge/ai-engine";
import type { PromptRegistry } from "@forge/prompt-registry";
import type { KnowledgeGraph, MemorySummaryLike, ProjectProfile } from "@forge/knowledge-engine";
import type { BrandProfile } from "@forge/core";
import type { PageDNA, SectionInfo } from "@forge/content-intelligence";

/**
 * A concrete provider target for one generated section, discovered from the
 * live document inventory before generation. The adapter copies it onto the
 * patch so review and execution never have to re-derive the element id.
 */
export interface SectionTarget {
  readonly sectionId: string;
  readonly elementId: string;
  readonly settingsKey: string;
  readonly widgetType?: string;
  readonly richText?: boolean;
  readonly currentContent?: string;
  readonly fingerprint?: string;
}

/**
 * Options for creating the content-generation engine adapter.
 * The adapter needs AIEngine and PromptRegistry instances since
 * content generation requires AI to produce section patches.
 */
export interface ContentGenerationAdapterOptions {
  /** Required unless `skipAi` is true. */
  engine?: AIEngine;
  /** Required unless `skipAi` is true. */
  registry?: PromptRegistry;
  knowledge: KnowledgeGraph;
  memory: MemorySummaryLike;
  profile: ProjectProfile;
  brand: BrandProfile;
  /**
   * Run deterministic metadata proposals only. Used when no AI provider is
   * configured; never produces fake section content.
   */
  skipAi?: boolean;
}

/**
 * Content Generation Engine adapter.
 *
 * Reads: pageDNA, sections, brandProfile, knowledge, memory from context
 * Writes: generatedPatches to context
 *
 * Only generates section patches — never rewrites whole pages, never publishes,
 * never executes, never knows WordPress, never modifies HTML directly.
 */
export function createContentGenerationEngine(options: ContentGenerationAdapterOptions): Engine {
  return {
    type: "content-generation",
    async execute(ctx: Record<string, unknown>): Promise<Record<string, unknown>> {
      const context = ctx as OptimizationContext;
      const pageDNA = context.pageDNA as PageDNA | undefined;
      const sections = (context.documentSections as SectionInfo[] | undefined) ??
        (context.sections as { sections?: SectionInfo[] } | SectionInfo[] | undefined);

      if (!pageDNA) {
        // No page DNA — nothing to generate from.
        return ctx;
      }

      const knowledge = (context.knowledge as KnowledgeGraph | undefined) ?? options.knowledge;
      const memory = (context.memory as MemorySummaryLike | undefined) ?? options.memory;
      const brand = (context.brandProfile as BrandProfile | undefined) ?? options.brand;
      const sectionList = Array.isArray(sections) ? sections : sections?.sections ?? [];
      const targetKeyword =
        context.target?.keyword ??
        knowledge.primaryKeywords[0] ??
        pageDNA.topics[0]?.term ??
        "";

      const metadataPatches = context.pageId
        ? buildMetadataPatches({
            context,
            pageDNA,
            brand,
            targetKeyword,
          })
        : [];

      if (options.skipAi) {
        context.generatedPatches = metadataPatches as unknown[];
        context.brandProfile = brand;
        return context;
      }

      if (!options.engine || !options.registry) {
        throw new Error(
          "Content generation requires an AI engine and prompt registry. Configure a provider or run with metadata-only mode.",
        );
      }

      if (sectionList.length === 0) {
        context.generatedPatches = metadataPatches as unknown[];
        context.brandProfile = brand;
        return context;
      }

      const request: ContentGenerationRequest = {
        project: context.project,
        pageDNA,
        sections: sectionList,
        projectContext: {
          project: context.project,
          profile: options.profile,
          knowledge,
          memory,
          recentOptimizations: [],
          brandVoice: knowledge.brandVoice ?? brand.tone,
          preferredTone: brand.tone,
          competitors: knowledge.competitors,
          targetAudience: brand.audiences[0] ?? "general",
          missionGoal: context.missionGoal ?? "",
        },
        brand,
        targetKeyword,
        intent: pageDNA.intent,
        audience: pageDNA.audience,
        provider: context.aiProvider as string | undefined,
        model: context.configuration["model"] as string | undefined,
      };

      const result = await generateContent(request, {
        engine: options.engine,
        registry: options.registry,
        knowledge,
        memory,
        profile: options.profile,
        brand,
      });

      const contentPatches = result.patches.map((patch) =>
        enrichPatch(patch, context.sectionTargets as SectionTarget[] | undefined, context.pageId),
      );

      // Metadata proposals are deterministic and target Rank Math. They are
      // appended to the same patch set so review/execution treat them exactly
      // like content changes (no second approval path).
      context.generatedPatches = [...contentPatches, ...metadataPatches] as unknown[];
      context.brandProfile = brand;

      return context;
    },
  };
}

/**
 * Attach the real Elementor target to a generated patch. If no target exists
 * the patch stays as-is and execution will refuse to write it (unknown target),
 * which is the safe outcome — never guess an element id.
 */
function enrichPatch(patch: ContentPatch, targets: SectionTarget[] | undefined, pageId?: number): ContentPatch {
  if (!targets || targets.length === 0) return patch;
  const target =
    targets.find((item) => item.sectionId === patch.sectionId) ??
    targets.find((item) => patch.sectionId.startsWith(item.sectionId));

  if (!target) return patch;

  const elementorTarget: ElementorPatchTarget = {
    format: "elementor",
    elementId: target.elementId,
    settingsKey: target.settingsKey,
    pageId,
    expectedWidgetType: target.widgetType,
    sourceFingerprint: target.fingerprint,
    richText: target.richText,
  };

  return {
    ...patch,
    selector: `[data-id="${target.elementId}"]`,
    currentContent: target.currentContent ?? patch.currentContent,
    target: elementorTarget,
    sourceFingerprint: target.fingerprint,
  };
}

/**
 * Build Rank Math metadata patches for the current page. Uses only data already
 * in context; the caller is responsible for reading current SEO meta so no-op
 * proposals are skipped.
 */
function buildMetadataPatches(input: {
  context: OptimizationContext;
  pageDNA: PageDNA;
  brand: BrandProfile;
  targetKeyword: string;
}): ContentPatch[] {
  const { context, pageDNA, brand, targetKeyword } = input;
  try {
    const proposal = buildMetadataProposal({
      project: context.project,
      pageId: context.pageId as number,
      pageUrl: context.pageUrl ?? pageDNA.url,
      pageTitle: context.target?.title ?? pageDNA.url,
      currentTitle: context.seoMeta?.title,
      currentDescription: context.seoMeta?.description,
      primaryKeyword: targetKeyword,
      brand,
      intent: pageDNA.intent?.primary,
      audience: pageDNA.audience?.level,
    });
    context.metadataProposal = proposal;
    return metadataProposalToPatches(proposal, {
      title: context.seoMeta?.title,
      description: context.seoMeta?.description,
    });
  } catch {
    // Metadata is additive: never block content generation because a proposal
    // could not be built.
    return [];
  }
}
