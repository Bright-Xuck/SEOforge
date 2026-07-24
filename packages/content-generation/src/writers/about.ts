// @forge/content-generation
// About section writer.

import type { AIEngine } from "@forge/ai-engine";
import type { PromptRegistry } from "@forge/prompt-registry";
import type { BrandProfile } from "@forge/core";
import type { ContentBrief } from "../brief/builder.js";
import { BaseSectionWriter } from "./base.js";

export interface AboutWriterInput {
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

export async function writeAbout(input: AboutWriterInput) {
  const writer = new AboutWriter();
  return writer.write(input);
}

class AboutWriter extends BaseSectionWriter {
  async write(input: AboutWriterInput) {
    return super.write({
      ...input,
      sectionType: "about",
      promptId: "content-generation.about",
    });
  }
}



