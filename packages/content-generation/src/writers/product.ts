// @forge/content-generation
// Product section writer.

import type { AIEngine } from "@forge/ai-engine";
import type { PromptRegistry } from "@forge/prompt-registry";
import type { BrandProfile } from "@forge/core";
import type { ContentBrief } from "../brief/builder.js";
import { BaseSectionWriter } from "./base.js";

export interface ProductWriterInput {
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

export async function writeProduct(input: ProductWriterInput) {
  const writer = new ProductWriter();
  return writer.write(input);
}

class ProductWriter extends BaseSectionWriter {
  async write(input: ProductWriterInput) {
    return super.write({
      ...input,
      sectionType: "product",
      promptId: "content-generation.product",
    });
  }
}



