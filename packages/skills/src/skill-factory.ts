import type { AIEngine } from "@forge/ai-engine";
import type { PromptDefinition } from "@forge/prompt-registry";
import { ContextBuilder } from "@forge/context-builder";
import type { PipelineDefinition, PipelineStepDefinition } from "@forge/pipeline-engine";
import { skillPromptRegistry } from "./prompts.js";
import {
  validateHeadingLength,
  validateJsonLike,
  validateMetaDescriptionLength,
  validateTitleLength,
} from "./validators.js";
import type { SkillContext, SkillDefinition, SkillExecutionResult, SkillValidationResult, SkillMetadata } from "./types.js";

const contextBuilder = new ContextBuilder();

function createMetadata(
  id: string,
  name: string,
  description: string,
  outputs: string[],
  validator: string,
  category = "content",
): SkillMetadata {
  return {
    id,
    name,
    version: "1.0.0-beta.1",
    description,
    category,
    tags: ["seo", "content"],
    difficulty: "intermediate",
    costEstimate: "low",
    estimatedTokens: 800,
    supportedProviders: ["openai", "anthropic", "gemini", "openrouter", "ollama"],
    requiredKnowledge: ["knowledge", "profile"],
    requiredMemory: ["memorySummary"],
    requiredInputs: ["input"],
    outputs,
    validator,
  };
}

function createSimpleSkill(
  id: string,
  name: string,
  description: string,
  outputKey: string,
  validateOutput: (output: string) => boolean,
): SkillDefinition<Record<string, unknown>, { value: string }> {
  const prompt = skillPromptRegistry.resolve(id);
  return {
    ...createMetadata(id, name, description, [outputKey], validateOutput.name || "output"),
    promptId: id,
    requiredContext: ["knowledge", "memory", "profile"],
    inputs: ["knowledge", "memory", "profile"],
    prompt,
    validatePrompt: (item) => skillPromptRegistry.validate(item),
    validate(input: Record<string, unknown>, _context: SkillContext): SkillValidationResult {
      return { valid: Object.keys(input).length >= 0, errors: [] };
    },
    async execute(input: Record<string, unknown>, context: SkillContext, engine: AIEngine): Promise<SkillExecutionResult<{ value: string }>> {
      const aiContext = context.aiContext ?? contextBuilder.build({
        project: context.project,
        knowledge: context.knowledge,
        memory: context.memorySummary,
        projectProfile: context.profile,
        findings: context.findings,
        recommendations: context.recommendations,
        metadata: { provider: context.provider, model: context.model },
      });
      const response = await engine.generate({
        prompt,
        variables: {
          input: JSON.stringify(input),
          context: JSON.stringify(aiContext),
        },
        model: context.model,
      });
      const valid = validateOutput(response.output);
      return {
        skillId: id,
        status: valid ? "success" : "failed",
        output: { value: response.output },
        validation: valid ? { valid: true, errors: [] } : { valid: false, errors: ["Output validation failed"] },
        provider: context.provider,
      };
    },
  };
}

export const GenerateSeoTitleSkill = createSimpleSkill("skill.generate-title", "Generate SEO Title", "Generate an SEO title.", "title", validateTitleLength);
export const GenerateMetaDescriptionSkill = createSimpleSkill("skill.generate-meta-description", "Generate Meta Description", "Generate a meta description.", "metaDescription", validateMetaDescriptionLength);
export const GenerateAltTextSkill = createSimpleSkill("skill.generate-alt", "Generate Alt Text", "Generate alt text.", "altText", (output) => output.length > 0);
export const GenerateOpenGraphSkill = createSimpleSkill("skill.generate-open-graph", "Generate Open Graph", "Generate Open Graph metadata.", "openGraph", validateJsonLike);
export const GenerateTwitterCardSkill = createSimpleSkill("skill.generate-twitter-card", "Generate Twitter Card", "Generate Twitter Card metadata.", "twitterCard", validateJsonLike);
export const GenerateFaqSchemaSkill = createSimpleSkill("skill.generate-faq-schema", "Generate FAQ Schema", "Generate FAQ schema.", "faqSchema", validateJsonLike);
export const GenerateProductDescriptionSkill = createSimpleSkill("skill.generate-product-description", "Generate Product Description", "Generate product description.", "productDescription", (output) => output.length > 20);
export const GenerateInternalLinksSkill = createSimpleSkill("skill.generate-internal-links", "Generate Internal Links", "Generate internal links.", "internalLinks", validateJsonLike);
export const ExpandThinContentSkill = createSimpleSkill("skill.expand-thin-content", "Expand Thin Content", "Expand thin content.", "expandedContent", (output) => output.length > 50);
export const RewriteHeadingSkill = createSimpleSkill("skill.rewrite-heading", "Rewrite Heading", "Rewrite heading text.", "heading", validateHeadingLength);

