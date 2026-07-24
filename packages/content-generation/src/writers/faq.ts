// @forge/content-generation
// FAQ section writer.

import type { AIEngine } from "@forge/ai-engine";
import type { PromptRegistry } from "@forge/prompt-registry";
import type { BrandProfile } from "@forge/core";
import type { ContentBrief } from "../brief/builder.js";
import { BaseSectionWriter } from "./base.js";

export interface FaqWriterInput {
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

export async function writeFaq(input: FaqWriterInput) {
  const writer = new FaqWriter();
  return writer.write(input);
}

class FaqWriter extends BaseSectionWriter {
  async write(input: FaqWriterInput) {
    return super.write({
      ...input,
      sectionType: "faq",
      promptId: "content-generation.faq",
    });
  }
}



