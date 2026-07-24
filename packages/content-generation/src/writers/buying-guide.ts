// @forge/content-generation
// Buying Guide section writer.

import type { AIEngine } from "@forge/ai-engine";
import type { PromptRegistry } from "@forge/prompt-registry";
import type { BrandProfile } from "@forge/core";
import type { ContentBrief } from "../brief/builder.js";
import { BaseSectionWriter } from "./base.js";

export interface BuyingGuideWriterInput {
  readonly brief: ContentBrief;
  readonly brand: BrandProfile;
  readonly existingContent?: string;
  readonly engine: AIEngine;
  readonly registry: PromptRegistry;
  readonly pageDNA?: unknown;
  readonly section?: unknown;
  readonly knowledge?: unknown;
  readonly memory?: unknown;
  readonly audience?: unknown;
  readonly intent?: unknown;
}

export async function writeBuyingGuide(input: BuyingGuideWriterInput) {
  const writer = new BuyingGuideWriter();
  return writer.write(input);
}

class BuyingGuideWriter extends BaseSectionWriter {
  async write(input: BuyingGuideWriterInput) {
    return super.write({
      ...input,
      sectionType: "buying-guide",
      promptId: "content-generation.buying-guide",
    });
  }
}