// Sprint 17: section-scoped generation skill backed by @forge/content-generation.
import { generateContent, buildBrandProfile, writeHero, writeFaq, writeBlog } from "@forge/content-generation";
import type { ContentGenerationResult } from "@forge/content-generation";
import type { BrandProfile } from "@forge/core";
import type { ContentBrief } from "@forge/content-generation";
import type { PromptRegistry } from "@forge/prompt-registry";

export const GenerateSectionSkill = (() => {
  const id = "skill.generate-section";
  const prompt = skillPromptRegistry.resolve(id);
  return {
    ...createMetadata(id, "Generate Section", "Generate an improved section via the content-generation engine.", ["section"], "output", "content"),
    promptId: id,
    requiredContext: ["knowledge", "memory", "profile"],
    inputs: ["knowledge", "memory", "profile", "pageDNA", "sections"],
    prompt,
    validatePrompt: (item: typeof prompt) => skillPromptRegistry.validate(item),
    validate(input: Record<string, unknown>, _context: SkillContext): SkillValidationResult {
      return { valid: Array.isArray(input.sections) && input.sections.length > 0, errors: [] };
    },
    async execute(input: Record<string, unknown>, context: SkillContext, engine: AIEngine): Promise<SkillExecutionResult<{ result: ContentGenerationResult }>> {
      const result = await generateContent(
        {
          project: context.project,
          pageDNA: input.pageDNA as never,
          sections: input.sections as never,
          projectContext: context.profile as never,
          brand: (context.knowledge as { brand?: never }).brand as never,
          targetKeyword: (input.targetKeyword as string) ?? "",
          intent: input.intent as never,
          audience: input.audience as never,
        },
        {
          engine,
          registry: skillPromptRegistry,
          knowledge: context.knowledge as never,
          memory: context.memorySummary as never,
          profile: context.profile as never,
          brand: (context.knowledge as { brand?: never }).brand as never,
        },
      );
      return {
        skillId: id,
        status: result.validation.valid ? "success" : "failed",
        output: { result },
        validation: result.validation.valid ? { valid: true, errors: [] } : { valid: false, errors: result.validation.errors },
        provider: context.provider,
      };
    },
  };
})();

// Sprint 20: AI Writing Engine-backed skills.
async function runWriterSkill(
  sectionType: string,
  input: Record<string, unknown>,
  context: SkillContext,
  engine: AIEngine,
  writer: (args: { brief: ContentBrief; brand: BrandProfile; engine: AIEngine; registry: PromptRegistry }) => Promise<{ content: { markdown: string; validation: { valid: boolean; errors: string[] } } }>,
): Promise<SkillExecutionResult<{ content: string }>> {
  const brand = buildBrandProfile({ knowledge: context.knowledge, memory: context.memorySummary, projectId: context.project });
  const brief: ContentBrief = {
    primaryKeyword: (input.primaryKeyword as string) ?? context.knowledge.primaryKeywords[0] ?? "",
    secondaryKeywords: context.knowledge.secondaryKeywords,
    searchIntent: "informational",
    audience: context.knowledge.targetAudience ?? "general",
    tone: brand.tone,
    readingLevel: brand.readingLevel,
    wordCountTarget: 1200,
    competitors: context.knowledge.competitors,
    pageGoal: `Generate ${sectionType} content`,
    userQuestions: [],
    requiredEntities: [],
    internalLinks: [],
    ctaGoal: brand.ctaStyle,
    brand,
  };
  const result = await writer({ brief, brand, engine, registry: skillPromptRegistry });
  return {
    skillId: `skill.write-${sectionType}`,
    status: result.content.validation.valid ? "success" : "failed",
    output: { content: result.content.markdown },
    validation: result.content.validation,
    provider: context.provider,
  };
}

