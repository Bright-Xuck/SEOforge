// @forge/dom-engine
// Universal Page Builder (Sprint 23)
// Transforms raw HTML into a UniversalPage (Page → Regions → Sections → Blocks → Elements → Text Nodes).

import { load } from "cheerio";
import type { CheerioAPI, Cheerio } from "cheerio";
import type {
  UniversalPage,
  DomRegion,
  DomSection,
  DomBlock,
  DomElement,
  TextNode,
  DomAttribute,
  SelectorSet,
  RegionKind,
  SectionKind,
  BlockKind,
  ElementKind,
} from "../universal/types.js";
import { detectBuilder } from "../builder/detector.js";

// ─── Stable ID Generation ──────────────────────────────────

function hashString(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function generateStableId(prefix: string, content: string): string {
  return `${prefix}-${hashString(content)}`;
}

// ─── Selector Building ─────────────────────────────────────

function buildSelectors(tagName: string, attrs: DomAttribute[], path: string[], index: number): SelectorSet {
  const idAttr = attrs.find((a) => a.name === "id");
  const classAttr = attrs.find((a) => a.name === "class");

  const css = idAttr
    ? `#${idAttr.value}`
    : classAttr
      ? `.${classAttr.value.split(/\s+/).join(".")}`
      : `${tagName}:nth-of-type(${index + 1})`;

  const xpath = `//${tagName}${idAttr ? `[@id='${idAttr.value}']` : `[${index + 1}]`}`;
  const domPath = path.join(" > ");
  const forgeSelector = `forge:${tagName}:${index}:${hashString(domPath)}`;

  return {
    css,
    xpath,
    domPath,
    forgeSelector,
    attributeSelector: idAttr ? `[@id='${idAttr.value}']` : undefined,
  };
}

// ─── Element Kind Detection ────────────────────────────────

function detectElementKind(tagName: string): ElementKind {
  switch (tagName) {
    case "h1": case "h2": case "h3": case "h4": case "h5": case "h6":
      return "heading";
    case "p": return "paragraph";
    case "ul": case "ol": case "li": return "list";
    case "table": case "thead": case "tbody": case "tr": case "td": case "th":
      return "table";
    case "a": return "link";
    case "button": return "button";
    case "img": return "image";
    case "video": return "video";
    case "audio": return "audio";
    case "iframe": case "embed": return "embed";
    case "form": case "input": case "textarea": case "select": case "label":
      return "form";
    case "i": case "svg": return "icon";
    case "hr": return "divider";
    case "nav": return "nav";
    case "footer": return "footer";
    case "header": return "header";
    case "section": return "section";
    case "aside": return "aside";
    case "main": return "main";
    case "article": return "article";
    case "figure": return "figure";
    case "figcaption": return "figcaption";
    case "blockquote": return "blockquote";
    case "code": return "code";
    case "pre": return "pre";
    case "span": return "span";
    case "div": return "div";
    default:
      return "unknown";
  }
}

// ─── Block Kind Detection ──────────────────────────────────

function detectBlockKind(attrs: DomAttribute[], builderType: string): BlockKind {
  const classNames = attrs.find((a) => a.name === "class")?.value ?? "";

  if (builderType === "elementor") {
    if (classNames.includes("elementor-widget-heading")) return "heading-widget";
    if (classNames.includes("elementor-widget-image")) return "image-widget";
    if (classNames.includes("elementor-widget-button")) return "button-widget";
    if (classNames.includes("elementor-widget-text-editor")) return "text-editor-widget";
    if (classNames.includes("elementor-widget-icon-list")) return "icon-list-widget";
    if (classNames.includes("elementor-widget-accordion")) return "accordion-widget";
    if (classNames.includes("elementor-widget-tabs")) return "tabs-widget";
    if (classNames.includes("elementor-widget-testimonial")) return "testimonials-widget";
    if (classNames.includes("elementor-widget-pricing")) return "pricing-widget";
    if (classNames.includes("elementor-widget-call-to-action")) return "cta-widget";
    if (classNames.includes("elementor-widget-html")) return "html-widget";
    if (classNames.includes("elementor-widget-shortcode")) return "shortcode-widget";
    if (classNames.includes("elementor-widget-template")) return "template-widget";
    if (classNames.includes("elementor-widget-loop")) return "loop-widget";
    if (classNames.includes("elementor-widget-form")) return "form-widget";
    if (classNames.includes("elementor-widget-google_maps")) return "map-widget";
    if (classNames.includes("elementor-widget-video")) return "video-widget";
    if (classNames.includes("elementor-widget-spacer")) return "spacer-widget";
    if (classNames.includes("elementor-widget-divider")) return "divider-widget";
    if (classNames.includes("elementor-widget-nav-menu")) return "nav-menu-widget";
    if (classNames.includes("elementor-widget-popup")) return "popup-widget";
    return "generic-block";
  }

  if (builderType === "gutenberg") {
    if (classNames.includes("wp-block-paragraph")) return "paragraph-block";
    if (classNames.includes("wp-block-heading")) return "heading-block";
    if (classNames.includes("wp-block-image")) return "image-block";
    if (classNames.includes("wp-block-gallery")) return "gallery-block";
    if (classNames.includes("wp-block-list")) return "list-block";
    if (classNames.includes("wp-block-columns")) return "columns-block";
    if (classNames.includes("wp-block-buttons")) return "buttons-block";
    if (classNames.includes("wp-block-quote")) return "quote-block";
    if (classNames.includes("wp-block-cover")) return "cover-block";
    if (classNames.includes("wp-block-group")) return "group-block";
    if (classNames.includes("wp-block-table")) return "table-block";
    if (classNames.includes("wp-block-separator")) return "separator-block";
    if (classNames.includes("wp-block-video")) return "video-block";
    if (classNames.includes("wp-block-audio")) return "audio-block";
    if (classNames.includes("wp-block-embed")) return "embed-block";
    if (classNames.includes("wp-block-code")) return "code-block";
    if (classNames.includes("wp-block-preformatted")) return "preformatted-block";
    if (classNames.includes("wp-block-pullquote")) return "pullquote-block";
    if (classNames.includes("wp-block-html")) return "custom-html-block";
    if (classNames.includes("wp-block-shortcode")) return "shortcode-block";
    if (classNames.includes("wp-block-navigation")) return "navigation-block";
    if (classNames.includes("wp-block-template-part")) return "template-part-block";
    if (classNames.includes("wp-block-pattern")) return "pattern-block";
    return "generic-block";
  }

  return "generic-block";
}

// ─── Region Detection ──────────────────────────────────────

function detectRegionKind(tagName: string, attrs: DomAttribute[]): RegionKind {
  const classNames = attrs.find((a) => a.name === "class")?.value ?? "";
  const id = attrs.find((a) => a.name === "id")?.value ?? "";

  if (tagName === "header" || classNames.includes("site-header") || id.includes("header")) return "header";
  if (classNames.includes("hero") || id.includes("hero")) return "hero";
  if (tagName === "nav" || classNames.includes("nav") || classNames.includes("menu")) return "navigation";
  if (classNames.includes("breadcrumb")) return "breadcrumb";
  if (tagName === "main" || classNames.includes("main")) return "main";
  if (tagName === "aside" || classNames.includes("sidebar")) return "sidebar";
  if (tagName === "footer" || classNames.includes("site-footer") || id.includes("footer")) return "footer";
  if (classNames.includes("popup")) return "popup";
  if (classNames.includes("modal")) return "modal";
  if (classNames.includes("sticky")) return "sticky";
  if (classNames.includes("hidden") || classNames.includes("visually-hidden")) return "hidden";
  if (classNames.includes("template-part")) return "template-part";
  return "unknown";
}

// ─── Section Kind Detection ────────────────────────────────

function detectSectionKind(attrs: DomAttribute[], text: string): SectionKind {
  const classNames = attrs.find((a) => a.name === "class")?.value ?? "";
  const id = attrs.find((a) => a.name === "id")?.value ?? "";
  const lowerText = text.toLowerCase();

  if (classNames.includes("hero") || id.includes("hero")) return "hero";
  if (classNames.includes("benefits") || lowerText.includes("benefits")) return "benefits";
  if (classNames.includes("services") || lowerText.includes("our services")) return "services";
  if (classNames.includes("products") || lowerText.includes("our products")) return "products";
  if (classNames.includes("features") || lowerText.includes("features")) return "features";
  if (classNames.includes("testimonial") || lowerText.includes("testimonials")) return "testimonials";
  if (classNames.includes("faq") || lowerText.includes("frequently asked")) return "faq";
  if (classNames.includes("comparison") || lowerText.includes("compare")) return "comparison";
  if (classNames.includes("cta") || classNames.includes("call-to-action")) return "cta";
  if (classNames.includes("pricing") || lowerText.includes("pricing")) return "pricing";
  if (classNames.includes("contact") || lowerText.includes("contact us")) return "contact";
  if (classNames.includes("about") || lowerText.includes("about us")) return "about";
  if (classNames.includes("blog") || classNames.includes("posts")) return "blog";
  if (classNames.includes("resources")) return "resources";
  if (classNames.includes("related")) return "related-content";
  if (classNames.includes("team")) return "team";
  if (classNames.includes("mission")) return "mission";
  if (classNames.includes("vision")) return "vision";
  if (classNames.includes("timeline")) return "timeline";
  if (classNames.includes("statistics") || classNames.includes("stats")) return "statistics";
  if (classNames.includes("partners")) return "partners";
  if (classNames.includes("clients")) return "clients";
  if (classNames.includes("awards")) return "awards";
  if (classNames.includes("trust")) return "trust";
  if (classNames.includes("newsletter")) return "newsletter";
  if (classNames.includes("footer")) return "footer";
  return "unknown";
}

// ─── Element Parsing ───────────────────────────────────────

function parseElement(
  $: CheerioAPI,
  el: Cheerio<any>,
  path: string[],
  index: number,
  builderType: string,
): DomElement {
  const tagName = el.prop("tagName")?.toLowerCase() ?? "div";
  const attrs: DomAttribute[] = [];
  const rawAttrs = el.attr() ?? {};
  for (const [name, value] of Object.entries(rawAttrs)) {
    attrs.push({ name, value: String(value) });
  }

  const selectors = buildSelectors(tagName, attrs, path, index);
  const kind = detectElementKind(tagName);
  const id = generateStableId("el", `${tagName}:${path.join(":")}:${attrs.map((a) => `${a.name}=${a.value}`).join(":")}`);

  // Parse text nodes
  const textNodes: TextNode[] = [];
  el.contents().each((i, node) => {
    if (node.type === "text") {
      const text = (node.data ?? "").trim();
      if (text.length > 0) {
        textNodes.push({
          id: generateStableId("txt", `${id}:${i}:${text}`),
          text,
          parentId: id,
          selectors: buildSelectors("text", [], [...path, `text:${i}`], i),
        });
      }
    }
  });

  // Parse child elements
  const children: DomElement[] = [];
  el.children().each((i, child) => {
    const childEl = $(child);
    children.push(parseElement($, childEl, [...path, tagName], i, builderType));
  });

  return {
    id,
    tagName,
    kind,
    attributes: attrs,
    textNodes,
    children,
    selectors,
    metadata: { builderType },
  };
}

// ─── Block Parsing ─────────────────────────────────────────

function parseBlock(
  $: CheerioAPI,
  el: Cheerio<any>,
  path: string[],
  index: number,
  builderType: string,
): DomBlock {
  const tagName = el.prop("tagName")?.toLowerCase() ?? "div";
  const attrs: DomAttribute[] = [];
  const rawAttrs = el.attr() ?? {};
  for (const [name, value] of Object.entries(rawAttrs)) {
    attrs.push({ name, value: String(value) });
  }

  const selectors = buildSelectors(tagName, attrs, path, index);
  const kind = detectBlockKind(attrs, builderType);
  const id = generateStableId("blk", `${tagName}:${path.join(":")}:${attrs.map((a) => `${a.name}=${a.value}`).join(":")}`);

  // Parse elements within this block
  const elements: DomElement[] = [];
  el.children().each((i, child) => {
    const childEl = $(child);
    elements.push(parseElement($, childEl, [...path, tagName], i, builderType));
  });

  // Parse nested blocks
  const children: DomBlock[] = [];
  el.children().each((i, child) => {
    const childEl = $(child);
    const childClass = childEl.attr("class") ?? "";
    if (childClass.includes("elementor-widget") || childClass.includes("wp-block")) {
      children.push(parseBlock($, childEl, [...path, tagName], i, builderType));
    }
  });

  return {
    id,
    kind,
    builderType: builderType as DomBlock["builderType"],
    widgetType: attrs.find((a) => a.name === "data-widget_type")?.value,
    blockName: attrs.find((a) => a.name === "data-block-name")?.value,
    elements,
    children,
    selectors,
    metadata: { tagName },
  };
}

// ─── Section Parsing ───────────────────────────────────────

function parseSection(
  $: CheerioAPI,
  el: Cheerio<any>,
  path: string[],
  index: number,
  builderType: string,
): DomSection {
  const tagName = el.prop("tagName")?.toLowerCase() ?? "div";
  const attrs: DomAttribute[] = [];
  const rawAttrs = el.attr() ?? {};
  for (const [name, value] of Object.entries(rawAttrs)) {
    attrs.push({ name, value: String(value) });
  }

  const text = el.text().trim();
  const selectors = buildSelectors(tagName, attrs, path, index);
  const kind = detectSectionKind(attrs, text);
  const id = generateStableId("sec", `${tagName}:${path.join(":")}:${attrs.map((a) => `${a.name}=${a.value}`).join(":")}`);

  // Parse blocks within this section
  const blocks: DomBlock[] = [];
  el.children().each((i, child) => {
    const childEl = $(child);
    const childClass = childEl.attr("class") ?? "";
    if (childClass.includes("elementor-widget") || childClass.includes("wp-block")) {
      blocks.push(parseBlock($, childEl, [...path, tagName], i, builderType));
    }
  });

  return {
    id,
    kind,
    blocks,
    selectors,
    metadata: { tagName, textLength: text.length },
  };
}

// ─── Region Parsing ────────────────────────────────────────

function parseRegion(
  $: CheerioAPI,
  el: Cheerio<any>,
  path: string[],
  index: number,
  builderType: string,
): DomRegion {
  const tagName = el.prop("tagName")?.toLowerCase() ?? "div";
  const attrs: DomAttribute[] = [];
  const rawAttrs = el.attr() ?? {};
  for (const [name, value] of Object.entries(rawAttrs)) {
    attrs.push({ name, value: String(value) });
  }

  const selectors = buildSelectors(tagName, attrs, path, index);
  const kind = detectRegionKind(tagName, attrs);
  const id = generateStableId("reg", `${tagName}:${path.join(":")}:${attrs.map((a) => `${a.name}=${a.value}`).join(":")}`);

  // Parse sections within this region
  const sections: DomSection[] = [];
  el.children().each((i, child) => {
    const childEl = $(child);
    const childTag = childEl.prop("tagName")?.toLowerCase() ?? "";
    const childClass = childEl.attr("class") ?? "";
    if (childTag === "section" || childClass.includes("elementor-section") || childClass.includes("elementor-container")) {
      sections.push(parseSection($, childEl, [...path, tagName], i, builderType));
    }
  });

  return {
    id,
    kind,
    sections,
    selectors,
    metadata: { tagName },
  };
}

// ─── Main Builder ──────────────────────────────────────────

/**
 * Build a UniversalPage from raw HTML.
 * Transforms HTML into Page → Regions → Sections → Blocks → Elements → Text Nodes.
 */
export function buildUniversalPage(html: string, url?: string, title?: string): UniversalPage {
  const $ = load(html);
  const builder = detectBuilder(html);
  const builderType = builder.builderType;

  const regions: DomRegion[] = [];
  const body = $("body");

  // Parse top-level regions
  body.children().each((i, child) => {
    const childEl = $(child);
    const childTag = childEl.prop("tagName")?.toLowerCase() ?? "";
    const childClass = childEl.attr("class") ?? "";

    // Top-level structural elements become regions
    if (
      childTag === "header" ||
      childTag === "nav" ||
      childTag === "main" ||
      childTag === "aside" ||
      childTag === "footer" ||
      childClass.includes("elementor") ||
      childClass.includes("site-header") ||
      childClass.includes("site-footer")
    ) {
      regions.push(parseRegion($, childEl, ["body"], i, builderType));
    }
  });

  // If no regions detected, treat body as a single main region
  if (regions.length === 0) {
    const bodyAttrs: DomAttribute[] = [];
    const rawAttrs = body.attr() ?? {};
    for (const [name, value] of Object.entries(rawAttrs)) {
      bodyAttrs.push({ name, value: String(value) });
    }
    const sections: DomSection[] = [];
    body.children().each((i, child) => {
      const childEl = $(child);
      const childTag = childEl.prop("tagName")?.toLowerCase() ?? "";
      if (childTag === "section" || childTag === "div") {
        sections.push(parseSection($, childEl, ["body"], i, builderType));
      }
    });
    regions.push({
      id: generateStableId("reg", "body:main"),
      kind: "main",
      sections,
      selectors: buildSelectors("body", bodyAttrs, ["body"], 0),
      metadata: { tagName: "body" },
    });
  }

  return {
    id: generateStableId("page", url ?? html.slice(0, 200)),
    url,
    title,
    builder,
    regions,
    rawHtml: html,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Parse HTML into a UniversalPage (shorthand for buildUniversalPage).
 */
export function parse(html: string, url?: string, title?: string): UniversalPage {
  return buildUniversalPage(html, url, title);
}