// @forge/dom-engine
// Generic HTML DOM mapper using cheerio.
// Detects sections, blocks, and hierarchy from raw HTML.

import * as cheerio from "cheerio";
import type { ContentNode } from "../types.js";
import type { SectionKind } from "@forge/content-intelligence";

export interface DOMSection {
  readonly kind: SectionKind;
  readonly selector: string;
  readonly confidence: number;
  readonly blocks: DOMBlock[];
}

export interface DOMBlock {
  readonly kind: "heading" | "paragraph" | "list" | "button" | "image" | "faq-item" | "card" | "text";
  readonly selector: string;
  readonly text: string;
  readonly confidence: number;
}

const SECTION_SELECTORS: Record<string, string> = {
  hero: 'section.hero, [data-section="hero"], .hero-section',
  cta: 'section.cta, [data-section="cta"], .cta-section',
  faq: 'section.faq, [data-section="faq"], .faq-section',
  features: 'section.features, [data-section="features"], .features-section',
  benefits: 'section.benefits, [data-section="benefits"], .benefits-section',
  testimonials: 'section.testimonials, [data-section="testimonials"], .testimonials-section',
  about: 'section.about, [data-section="about"], .about-section',
  services: 'section.services, [data-section="services"], .services-section',
  products: 'section.products, [data-section="products"], .products-section',
  contact: 'section.contact, [data-section="contact"], .contact-section',
  footer: 'footer, [data-section="footer"], .footer-section',
};

const BLOCK_SELECTORS: Record<string, string> = {
  heading: "h1, h2, h3, h4, h5, h6",
  paragraph: "p",
  list: "ul, ol",
  button: 'a[href], button, [role="button"]',
  image: "img",
  "faq-item": '[data-faq], .faq-item',
  card: '[data-card], .card',
  text: "div, span",
};

/**
 * Map raw HTML into a hierarchy of DOMSection / DOMBlock.
 */
export function mapHtmlToDom(html: string): DOMSection[] {
  const $ = cheerio.load(html);
  const sections: DOMSection[] = [];

  for (const [kind, selector] of Object.entries(SECTION_SELECTORS)) {
    const elements = $(selector);
    if (elements.length === 0) continue;

    const section: DOMSection = {
      kind: kind as SectionKind,
      selector,
      confidence: 0.8,
      blocks: [],
    };

    elements.each((_index: number, el: any) => {
      const $el = $(el);
      for (const [blockKind, blockSelector] of Object.entries(BLOCK_SELECTORS)) {
        $el.find(blockSelector).each((_blockIndex: number, blockEl: any) => {
          const $block = $(blockEl);
          const text = $block.text().trim();
          if (text.length > 0) {
            section.blocks.push({
              kind: blockKind as DOMBlock["kind"],
              selector: blockSelector,
              text,
              confidence: 0.7,
            });
          }
        });
      }
    });

    if (section.blocks.length > 0) {
      sections.push(section);
    }
  }

  return sections;
}

/**
 * Convert a DOMSection into a ContentNode tree.
 */
export function domSectionToContentNode(section: DOMSection, index: number): ContentNode {
  return {
    id: `dom-section-${index}`,
    type: section.kind,
    settings: {
      selector: section.selector,
      confidence: section.confidence,
      blockCount: section.blocks.length,
    },
    children: section.blocks.map((block, blockIndex) => ({
      id: `dom-block-${index}-${blockIndex}`,
      type: block.kind,
      settings: {
        selector: block.selector,
        text: block.text,
        confidence: block.confidence,
      },
      children: [],
      raw: block.text,
    })),
    raw: section,
  };
}
