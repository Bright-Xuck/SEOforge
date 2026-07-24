// @forge/content-generation
// Benefits section writer.

import type { AIEngine } from "@forge/ai-engine";
import type { PromptRegistry } from "@forge/prompt-registry";
import type { BrandProfile } from "@forge/core";
import type { ContentBrief } from "../brief/builder.js";
import { BaseSectionWriter } from "./base.js";

export interface BenefitsWriterInput {
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

export async function writeBenefits(input: BenefitsWriterInput) {
  const writer = new BenefitsWriter();
  return writer.write(input);
}

class BenefitsWriter extends BaseSectionWriter {
  async write(input: BenefitsWriterInput) {
    return super.write({
      ...input,
      sectionType: "benefits",
      promptId: "content-generation.benefits",
    });
  }
}



