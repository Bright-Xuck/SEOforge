// @forge/homepage-engine
// Sprint 17: generate a section improvement for a weak homepage section.
// Uses @forge/content-generation (section-scoped AI). Produces a ContentPatch
// for preview; never executes or writes (Sprint 18 scope).

import type { AIEngine } from "@forge/ai-engine";
import type { PromptRegistry } from "@forge/prompt-registry";
import { generateContent } from "@forge/content-generation";
import type { ContentGenerationResult } from "@forge/content-generation";
import type { HomepageContext } from "./types.js";

/**
 * Generate a candidate improvement for a weak homepage section (e.g. hero).
 * Returns a ContentGenerationResult containing the patch for preview/approval.
 */
export async function generateSectionImprovement(
  context: HomepageContext,
  sectionKind: "hero" | "benefits" | "features" | "testimonials" | "faq" | "cta" | "footer",
  engine: AIEngine,
  registry: PromptRegistry,
  targetKeyword = "",
): Promise<ContentGenerationResult> {
  const section = context.contentMap[sectionKind];
  const pageDna = {
    schemaVersion: "1.0.0",
    dnaVersion: "1.0.0",
    generatorVersion: "1.7.0-beta.1",
    url: context.siteUrl,
    analyzedAt: new Date().toISOString(),
    pageType: { kind: context.homepageType, confidence: 1, evidence: [] },
    intent: { primary: "informational", scores: {}, evidence: [] },
    audience: { level: "general", confidence: 0.5, signals: [] },
    contentLength: 0,
    headingDistribution: {},
    readingLevel: "general",
    sectionInventory: { sections: [], present: [], missing: [], byId: {} },
    entities: [],
    topics: [],
    links: { internal: [], external: [] },
    media: { images: [], videos: [] },
    trust: { score: 0, signals: [] },
    schema: { hasJsonLd: false, types: [] },
    metadata: {},
  } as never;
  const result = await generateContent(
    {
      project: context.project,
      pageDNA: pageDna,
      sections: [
        {
          kind: sectionKind,
          present: section.present,
          confidence: section.confidence,
          evidence: section.evidence,
          id: `home-${sectionKind}`,
          selector: `[data-section="${sectionKind}"]`,
        } as never,
      ],
      projectContext: context.projectProfile as never,
      brand: (context.knowledge as { brand?: never }).brand as never,
      targetKeyword,
      intent: { primary: "informational", scores: {}, evidence: [] } as never,
      audience: { level: "general", confidence: 0.5, signals: [] } as never,
    },
    {
      engine,
      registry,
      knowledge: context.knowledge,
      memory: context.memorySummary,
      profile: context.projectProfile,
      brand: (context.knowledge as { brand?: never }).brand as never,
    },
  );
  return result;
}