export const GenerateHeroSkill = {
  ...createMetadata("skill.write-hero", "Write Hero", "Generate a hero section via the AI Writing Engine.", ["content"], "output", "content"),
  promptId: "content-generation.hero",
  requiredContext: ["knowledge", "memory", "profile"],
  inputs: ["knowledge", "memory", "profile", "primaryKeyword"],
  prompt: skillPromptRegistry.resolve("content-generation.hero"),
  validatePrompt: (item: PromptDefinition) => skillPromptRegistry.validate(item),
  validate(_input: Record<string, unknown>, _context: SkillContext): SkillValidationResult {
    return { valid: true, errors: [] };
  },
  async execute(input: Record<string, unknown>, context: SkillContext, engine: AIEngine): Promise<SkillExecutionResult<{ content: string }>> {
    return runWriterSkill("hero", input, context, engine, writeHero);
  },
} as never;

export const GenerateFaqSkill = {
  ...createMetadata("skill.write-faq", "Write FAQ", "Generate a FAQ section via the AI Writing Engine.", ["content"], "output", "content"),
  promptId: "content-generation.faq",
  requiredContext: ["knowledge", "memory", "profile"],
  inputs: ["knowledge", "memory", "profile", "primaryKeyword"],
  prompt: skillPromptRegistry.resolve("content-generation.faq"),
  validatePrompt: (item: PromptDefinition) => skillPromptRegistry.validate(item),
  validate(_input: Record<string, unknown>, _context: SkillContext): SkillValidationResult {
    return { valid: true, errors: [] };
  },
  async execute(input: Record<string, unknown>, context: SkillContext, engine: AIEngine): Promise<SkillExecutionResult<{ content: string }>> {
    return runWriterSkill("faq", input, context, engine, writeFaq);
  },
} as never;

export const GenerateBlogSkill = {
  ...createMetadata("skill.write-blog", "Write Blog", "Generate a blog section via the AI Writing Engine.", ["content"], "output", "content"),
  promptId: "content-generation.blog",
  requiredContext: ["knowledge", "memory", "profile"],
  inputs: ["knowledge", "memory", "profile", "primaryKeyword"],
  prompt: skillPromptRegistry.resolve("content-generation.blog"),
  validatePrompt: (item: PromptDefinition) => skillPromptRegistry.validate(item),
  validate(_input: Record<string, unknown>, _context: SkillContext): SkillValidationResult {
    return { valid: true, errors: [] };
  },
  async execute(input: Record<string, unknown>, context: SkillContext, engine: AIEngine): Promise<SkillExecutionResult<{ content: string }>> {
    return runWriterSkill("blog", input, context, engine, writeBlog);
  },
} as never;

export function createSkillStep<TInput, TOutput>(
  skill: SkillDefinition<TInput, TOutput>,
  input: TInput,
  context: SkillContext,
  engine: AIEngine,
): PipelineStepDefinition {
  return {
    id: skill.id,
    name: skill.name,
    version: skill.version,
    description: skill.description,
    type: "execution-engine",
    inputs: skill.inputs,
    outputs: skill.outputs,
    dependencies: [],
    execute: async () => {
      const validation = skill.validate(input, context);
      if (!validation.valid) {
        throw new Error(validation.errors.join("; "));
      }
      const result = await skill.execute(input, context, engine);
      if (!result.validation.valid || result.status !== "success") {
        throw new Error(result.validation.errors.join("; ") || "Skill output validation failed");
      }
      return result;
    },
  };
}

export function createSkillPipeline<TInput, TOutput>(
  skill: SkillDefinition<TInput, TOutput>,
  input: TInput,
  context: SkillContext,
  engine: AIEngine,
): PipelineDefinition {
  return {
    id: skill.id,
    name: skill.name,
    version: skill.version,
    description: skill.description,
    steps: [createSkillStep(skill, input, context, engine)],
    metadata: { skillId: skill.id },
  };
}
