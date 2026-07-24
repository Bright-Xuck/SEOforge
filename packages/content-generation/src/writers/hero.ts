// @forge/content-generation
// Hero section writer.

import type { AIEngine } from "@forge/ai-engine";
import type { PromptRegistry } from "@forge/prompt-registry";
import type { BrandProfile } from "@forge/core";
import type { ContentBrief } from "../brief/builder.js";
import { BaseSectionWriter } from "./base.js";

export interface HeroWriterInput {
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

export async function writeHero(input: HeroWriterInput) {
  const writer = new HeroWriter();
  return writer.write(input);
}

class HeroWriter extends BaseSectionWriter {
  async write(input: HeroWriterInput) {
    return super.write({
      ...input,
      sectionType: "hero",
      promptId: "content-generation.hero",
    });
  }
}



