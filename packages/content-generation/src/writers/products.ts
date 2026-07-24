// @forge/content-generation
// Products section writer.

import type { AIEngine } from "@forge/ai-engine";
import type { PromptRegistry } from "@forge/prompt-registry";
import type { BrandProfile } from "@forge/core";
import type { ContentBrief } from "../brief/builder.js";
import { BaseSectionWriter } from "./base.js";

export interface ProductsWriterInput {
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

export async function writeProducts(input: ProductsWriterInput) {
  const writer = new ProductsWriter();
  return writer.write(input);
}

class ProductsWriter extends BaseSectionWriter {
  async write(input: ProductsWriterInput) {
    return super.write({
      ...input,
      sectionType: "products",
      promptId: "content-generation.products",
    });
  }
}



