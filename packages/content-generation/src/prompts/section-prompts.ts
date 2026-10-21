// @forge/content-generation
// Registry-backed prompt catalog for section generation and the Sprint 20 writers.
//
// One catalog owns the prompt IDs used by `generateSection` (`section-*`) and
// `BaseSectionWriter` (`content-generation.*`). Before Sprint 28 these IDs were
// referenced but never registered, so every generation call failed with
// "Prompt not found". Templates are registry data, never hand-built strings.

import { PromptRegistry } from "@forge/prompt-registry";
import type { PromptDefinition } from "@forge/prompt-registry";

/**
 * Variables every content prompt receives from PromptBuilder.buildVariables().
 * A template may use a subset; a template using anything outside this list
 * would fail rendering (by design).
 */
export const CONTENT_PROMPT_VARIABLES = [
  "sectionKind",
  "existingSection",
  "targetKeywords",
  "primaryKeyword",
  "missingTopics",
  "intent",
  "audience",
  "tone",
  "brand",
  "brandVoice",
  "brandStyle",
  "brandAudience",
  "brandProducts",
  "readingLevel",
  "knowledge",
  "memory",
] as const;

const COMMON_RULES = [
  "You are writing for the brand {{brand}} ({{brandProducts}}).",
  "Brand voice: {{brandVoice}}. Writing style: {{brandStyle}}. Tone: {{tone}}. Reading level: {{readingLevel}}.",
  "Audience: {{audience}}. Search intent: {{intent}}. Primary keyword: {{primaryKeyword}}. Supporting keywords: {{targetKeywords}}.",
  "Write for that audience specifically. Do not contradict it (for example, do not target enterprises when the audience is small businesses).",
  "Existing section (improve, do not discard facts):\n{{existingSection}}",
  "Missing topics to cover when relevant: {{missingTopics}}.",
  "Rules: write only the replacement section content. No preamble, no explanations, no code fences.",
  "Never invent statistics, certifications, prices, customer names, or claims. Use only facts present in the existing section or brand context.",
  "Keep the language natural and specific; do not keyword-stuff.",
  "Formatting: plain text for headings and buttons; for body copy use simple HTML (<p>, <ul>, <li>, <strong>, <a>) with no inline styles.",
].join("\n");

const SECTION_GUIDANCE: Record<string, string> = {
  hero: "Write a single compelling page headline (max 12 words). Return plain text only.",
  benefits: "Write a concise benefits section. Lead with outcomes, then 3-5 short supporting points.",
  features: "Write a features section describing concrete capabilities. Prefer specific nouns over adjectives.",
  services: "Write a services section explaining what the business does and who it helps.",
  products: "Write a products section that names the offer and its primary use cases.",
  testimonials: "Write a testimonials section. Only use quotes/names that already exist in the source; never fabricate them. If none exist, write a trust-oriented proof section without fake quotes.",
  faq: "Write 3-5 FAQs with direct answers. Questions must be real questions the audience asks.",
  comparison: "Write a comparison section. Only compare on facts present in the source; state when information is unknown.",
  "buying-guide": "Write a buying guide that helps the reader choose. Include decision criteria and next steps.",
  pricing: "Write a pricing section. Do not invent prices; describe the pricing model and what is included when known.",
  cta: "Write a single call-to-action button label (max 6 words). Return plain text only.",
  introduction: "Write a short introductory paragraph (2-4 sentences) that states what the page offers and why it matters.",
  conclusion: "Write a short concluding paragraph that reinforces the value and points to the next action.",
  about: "Write an about section focused on the business, its expertise, and who it serves.",
  contact: "Write a contact section with a clear next step. Do not invent phone numbers, emails, or addresses.",
};

const WRITER_GUIDANCE: Record<string, string> = {
  ...SECTION_GUIDANCE,
  product: "Write a product description focused on the offer, use cases, and differentiators present in the source.",
  blog: "Write a focused blog section. Use a clear subheading and short paragraphs.",
};

function sectionTemplate(kind: string): string {
  const guidance = SECTION_GUIDANCE[kind] ?? `Write an improved ${kind} section.`;
  return `${guidance}\n${COMMON_RULES}`;
}

function writerTemplate(kind: string): string {
  const guidance = WRITER_GUIDANCE[kind] ?? `Write an improved ${kind} section.`;
  return `${guidance}\n${COMMON_RULES}`;
}

function definition(id: string, name: string, kind: string, template: string): PromptDefinition {
  return {
    id,
    name,
    template,
    variables: [...CONTENT_PROMPT_VARIABLES],
    owner: "content-generation",
    versions: [{ version: "1.1.0", createdAt: new Date(0).toISOString(), notes: "Sprint 28 runtime registration; audience-aware writing rules" }],
    metadata: {
      category: "content",
      tags: ["seo", "content", "section", kind],
      defaultProvider: "openai",
      providerOverrides: [],
    },
  };
}

/**
 * All section-generator prompts (`section-hero`, `section-cta`, ...).
 */
export function sectionPromptDefinitions(): PromptDefinition[] {
  return Object.keys(SECTION_GUIDANCE).map((kind) =>
    definition(`section-${kind}`, `${titleCase(kind)} Section`, kind, sectionTemplate(kind)),
  );
}

/**
 * All Sprint 20 writer prompts (`content-generation.hero`, ...).
 */
export function writerPromptDefinitions(): PromptDefinition[] {
  const kinds = [
    "hero", "benefits", "features", "services", "products", "about", "faq",
    "testimonials", "cta", "buying-guide", "comparison", "product",
    "introduction", "conclusion", "contact", "blog",
  ];
  return kinds.map((kind) =>
    definition(`content-generation.${kind}`, `${titleCase(kind)} Writer`, kind, writerTemplate(kind)),
  );
}

/**
 * Register the full content catalog on a registry. Safe to call repeatedly
 * (registration is idempotent) so CLI commands can each start from a clean
 * registry without duplicating call-site knowledge of prompt IDs.
 */
export function registerContentPrompts(registry: PromptRegistry): PromptRegistry {
  for (const prompt of [...sectionPromptDefinitions(), ...writerPromptDefinitions()]) {
    const existing = registry.list().find((item) => item.id === prompt.id);
    if (!existing) registry.register(prompt);
  }
  return registry;
}

function titleCase(value: string): string {
  return value.replace(/(^|[- ])\w/g, (match) => match.toUpperCase()).replace(/-/g, " ");
}
