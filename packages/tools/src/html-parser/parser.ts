// @forge/tools/html-parser
// Deterministic HTML parsing using Cheerio.
// No AI. No network calls.

import * as cheerio from "cheerio";
import type {
  Heading,
  Image,
  Link,
  OpenGraph,
  RobotsDirectives,
  ScriptRef,
  StylesheetRef,
  TwitterCard,
} from "@forge/core";

/**
 * Structured result of parsing an HTML document.
 */
export interface ParsedHtml {
  readonly pageTitle: string;
  readonly metaDescription: string;
  readonly canonicalUrl: string;
  readonly language: string;
  readonly charset: string;
  readonly favicon: string;
  readonly robots: RobotsDirectives;
  readonly headings: Heading[];
  readonly images: Image[];
  readonly links: Link[];
  readonly scripts: ScriptRef[];
  readonly stylesheets: StylesheetRef[];
  readonly jsonLd: Record<string, unknown>[];
  readonly openGraph: OpenGraph;
  readonly twitterCard: TwitterCard;
}

/**
 * Parse an HTML string into structured data.
 * Deterministic — same input always produces same output.
 */
export function parseHtml(html: string, baseUrl: string): ParsedHtml {
  const $ = cheerio.load(html);

  return {
    pageTitle: extractTitle($),
    metaDescription: extractMetaDescription($),
    canonicalUrl: extractCanonical($),
    language: extractLanguage($),
    charset: extractCharset($),
    favicon: extractFavicon($, baseUrl),
    robots: extractRobots($),
    headings: extractHeadings($),
    images: extractImages($, baseUrl),
    links: extractLinks($, baseUrl),
    scripts: extractScripts($, baseUrl),
    stylesheets: extractStylesheets($, baseUrl),
    jsonLd: extractJsonLd($),
    openGraph: extractOpenGraph($),
    twitterCard: extractTwitterCard($),
  };
}

function extractTitle($: cheerio.CheerioAPI): string {
  return $("title").first().text().trim();
}

function extractMetaDescription($: cheerio.CheerioAPI): string {
  return $('meta[name="description"]').attr("content")?.trim() ?? "";
}

function extractCanonical($: cheerio.CheerioAPI): string {
  return $('link[rel="canonical"]').attr("href")?.trim() ?? "";
}

function extractLanguage($: cheerio.CheerioAPI): string {
  return $("html").attr("lang")?.trim() ?? "";
}

function extractCharset($: cheerio.CheerioAPI): string {
  const metaCharset = $("meta[charset]").attr("charset");
  if (metaCharset) {
    return metaCharset.trim();
  }

  const contentAttr = $('meta[http-equiv="Content-Type"], meta[http-equiv="content-type"]').attr(
    "content",
  );

  if (contentAttr) {
    const match = /charset=([^;]+)/i.exec(contentAttr);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return "";
}

function extractFavicon($: cheerio.CheerioAPI, baseUrl: string): string {
  const href =
    $('link[rel="icon"]').attr("href") ?? $('link[rel="shortcut icon"]').attr("href") ?? "";

  if (!href) {
    return "";
  }

  return resolveUrl(href, baseUrl);
}

function extractRobots($: cheerio.CheerioAPI): RobotsDirectives {
  const content = $('meta[name="robots"]').attr("content") ?? "";
  const directives = content
    .toLowerCase()
    .split(",")
    .map((d) => d.trim());

  return {
    noindex: directives.includes("noindex"),
    nofollow: directives.includes("nofollow"),
    noarchive: directives.includes("noarchive"),
    nosnippet: directives.includes("nosnippet"),
  };
}

function extractHeadings($: cheerio.CheerioAPI): Heading[] {
  const headings: Heading[] = [];

  for (let level = 1; level <= 6; level++) {
    $(`h${level}`).each((_, el) => {
      const text = $(el).text().trim();
      if (text) {
        headings.push({ level: level as Heading["level"], text });
      }
    });
  }

  return headings;
}

function extractImages($: cheerio.CheerioAPI, baseUrl: string): Image[] {
  const images: Image[] = [];

  $("img").each((_, el) => {
    const src = $(el).attr("src");
    if (src) {
      images.push({
        src: resolveUrl(src.trim(), baseUrl),
        alt: $(el).attr("alt")?.trim() ?? "",
      });
    }
  });

  return images;
}

function extractLinks($: cheerio.CheerioAPI, baseUrl: string): Link[] {
  const links: Link[] = [];
  const baseHostname = extractHostname(baseUrl);

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href")?.trim();
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) {
      return;
    }

    const resolved = resolveUrl(href, baseUrl);
    const linkHostname = extractHostname(resolved);

    links.push({
      href: resolved,
      text: $(el).text().trim(),
      isInternal: linkHostname === baseHostname,
    });
  });

  return links;
}

