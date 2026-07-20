// @forge/content-generation
// Registry mapping section kinds to their generators.

import type { SectionKind } from "@forge/content-intelligence";
import type { SectionGeneratorInput } from "./types.js";
import type { GeneratedSection } from "../types.js";
import type { ContentPatch } from "../patch/types.js";
import {
  generateHero,
  generateBenefits,
  generateFeatures,
  generateServices,
  generateProducts,
  generateTestimonials,
  generateFaq,
  generateComparison,
  generateBuyingGuide,
  generatePricing,
  generateCta,
  generateIntroduction,
  generateConclusion,
  generateAbout,
  generateContact,
} from "./sections.js";

export interface SectionGenerator {
  (input: SectionGeneratorInput): Promise<{ section: GeneratedSection; patch: ContentPatch }>;
}

const generators: Record<string, SectionGenerator> = {
  hero: generateHero,
  benefits: generateBenefits,
  features: generateFeatures,
  services: generateServices,
  products: generateProducts,
  testimonials: generateTestimonials,
  faq: generateFaq,
  comparison: generateComparison,
  "buying-guide": generateBuyingGuide,
  pricing: generatePricing,
  cta: generateCta,
  introduction: generateIntroduction,
  conclusion: generateConclusion,
  about: generateAbout,
  contact: generateContact,
};

/**
 * Run the generator for a given section kind.
 */
export async function runGenerator(kind: SectionKind, input: SectionGeneratorInput) {
  const generator = generators[kind];
  if (!generator) {
    throw new Error(`No generator registered for section kind: ${kind}`);
  }
  return generator(input);
}

/**
 * List all registered section kinds.
 */
export function registeredSectionKinds(): string[] {
  return Object.keys(generators);
}
