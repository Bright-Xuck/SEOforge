// @forge/content-generation
// Services section writer.

import type { AIEngine } from "@forge/ai-engine";
import type { PromptRegistry } from "@forge/prompt-registry";
import type { BrandProfile } from "@forge/core";
import type { ContentBrief } from "../brief/builder.js";
import { BaseSectionWriter } from "./base.js";

export interface ServicesWriterInput {
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

export async function writeServices(input: ServicesWriterInput) {
  const writer = new ServicesWriter();
  return writer.write(input);
}

class ServicesWriter extends BaseSectionWriter {
  async write(input: ServicesWriterInput) {
    return super.write({
      ...input,
      sectionType: "services",
      promptId: "content-generation.services",
    });
  }
}



