// @forge/content-intelligence
// Deterministic page type detection.
// NO AI.

import type { PageType, PageTypeKind, SectionInventory, WebsiteSnapshot } from "../types.js";

const KEYWORDS: Record<Exclude<PageTypeKind, "generic">, string[]> = {
  "landing-page": ["get started", "sign up", "free trial", "buy now", "request demo"],
  "product-page": ["add to cart", "buy", "price", "in stock", "sku", "product"],
  "category-page": ["shop", "browse", "category", "all products", "filter"],
  blog: ["blog", "posted on", "by author", "read more", "comments"],
  documentation: ["documentation", "api reference", "guide", "tutorial", "docs"],
  "service-page": ["our services", "service", "what we do", "book a call"],
  "about-page": ["about us", "our story", "our team", "who we are", "mission"],
  "contact-page": ["contact us", "get in touch", "email us", "phone", "address"],
  "legal-page": ["privacy policy", "terms of service", "terms and conditions", "cookie policy", "legal"],
  archive: ["archive", "all posts", "monthly archive", "yearly archive"],
  "search-results": ["search results", "no results found", "did you mean", "search for"],
  homepage: ["welcome", "home", "we are", "our company"],
};

export function detectPageType(snapshot: WebsiteSnapshot, sections: SectionInventory): PageType {
  const url = snapshot.finalUrl || snapshot.originalUrl;
  const path = safePathname(url);
  const headingText = snapshot.headings.map((heading) => heading.text).join(" ").toLowerCase();
  const text = `${snapshot.pageTitle} ${snapshot.metaDescription} ${headingText}`.toLowerCase();

  const evidence: string[] = [];
  const scores: Record<PageTypeKind, number> = blankScores();

  // Homepage: root path or explicit home markers.
  if (path === "" || path === "/" || path === "/home" || path === "/homepage" || path === "/index") {
    scores.homepage += 0.6;
    evidence.push(`path "${path}" indicates homepage`);
  }
  if (hasAny(text, KEYWORDS.homepage)) {
    scores.homepage += 0.2;
  }

  // Blog / Documentation / Legal etc. via path + keywords.
  scoreByKeywords(scores, "blog", KEYWORDS.blog, text, path, ["/blog", "/post", "/article"]);
  scoreByKeywords(scores, "documentation", KEYWORDS.documentation, text, path, ["/docs", "/doc", "/guide", "/api"]);
  scoreByKeywords(scores, "legal-page", KEYWORDS["legal-page"], text, path, ["/privacy", "/terms", "/legal", "/cookie"]);
  scoreByKeywords(scores, "contact-page", KEYWORDS["contact-page"], text, path, ["/contact", "/support"]);
  scoreByKeywords(scores, "about-page", KEYWORDS["about-page"], text, path, ["/about"]);
  scoreByKeywords(scores, "archive", KEYWORDS.archive, text, path, ["/archive"]);
  scoreByKeywords(scores, "search-results", KEYWORDS["search-results"], text, path, ["/search", "/s"]);
  scoreByKeywords(scores, "product-page", KEYWORDS["product-page"], text, path, ["/product", "/p/"]);
  scoreByKeywords(scores, "category-page", KEYWORDS["category-page"], text, path, ["/category", "/shop", "/collection"]);
  scoreByKeywords(scores, "service-page", KEYWORDS["service-page"], text, path, ["/service", "/services"]);
  scoreByKeywords(scores, "landing-page", KEYWORDS["landing-page"], text, path, ["/lp", "/landing"]);

  // Section-based boosts.
  if (sections.present.includes("pricing") && sections.present.includes("cta")) {
    scores["landing-page"] += 0.15;
  }
  if (sections.present.includes("products")) {
    scores["product-page"] += 0.15;
  }
  if (sections.present.includes("faq") && sections.present.includes("testimonials")) {
    scores.homepage += 0.1;
  }

  // Schema-based hints.
  for (const item of snapshot.jsonLd) {
    const type = String(item["@type"] ?? "").toLowerCase();
    if (type.includes("product")) scores["product-page"] += 0.2;
    if (type.includes("article") || type.includes("blogposting")) scores.blog += 0.2;
    if (type.includes("organization") && scores.homepage > 0) scores.homepage += 0.05;
  }

  // Pick best.
  let best: PageTypeKind = "generic";
  let bestScore = 0;
  for (const kind of Object.keys(scores) as PageTypeKind[]) {
    if (scores[kind] > bestScore) {
      bestScore = scores[kind];
      best = kind;
    }
  }

  if (best === "generic" || bestScore < 0.3) {
    return { kind: "generic", confidence: 0.5, evidence: ["no strong signals; defaulting to generic"] };
  }

  return { kind: best, confidence: Math.min(1, bestScore), evidence };
}

function blankScores(): Record<PageTypeKind, number> {
  return {
    homepage: 0,
    "landing-page": 0,
    "product-page": 0,
    "category-page": 0,
    blog: 0,
    documentation: 0,
    "service-page": 0,
    "about-page": 0,
    "contact-page": 0,
    "legal-page": 0,
    archive: 0,
    "search-results": 0,
    generic: 0,
  };
}

function hasAny(text: string, words: string[]): boolean {
  return words.some((word) => text.includes(word));
}

function scoreByKeywords(
  scores: Record<PageTypeKind, number>,
  kind: Exclude<PageTypeKind, "generic">,
  keywords: string[],
  text: string,
  path: string,
  pathHints: string[],
): void {
  if (pathHints.some((hint) => path.includes(hint))) {
    scores[kind] += 0.4;
  }
  const matched = keywords.filter((keyword) => text.includes(keyword));
  scores[kind] += matched.length * 0.1;
}

function safePathname(url: string): string {
  try {
    return new URL(url).pathname.replace(/\/+$/, "").toLowerCase();
  } catch {
    return "";
  }
}
