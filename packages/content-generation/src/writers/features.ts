// @forge/content-generation
// Features section writer.

import type { AIEngine } from "@forge/ai-engine";
import type { PromptRegistry } from "@forge/prompt-registry";
import type { BrandProfile } from "@forge/core";
import type { ContentBrief } from "../brief/builder.js";
import { BaseSectionWriter } from "./base.js";

export interface FeaturesWriterInput {
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

export async function writeFeatures(input: FeaturesWriterInput) {
  const writer = new FeaturesWriter();
  return writer.write(input);
}

class FeaturesWriter extends BaseSectionWriter {
  async write(input: FeaturesWriterInput) {
    return super.write({
      ...input,
      sectionType: "features",
      promptId: "content-generation.features",
    });
  }
}



