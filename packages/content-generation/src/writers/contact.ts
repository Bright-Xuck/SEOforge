// @forge/content-generation
// Contact section writer.

import type { AIEngine } from "@forge/ai-engine";
import type { PromptRegistry } from "@forge/prompt-registry";
import type { BrandProfile } from "@forge/core";
import type { ContentBrief } from "../brief/builder.js";
import { BaseSectionWriter } from "./base.js";

export interface ContactWriterInput {
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

export async function writeContact(input: ContactWriterInput) {
  const writer = new ContactWriter();
  return writer.write(input);
}

class ContactWriter extends BaseSectionWriter {
  async write(input: ContactWriterInput) {
    return super.write({
      ...input,
      sectionType: "contact",
      promptId: "content-generation.contact",
    });
  }
}



