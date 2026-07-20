// @forge/content-intelligence
// Rule-based search intent classification.
// NO AI. Returns confidence scores per intent.

import type { PageType, SearchIntent, SearchIntentKind, WebsiteSnapshot } from "../types.js";

const SIGNALS: Record<Exclude<SearchIntentKind, "mixed">, string[]> = {
  informational: ["what is", "how to", "guide", "tutorial", "why", "tips", "learn", "definition", "examples"],
  commercial: ["best", "vs", "comparison", "review", "top", "alternative", "cheapest", "worth it"],
  transactional: ["buy", "price", "discount", "coupon", "order", "subscribe", "add to cart", "checkout", "deal"],
  navigational: ["login", "sign in", "dashboard", "account", "official site", "my"],
  local: ["near me", "nearby", "in [city]", "local", "directions", "hours", "location"],
};

export function detectSearchIntent(snapshot: WebsiteSnapshot, pageType: PageType): SearchIntent {
  const text = `${snapshot.pageTitle} ${snapshot.metaDescription} ${snapshot.rawHtml}`.toLowerCase();
  const headingText = snapshot.headings.map((heading) => heading.text).join(" ").toLowerCase();
  const fullText = `${text} ${headingText}`;

  const scores: Record<SearchIntentKind, number> = {
    informational: 0,
    commercial: 0,
    transactional: 0,
    navigational: 0,
    local: 0,
    mixed: 0,
  };

  for (const intent of Object.keys(SIGNALS) as Exclude<SearchIntentKind, "mixed">[]) {
    const matched = SIGNALS[intent].filter((signal) => fullText.includes(signal));
    scores[intent] = matched.length;
  }

  // Page-type priors.
  if (pageType.kind === "product-page") scores.transactional += 1;
  if (pageType.kind === "contact-page" || pageType.kind === "about-page") scores.navigational += 1;
  if (pageType.kind === "blog" || pageType.kind === "documentation") scores.informational += 1;
  if (pageType.kind === "category-page") scores.commercial += 1;

  const evidence: string[] = [];
  let primary: SearchIntentKind = "mixed";
  let top = 0;
  for (const intent of Object.keys(scores) as SearchIntentKind[]) {
    if (intent === "mixed") continue;
    if (scores[intent] > top) {
      top = scores[intent];
      primary = intent;
    }
  }

  if (top === 0) {
    return { primary: "mixed", scores, evidence: ["no intent signals detected"] };
  }

  // Mixed when two intents are close.
  const sorted = (Object.keys(scores) as SearchIntentKind[])
    .filter((intent) => intent !== "mixed")
    .sort((a, b) => scores[b] - scores[a]);
  const first = sorted[0];
  const second = sorted[1];
  if (first !== undefined && second !== undefined && scores[second] >= scores[first] * 0.7) {
    primary = "mixed";
    evidence.push("multiple intents with similar strength");
  } else {
    evidence.push(`strongest signal: ${primary}`);
  }

  return { primary, scores, evidence };
}
