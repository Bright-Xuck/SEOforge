// @forge/content-generation
// Conclusion section writer.

import type { AIEngine } from "@forge/ai-engine";
import type { PromptRegistry } from "@forge/prompt-registry";
import type { BrandProfile } from "@forge/core";
import type { ContentBrief } from "../brief/builder.js";
import { BaseSectionWriter } from "./base.js";

export interface ConclusionWriterInput {
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

export async function writeConclusion(input: ConclusionWriterInput) {
  const writer = new ConclusionWriter();
  return writer.write(input);
}

class ConclusionWriter extends BaseSectionWriter {
  async write(input: ConclusionWriterInput) {
    return super.write({
      ...input,
      sectionType: "conclusion",
      promptId: "content-generation.conclusion",
    });
  }
}



