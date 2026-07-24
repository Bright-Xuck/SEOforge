// @forge/content-generation
// Introduction section writer.

import type { AIEngine } from "@forge/ai-engine";
import type { PromptRegistry } from "@forge/prompt-registry";
import type { BrandProfile } from "@forge/core";
import type { ContentBrief } from "../brief/builder.js";
import { BaseSectionWriter } from "./base.js";

export interface IntroductionWriterInput {
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

export async function writeIntroduction(input: IntroductionWriterInput) {
  const writer = new IntroductionWriter();
  return writer.write(input);
}

class IntroductionWriter extends BaseSectionWriter {
  async write(input: IntroductionWriterInput) {
    return super.write({
      ...input,
      sectionType: "introduction",
      promptId: "content-generation.introduction",
    });
  }
}



