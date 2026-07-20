// @forge/content-intelligence
// Deterministic section detection.
// NO AI. Heuristic only.

import type { CheerioAPI } from "cheerio";
import type { SectionInfo, SectionInventory, SectionKind, WebsiteSnapshot } from "../types.js";
import { generateSectionId } from "../page-dna/id-generator.js";
import { enumerateSectionNodeIds } from "../content-graph/traversal.js";

interface SectionRule {
  readonly kind: SectionKind;
  readonly detect: (ctx: DetectionContext) => { present: boolean; confidence: number; evidence: string[] };
}

interface DetectionContext {
  readonly $: CheerioAPI;
  readonly snapshot: WebsiteSnapshot;
  readonly html: string;
  readonly text: string;
  readonly headingText: string;
}

function hasWord(text: string, word: string): boolean {
  return text.includes(word);
}

function hasAny(text: string, words: string[]): boolean {
  return words.some((word) => hasWord(text, word));
}

function sectionSelector($: CheerioAPI, kind: SectionKind): string | undefined {
  const candidates = [
    `[data-section="${kind}"]`,
    `[class*="${kind}"]`,
    `[id*="${kind}"]`,
    `section.${kind}`,
  ];
  for (const selector of candidates) {
    if ($(selector).length > 0) {
      return selector;
    }
  }
  return undefined;
}

const RULES: SectionRule[] = [
  {
    kind: "hero",
    detect: ({ html, text, $ }) => {
      const present = /class="[^"]*hero/i.test(html) || hasWord(text, "hero") || $('section.hero, [class*="hero"]').length > 0;
      return { present, confidence: present ? 0.8 : 0, evidence: present ? ["hero marker detected"] : [] };
    },
  },
  {
    kind: "benefits",
    detect: ({ text }) => {
      const present = hasAny(text, ["benefit", "why choose", "why us", "advantages"]);
      return { present, confidence: present ? 0.7 : 0, evidence: present ? ["benefits keywords"] : [] };
    },
  },
  {
    kind: "features",
    detect: ({ text }) => {
      const present = hasAny(text, ["feature", "capabilities", "what you get"]);
      return { present, confidence: present ? 0.7 : 0, evidence: present ? ["features keywords"] : [] };
    },
  },
  {
    kind: "services",
    detect: ({ text }) => {
      const present = hasAny(text, ["our services", "services", "what we do"]);
      return { present, confidence: present ? 0.7 : 0, evidence: present ? ["services keywords"] : [] };
    },
  },
  {
    kind: "products",
    detect: ({ text, $ }) => {
      const present = hasAny(text, ["products", "shop", "buy", "add to cart"]) || $('[class*="product"]').length > 0;
      return { present, confidence: present ? 0.7 : 0, evidence: present ? ["products keywords"] : [] };
    },
  },
  {
    kind: "testimonials",
    detect: ({ text, $ }) => {
      const present = hasAny(text, ["testimonial", "reviews", "what our customers"]) || $('[class*="testimonial"]').length > 0;
      return { present, confidence: present ? 0.8 : 0, evidence: present ? ["testimonials detected"] : [] };
    },
  },
  {
    kind: "faq",
    detect: ({ text, $, snapshot }) => {
      const present =
        hasAny(text, ["faq", "frequently asked"]) ||
        $('[class*="faq"]').length > 0 ||
        snapshot.jsonLd.some((item) => JSON.stringify(item).toLowerCase().includes("question"));
      return { present, confidence: present ? 0.8 : 0, evidence: present ? ["faq detected"] : [] };
    },
  },
  {
    kind: "comparison",
    detect: ({ text }) => {
      const present = hasAny(text, ["compare", "comparison", "vs", "versus", "difference between"]);
      return { present, confidence: present ? 0.7 : 0, evidence: present ? ["comparison keywords"] : [] };
    },
  },
  {
    kind: "buying-guide",
    detect: ({ text }) => {
      const present = hasAny(text, ["buying guide", "buyers guide", "how to choose", "which to buy"]);
      return { present, confidence: present ? 0.7 : 0, evidence: present ? ["buying guide keywords"] : [] };
    },
  },
  {
    kind: "pricing",
    detect: ({ text, $ }) => {
      const present = hasAny(text, ["pricing", "plans", "subscribe", "per month", "$"]) || $('[class*="pricing"]').length > 0;
      return { present, confidence: present ? 0.8 : 0, evidence: present ? ["pricing detected"] : [] };
    },
  },
  {
    kind: "cta",
    detect: ({ text }) => {
      const present = hasAny(text, ["sign up", "get started", "contact us", "request demo", "try free", "buy now"]);
      return { present, confidence: present ? 0.7 : 0, evidence: present ? ["cta keywords"] : [] };
    },
  },
  {
    kind: "contact",
    detect: ({ text, $ }) => {
      const present = hasAny(text, ["contact us", "get in touch", "email us"]) || $('[class*="contact"]').length > 0 || $("form").length > 0;
      return { present, confidence: present ? 0.8 : 0, evidence: present ? ["contact detected"] : [] };
    },
  },
  {
    kind: "footer",
    detect: ({ html, $ }) => {
      const present = html.includes("<footer") || $("footer").length > 0;
      return { present, confidence: present ? 0.95 : 0, evidence: present ? ["footer element"] : [] };
    },
  },
  {
    kind: "navigation",
    detect: ({ html, $ }) => {
      const present = html.includes("<nav") || $("nav").length > 0 || $('[class*="menu"]').length > 0;
      return { present, confidence: present ? 0.95 : 0, evidence: present ? ["navigation detected"] : [] };
    },
  },
  {
    kind: "related-content",
    detect: ({ text, $ }) => {
      const present = hasAny(text, ["related posts", "related articles", "you may also like"]) || $('[class*="related"]').length > 0;
      return { present, confidence: present ? 0.7 : 0, evidence: present ? ["related content detected"] : [] };
    },
  },
];

export function detectSections(snapshot: WebsiteSnapshot, $: CheerioAPI): SectionInventory {
  const html = snapshot.rawHtml.toLowerCase();
  const headingText = snapshot.headings.map((heading) => heading.text).join(" ").toLowerCase();
  const text = `${snapshot.pageTitle} ${snapshot.metaDescription} ${headingText}`.toLowerCase();
  const ctx: DetectionContext = { $, snapshot, html, text, headingText };

  const sections: SectionInfo[] = RULES.map((rule) => {
    const result = rule.detect(ctx);
    const id = generateSectionId(rule.kind, 0);
    const selector = result.present ? sectionSelector($, rule.kind) : undefined;
    const containedNodes = result.present && selector
      ? enumerateSectionNodeIds($(selector).first().html() ?? "", id)
      : [];
    return {
      kind: rule.kind,
      present: result.present,
      confidence: result.confidence,
      evidence: result.evidence,
      id,
      selector,
      startNode: containedNodes[0],
      endNode: containedNodes.length > 0 ? containedNodes[containedNodes.length - 1] : undefined,
      containedNodes,
      parentSection: undefined,
      childSections: [],
    };
  });

  const present = sections.filter((section) => section.present).map((section) => section.kind);
  const missing = sections.filter((section) => !section.present).map((section) => section.kind);
  const byId: Record<string, SectionInfo> = {};
  for (const section of sections) {
    byId[section.id] = section;
  }

  return { sections, present, missing, byId };
}
