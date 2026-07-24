// @forge/content-generation
// CTA section writer.

import type { AIEngine } from "@forge/ai-engine";
import type { PromptRegistry } from "@forge/prompt-registry";
import type { BrandProfile } from "@forge/core";
import type { ContentBrief } from "../brief/builder.js";
import { BaseSectionWriter } from "./base.js";

export interface CtaWriterInput {
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

export async function writeCta(input: CtaWriterInput) {
  const writer = new CtaWriter();
  return writer.write(input);
}

class CtaWriter extends BaseSectionWriter {
  async write(input: CtaWriterInput) {
    return super.write({
      ...input,
      sectionType: "cta",
      promptId: "content-generation.cta",
    });
  }
}



