// @forge/content-generation
// Blog section writer.

import type { AIEngine } from "@forge/ai-engine";
import type { PromptRegistry } from "@forge/prompt-registry";
import type { BrandProfile } from "@forge/core";
import type { ContentBrief } from "../brief/builder.js";
import { BaseSectionWriter } from "./base.js";

export interface BlogWriterInput {
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

export async function writeBlog(input: BlogWriterInput) {
  const writer = new BlogWriter();
  return writer.write(input);
}

class BlogWriter extends BaseSectionWriter {
  async write(input: BlogWriterInput) {
    return super.write({
      ...input,
      sectionType: "blog",
      promptId: "content-generation.blog",
    });
  }
}



