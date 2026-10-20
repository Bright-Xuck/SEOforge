// @forge/dom-engine
// Elementor rich-text rules (Sprint 25).
// Rich text is a first-class requirement: SEO Forge must replace real website
// copy, not just plain strings. Elementor controls like heading.title and
// text-editor.editor accept rich HTML. We preserve legitimate inline/block
// markup and strip anything unsafe — we do not blindly strip HTML, and we do
// not blindly inject arbitrary HTML.

import { load } from "cheerio";
import { isElementorRichTextSetting, isElementorPlainTextSetting } from "./widget-schema.js";

/**
 * Block-level tags allowed in Elementor rich-text controls.
 */
const ALLOWED_BLOCK_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6", "p", "ul", "ol", "li", "blockquote", "pre"]);

/**
 * Inline tags allowed in Elementor rich-text controls.
 */
const ALLOWED_INLINE_TAGS = new Set(["br", "strong", "b", "em", "i", "a", "span", "code"]);

/**
 * Attributes allowed per tag. Anything else is stripped.
 */
const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ["href", "title", "target", "rel"],
  span: ["class"],
};

/**
 * URL schemes allowed in `a[href]` (Sprint 26 rich-text safety).
 * Everything else (javascript:, data:, vbscript:, file:, …) is stripped.
 * Scheme-less values (relative paths, fragments, protocol-relative URLs)
 * are allowed.
 */
const ALLOWED_URL_SCHEMES = new Set(["http", "https", "mailto", "tel"]);

/**
 * Validate a URL value for an Elementor rich-text control.
 * Returns true when the URL is safe to keep.
 */
export function isElementorUrlSafe(url: string): boolean {
  const trimmed = url.trim();
  if (trimmed === "") return false;
  // Fragments, relative paths and protocol-relative URLs are safe.
  if (/^#[\w\-./?%&=~]*$/.test(trimmed)) return true;
  if (/^\/(?!\/)/.test(trimmed)) return true;
  if (/^\/\//.test(trimmed)) return true;
  if (/^\.{1,2}\//.test(trimmed)) return true;
  // Absolute URL: validate the scheme (URL parsing rejects malformed input).
  try {
    const parsed = new URL(trimmed);
    return ALLOWED_URL_SCHEMES.has(parsed.protocol.replace(/:$/, ""));
  } catch {
    return false;
  }
}

/**
 * Tags that are removed entirely (content discarded) — scripts, styles, iframes,
 * forms, images and embeds are not part of the safe text-copy surface.
 */
const DISCARD_TAGS = new Set(["script", "style", "iframe", "object", "embed", "form", "input", "textarea", "select", "button", "svg", "img", "video", "audio", "canvas", "noscript", "template"]);

/**
 * Sanitize HTML for an Elementor rich-text control.
 *
 * - Allowed block + inline tags are preserved.
 * - Disallowed tags are unwrapped (their text content is kept) unless in
 *   DISCARD_TAGS, in which case they are removed entirely.
 * - Attributes are filtered to ALLOWED_ATTRIBUTES per tag.
 * - Entities are preserved as-is by cheerio's html() serialization.
 */
export function sanitizeElementorRichText(html: string): string {
  const $ = load(html);

  // Walk bottom-up so removed nodes don't disturb traversal.
  const walk = (): void => {
    const nodes = $("*").toArray();
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      if (!node) continue;
      const el = $(node);
      const tag = el.prop("tagName")?.toLowerCase() ?? "";

      if (DISCARD_TAGS.has(tag)) {
        el.remove();
        continue;
      }

      if (!ALLOWED_BLOCK_TAGS.has(tag) && !ALLOWED_INLINE_TAGS.has(tag)) {
        // Unwrap: keep text content, drop the disallowed element.
        el.replaceWith(el.contents());
        continue;
      }

      // Filter attributes.
      const allowed = ALLOWED_ATTRIBUTES[tag] ?? [];
      const attrs = { ...el.attr() };
      for (const name of Object.keys(attrs)) {
        if (!allowed.includes(name)) {
          el.removeAttr(name);
          continue;
        }
        // URL-valued attributes must pass the scheme allowlist (Sprint 26):
        // javascript:/data:/vbscript: payloads are stripped, the element
        // (and its text content) is preserved.
        if (name === "href") {
          const value = el.attr(name) ?? "";
          if (!isElementorUrlSafe(value)) {
            el.removeAttr(name);
          }
        }
      }
    }
  };

  walk();

  const result = $.html();
  // cheerio wraps bare text in a stray <html><body> only when given a full doc;
  // for fragments it returns the fragment. Trim empty wrappers defensively.
  return result.replace(/^<html><head><\/head><body>/, "").replace(/<\/body><\/html>$/, "");
}

/**
 * Extract the visible text content of rich text (used for stale-patch
 * comparison — the patch's currentContent is compared against live text).
 */
export function textContentOfRichText(html: string): string {
  const $ = load(html);
  return normalizeText($("body").text());
}

/**
 * Normalize text for deterministic comparison: trim and collapse whitespace.
 */
export function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Whether a proposed value is safe for a plain-text Elementor control.
 * Plain-text controls must not receive markup.
 */
export function isPlainTextSafe(value: string): boolean {
  return !/<[a-zA-Z][^>]*>/.test(value);
}

/**
 * Assert a proposed value is compatible with the target control.
 * Returns a list of problems (empty = compatible).
 */
export function assertElementorContentCompatible(
  widgetType: string | undefined,
  settingsKey: string,
  proposed: unknown,
): string[] {
  if (typeof proposed !== "string") {
    return [`Proposed value for ${settingsKey} must be a string (got ${typeof proposed}).`];
  }
  if (isElementorRichTextSetting(widgetType, settingsKey)) {
    // Rich text: sanitize is applied at mutation time; report nothing here.
    return [];
  }
  if (isElementorPlainTextSetting(widgetType, settingsKey)) {
    if (!isPlainTextSafe(proposed)) {
      return [`Plain-text control ${settingsKey} (${widgetType}) must not contain markup.`];
    }
    return [];
  }
  // Unknown control kind — conservative default: plain text only.
  if (!isPlainTextSafe(proposed)) {
    return [`Control ${settingsKey} (${widgetType}) is not declared rich text; markup is not allowed.`];
  }
  return [];
}
