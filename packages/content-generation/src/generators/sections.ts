// @forge/content-generation
// 15 section generators. Each is a thin wrapper over the shared orchestrator.
// AI generates only targeted section improvements (ADR-0031).

import type { PatchOperation } from "../patch/types.js";
import type { SectionGeneratorInput } from "./types.js";
import { generateSection } from "./orchestrator.js";

type GeneratorResult = Awaited<ReturnType<typeof generateSection>>;

const DEFAULT_OPERATION: PatchOperation = "replace";

async function run(input: SectionGeneratorInput, promptId: string): Promise<GeneratorResult> {
  return generateSection(
    input,
    promptId,
    DEFAULT_OPERATION,
    `[data-section="${input.section.kind}"]`,
    input.engine,
    input.registry,
  );
}

export const generateHero = (i: SectionGeneratorInput) => run(i, "section-hero");
export const generateBenefits = (i: SectionGeneratorInput) => run(i, "section-benefits");
export const generateFeatures = (i: SectionGeneratorInput) => run(i, "section-features");
export const generateServices = (i: SectionGeneratorInput) => run(i, "section-services");
export const generateProducts = (i: SectionGeneratorInput) => run(i, "section-products");
export const generateTestimonials = (i: SectionGeneratorInput) => run(i, "section-testimonials");
export const generateFaq = (i: SectionGeneratorInput) => run(i, "section-faq");
export const generateComparison = (i: SectionGeneratorInput) => run(i, "section-comparison");
export const generateBuyingGuide = (i: SectionGeneratorInput) => run(i, "section-buying-guide");
export const generatePricing = (i: SectionGeneratorInput) => run(i, "section-pricing");
export const generateCta = (i: SectionGeneratorInput) => run(i, "section-cta");
export const generateIntroduction = (i: SectionGeneratorInput) => run(i, "section-introduction");
export const generateConclusion = (i: SectionGeneratorInput) => run(i, "section-conclusion");
export const generateAbout = (i: SectionGeneratorInput) => run(i, "section-about");
export const generateContact = (i: SectionGeneratorInput) => run(i, "section-contact");
