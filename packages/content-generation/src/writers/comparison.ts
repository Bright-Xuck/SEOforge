// @forge/content-generation
// Comparison section writer.

import type { AIEngine } from "@forge/ai-engine";
import type { PromptRegistry } from "@forge/prompt-registry";
import type { BrandProfile } from "@forge/core";
import type { ContentBrief } from "../brief/builder.js";
import { BaseSectionWriter } from "./base.js";

export interface ComparisonWriterInput {
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

export async function writeComparison(input: ComparisonWriterInput) {
  const writer = new ComparisonWriter();
  return writer.write(input);
}

class ComparisonWriter extends BaseSectionWriter {
  async write(input: ComparisonWriterInput) {
    return super.write({
      ...input,
      sectionType: "comparison",
      promptId: "content-generation.comparison",
    });
  }
}



