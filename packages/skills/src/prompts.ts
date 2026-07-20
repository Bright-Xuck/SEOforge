import { PromptRegistry } from "@forge/prompt-registry";

export const skillPromptRegistry = new PromptRegistry();

function registerPrompt(id: string, name: string, template: string, category = "content"): void {
  skillPromptRegistry.register({
    id,
    name,
    template,
    variables: ["input", "knowledge", "profile", "memorySummary"],
    versions: [{ version: "1.0.0-beta.1", createdAt: new Date().toISOString() }],
    metadata: {
      category,
      tags: ["seo", "content"],
      defaultProvider: "openai",
      providerOverrides: [],
    },
  });
}

registerPrompt("skill.generate-title", "Generate SEO Title", "Generate an SEO title using the structured context: {{input}}");
registerPrompt("skill.generate-meta-description", "Generate Meta Description", "Generate a meta description using the structured context: {{input}}");
registerPrompt("skill.generate-alt", "Generate Alt Text", "Generate alt text using the structured context: {{input}}");
registerPrompt("skill.generate-open-graph", "Generate Open Graph", "Generate Open Graph metadata using the structured context: {{input}}");
registerPrompt("skill.generate-twitter-card", "Generate Twitter Card", "Generate Twitter Card metadata using the structured context: {{input}}");
registerPrompt("skill.generate-faq-schema", "Generate FAQ Schema", "Generate FAQ schema using the structured context: {{input}}");
registerPrompt("skill.generate-product-description", "Generate Product Description", "Generate a product description using the structured context: {{input}}");
registerPrompt("skill.generate-internal-links", "Generate Internal Links", "Generate internal links using the structured context: {{input}}");
registerPrompt("skill.expand-thin-content", "Expand Thin Content", "Expand thin content using the structured context: {{input}}");
registerPrompt("skill.rewrite-heading", "Rewrite Heading", "Rewrite a heading using the structured context: {{input}}");
registerPrompt("skill.generate-section", "Generate Section", "Generate an improved {{sectionKind}} section. Existing: {{existingSection}}. Keywords: {{targetKeywords}}. Intent: {{intent}}. Audience: {{audience}}. Tone: {{tone}}. Brand: {{brand}}.");
