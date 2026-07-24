// @forge/content-generation
// Testimonials section writer.

import type { AIEngine } from "@forge/ai-engine";
import type { PromptRegistry } from "@forge/prompt-registry";
import type { BrandProfile } from "@forge/core";
import type { ContentBrief } from "../brief/builder.js";
import { BaseSectionWriter } from "./base.js";

export interface TestimonialsWriterInput {
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

export async function writeTestimonials(input: TestimonialsWriterInput) {
  const writer = new TestimonialsWriter();
  return writer.write(input);
}

class TestimonialsWriter extends BaseSectionWriter {
  async write(input: TestimonialsWriterInput) {
    return super.write({
      ...input,
      sectionType: "testimonials",
      promptId: "content-generation.testimonials",
    });
  }
}