function extractScripts($: cheerio.CheerioAPI, baseUrl: string): ScriptRef[] {
  const scripts: ScriptRef[] = [];

  $("script").each((_, el) => {
    const src = $(el).attr("src");
    scripts.push({
      src: src ? resolveUrl(src.trim(), baseUrl) : undefined,
      type: $(el).attr("type")?.trim(),
      inline: !src,
    });
  });

  return scripts;
}

function extractStylesheets($: cheerio.CheerioAPI, baseUrl: string): StylesheetRef[] {
  const stylesheets: StylesheetRef[] = [];

  $('link[rel="stylesheet"]').each((_, el) => {
    const href = $(el).attr("href");
    stylesheets.push({
      href: href ? resolveUrl(href.trim(), baseUrl) : undefined,
      inline: false,
    });
  });

  $("style").each((_, _el) => {
    stylesheets.push({ inline: true });
  });

  return stylesheets;
}

function extractJsonLd($: cheerio.CheerioAPI): Record<string, unknown>[] {
  const blocks: Record<string, unknown>[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).html();
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        blocks.push(...parsed);
      } else {
        blocks.push(parsed);
      }
    } catch {
      // Skip invalid JSON-LD
    }
  });

  return blocks;
}

function extractOpenGraph($: cheerio.CheerioAPI): OpenGraph {
  return {
    title: $('meta[property="og:title"]').attr("content")?.trim(),
    description: $('meta[property="og:description"]').attr("content")?.trim(),
    image: $('meta[property="og:image"]').attr("content")?.trim(),
    url: $('meta[property="og:url"]').attr("content")?.trim(),
    type: $('meta[property="og:type"]').attr("content")?.trim(),
    siteName: $('meta[property="og:site_name"]').attr("content")?.trim(),
  };
}

function extractTwitterCard($: cheerio.CheerioAPI): TwitterCard {
  return {
    card: $('meta[name="twitter:card"]').attr("content")?.trim(),
    title: $('meta[name="twitter:title"]').attr("content")?.trim(),
    description: $('meta[name="twitter:description"]').attr("content")?.trim(),
    image: $('meta[name="twitter:image"]').attr("content")?.trim(),
    site: $('meta[name="twitter:site"]').attr("content")?.trim(),
  };
}

/**
 * Resolve a potentially relative URL against a base URL.
 */
function resolveUrl(href: string, base: string): string {
  if (href.startsWith("http://") || href.startsWith("https://")) {
    return href;
  }

  if (href.startsWith("//")) {
    const protocol = base.startsWith("https") ? "https:" : "http:";
    return protocol + href;
  }

  const baseUrl = base.endsWith("/") ? base.slice(0, -1) : base;

  if (href.startsWith("/")) {
    return baseUrl + href;
  }

  const lastSlash = baseUrl.lastIndexOf("/");
  const basePath = lastSlash > 8 ? baseUrl.slice(0, lastSlash + 1) : baseUrl + "/";

  return basePath + href;
}

/**
 * Extract the hostname from a URL string.
 */
function extractHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}
