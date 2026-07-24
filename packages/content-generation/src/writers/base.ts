// @forge/content-generation
// BaseSectionWriter: shared logic for all specialized writers.
// Handles provider selection, prompt composition, response parsing, validation, patch creation.

import type { AIEngine } from "@forge/ai-engine";
import type { PromptRegistry } from "@forge/prompt-registry";
import type { BrandProfile } from "@forge/core";
import type { GeneratedContent, PromptContext } from "../types.js";
import type { ContentBrief } from "../brief/builder.js";
import { PromptComposer } from "../prompts/composer.js";
import { validateSEO } from "../validator/seo.js";
import { scoreContent } from "../scoring/scorer.js";
import { buildPatch } from "../patch/builder.js";
import type { PatchOperation } from "../patch/types.js";

const composer = new PromptComposer();

export interface BaseSectionWriterInput {
  readonly brief: ContentBrief;
  readonly brand: BrandProfile;
  readonly sectionType: string;
  readonly existingContent?: string;
  readonly promptId: string;
  readonly engine: AIEngine;
  readonly registry: PromptRegistry;
  readonly pageDNA?: unknown;
  readonly section?: unknown;
  readonly knowledge?: unknown;
  readonly memory?: unknown;
  readonly audience?: unknown;
  readonly intent?: unknown;
}

export interface BaseSectionWriterResult {
  readonly content: GeneratedContent;
  readonly patch: ReturnType<typeof buildPatch>;
}

export class BaseSectionWriter {
  async write(input: BaseSectionWriterInput): Promise<BaseSectionWriterResult> {
    const context = this.buildPromptContext(input);
    const definition = composer.compose(input.registry, input.promptId, context);
    const variables = composer.variables(context);

    const response = await input.engine.generate({ prompt: definition, variables });
    const generated = this.parseResponse(response.output, input.sectionType);

    const seoValidation = validateSEO(generated.markdown, input.brief.primaryKeyword, input.brief.secondaryKeywords);
    const qualityScores = scoreContent(seoValidation);

    const content: GeneratedContent = {
      sectionType: input.sectionType,
      markdown: generated.markdown,
      html: generated.html,
      plainText: generated.plainText,
      title: generated.title,
      summary: generated.summary,
      confidence: qualityScores.overallScore / 100,
      seoScore: qualityScores.seoScore,
      eeatScore: 0,
      readabilityScore: qualityScores.readabilityScore,
      naturalnessScore: qualityScores.naturalnessScore,
      brandVoiceScore: qualityScores.brandVoiceScore,
      overallScore: qualityScores.overallScore,
      validation: {
        valid: seoValidation.score > 50,
        errors: seoValidation.issues,
        warnings: [],
      },
    };

    const patch = buildPatch(
      {
        sectionId: `${input.sectionType}-${Date.now()}`,
        sectionKind: input.sectionType,
        currentSection: input.existingContent ?? "",
        generatedSection: generated.markdown,
        reason: { code: "ai-generated", description: `AI-generated ${input.sectionType} section`, evidence: [] },
        expectedSeoImpact: "pending-review",
        confidence: { score: content.confidence, basis: "ai-generation" },
        warnings: {
          keywordStuffing: false,
          repeatedPhrases: false,
          unsafePlaceholders: false,
          lengthOutOfBounds: false,
          malformedMarkup: false,
          brokenLinks: false,
          messages: [],
        },
        estimatedTokenCost: Math.ceil(generated.markdown.length / 4),
      },
      "replace" as PatchOperation,
      `[data-section="${input.sectionType}"]`,
      content.validation,
      {
        provider: response.provider,
        model: response.model,
        promptVersion: definition.versions?.[0]?.version ?? "1.0.0",
        generatedBy: "content-generation",
      },
    );

    return { content, patch };
  }

  private buildPromptContext(input: BaseSectionWriterInput): PromptContext {
    return {
      pageDNA: (input.pageDNA as never) ?? {},
      section: (input.section as never) ?? ({ kind: input.sectionType } as never),
      knowledge: (input.knowledge as never) ?? {},
      memory: (input.memory as never) ?? {},
      audience: (input.audience as never) ?? ({ level: "general" } as never),
      intent: (input.intent as never) ?? ({ primary: input.brief.searchIntent } as never),
      tone: input.brief.tone,
      brand: input.brand,
      existingSection: input.existingContent ?? "",
      targetKeywords: [input.brief.primaryKeyword, ...input.brief.secondaryKeywords],
      missingTopics: [],
    };
  }

  private parseResponse(output: string, sectionType: string): GeneratedContent {
    const markdown = output;
    const plainText = output.replace(/[#*_`]/g, "").trim();
    const title = this.extractTitle(markdown, sectionType);
    const summary = plainText.slice(0, 160);

    return {
      sectionType,
      markdown,
      html: markdown,
      plainText,
      title,
      summary,
      confidence: 0.8,
      seoScore: 0,
      eeatScore: 0,
      readabilityScore: 0,
      naturalnessScore: 0,
      brandVoiceScore: 0,
      overallScore: 0,
      validation: { valid: true, errors: [], warnings: [] },
    };
  }

  private extractTitle(markdown: string, fallback: string): string {
    const match = markdown.match(/^#\s+(.+)$/m);
    if (match && match[1]) return match[1].trim();
    return fallback
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}



