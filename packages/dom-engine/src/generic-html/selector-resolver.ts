// @forge/dom-engine
// Selector resolution for generic HTML.
// Priority: attribute > text-anchor > structural > sibling > CSS/XPath.

import * as cheerio from "cheerio";
import type { ResolvedSelector } from "../types.js";

export interface SelectorResolutionOptions {
  readonly textAnchor?: string;
  readonly headingContext?: string;
  readonly siblingContext?: string;
  readonly structuralPath?: string[];
}

const CSS_ESCAPE_RE = /([^a-zA-Z0-9_-])/g;

/**
 * Resolve a selector for a target element using multi-strategy fallback.
 */
export function resolveSelector(
  $: cheerio.CheerioAPI,
  kind: string,
  options: SelectorResolutionOptions = {},
): ResolvedSelector | null {
  const strategies: Array<{ strategy: ResolvedSelector["strategy"]; selector: string | null }> = [
    resolveAttribute($, kind),
    resolveTextAnchor($, kind, options.textAnchor, options.headingContext),
    resolveStructural($, kind, options.structuralPath),
    resolveSibling($, kind, options.siblingContext),
    resolveCssFallback($, kind),
  ];

  for (const { strategy, selector } of strategies) {
    if (!selector) continue;
    const confidence = strategyConfidence(strategy);
    if ($(selector).length > 0) {
      return { selector, confidence, strategy };
    }
  }

  return null;
}

function strategyConfidence(strategy: ResolvedSelector["strategy"]): number {
  switch (strategy) {
    case "attribute":
      return 0.95;
    case "text-anchor":
      return 0.85;
    case "structural":
      return 0.75;
    case "sibling":
      return 0.65;
    case "css":
      return 0.5;
    default:
      return 0.4;
  }
}

function resolveAttribute($: cheerio.CheerioAPI, kind: string): { strategy: ResolvedSelector["strategy"]; selector: string | null } {
  const stableAttr = `[data-section="${kind}"], [data-block="${kind}"], [id*="${kind}"]`;
  if ($(stableAttr).length > 0) {
    return { strategy: "attribute", selector: stableAttr };
  }
  return { strategy: "attribute", selector: null };
}

function resolveTextAnchor(
  $: cheerio.CheerioAPI,
  _kind: string,
  textAnchor?: string,
  headingContext?: string,
): { strategy: ResolvedSelector["strategy"]; selector: string | null } {
  if (!textAnchor) return { strategy: "text-anchor", selector: null };
  const escaped = textAnchor.replace(CSS_ESCAPE_RE, "\\$1");
  let selector = `:contains("${escaped}")`;
  if (headingContext) {
    const heading = headingContext.replace(CSS_ESCAPE_RE, "\\$1");
    selector = `h1:contains("${heading}"), h2:contains("${heading}"), h3:contains("${heading}") ~ :contains("${escaped}")`;
  }
  if ($(selector).length > 0) {
    return { strategy: "text-anchor", selector };
  }
  return { strategy: "text-anchor", selector: null };
}

function resolveStructural(
  $: cheerio.CheerioAPI,
  _kind: string,
  structuralPath?: string[],
): { strategy: ResolvedSelector["strategy"]; selector: string | null } {
  if (!structuralPath || structuralPath.length === 0) return { strategy: "structural", selector: null };
  const selector = structuralPath.map((s) => escapeCss(s)).join(" > ");
  if ($(selector).length > 0) {
    return { strategy: "structural", selector };
  }
  return { strategy: "structural", selector: null };
}

function resolveSibling(
  $: cheerio.CheerioAPI,
  _kind: string,
  siblingContext?: string,
): { strategy: ResolvedSelector["strategy"]; selector: string | null } {
  if (!siblingContext) return { strategy: "sibling", selector: null };
  const escaped = siblingContext.replace(CSS_ESCAPE_RE, "\\$1");
  const selector = `:contains("${escaped}") + *`;
  if ($(selector).length > 0) {
    return { strategy: "sibling", selector };
  }
  return { strategy: "sibling", selector: null };
}

function resolveCssFallback($: cheerio.CheerioAPI, kind: string): { strategy: ResolvedSelector["strategy"]; selector: string | null } {
  const selectors = [
    `section.${kind}`,
    `.${kind}-section`,
    `[class*="${kind}"]`,
    `[id*="${kind}"]`,
  ];
  for (const sel of selectors) {
    if ($(sel).length > 0) {
      return { strategy: "css", selector: sel };
    }
  }
  return { strategy: "css", selector: null };
}

function escapeCss(value: string): string {
  return value.replace(CSS_ESCAPE_RE, "\\$1");
}
