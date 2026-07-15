// @forge/capabilities/rules/index
// Registry of all analysis rules with metadata.

import type { AnalysisRule, Finding, FindingCode, Severity, Category } from "@forge/core";

// Rule metadata interface
export interface RuleMetadata {
  readonly id: FindingCode;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly category: Category;
  readonly defaultSeverity: Severity;
}

// Helper to create a finding with stable ID
function createFinding(
  code: FindingCode,
  title: string,
  description: string,
  severity: Severity,
  category: Category,
  location?: string,
): Finding {
  return {
    id: code,
    code,
    title,
    description,
    severity,
    category,
    evidence: location
      ? [{ source: "analysis", detail: location, value: location }]
      : [{ source: "analysis", detail: title }],
    location,
    confidence: 1.0,
    fixable: true,
  };
}

// Metadata objects for each rule (stable, deterministic)
const META_MISSING_TITLE = {
  id: "seo.missing_title" as FindingCode,
  name: "Missing Title",
  version: "1.0.0",
  description: "Page has no title element.",
  category: "seo" as const,
  defaultSeverity: "critical" as const,
};

const META_TITLE_TOO_SHORT = {
  id: "seo.title_too_short" as FindingCode,
  name: "Title Too Short",
  version: "1.0.0",
  description: "Title is under 30 characters for optimal SEO.",
  category: "seo" as const,
  defaultSeverity: "low" as const,
};

const META_TITLE_TOO_LONG = {
  id: "seo.title_too_long" as FindingCode,
  name: "Title Too Long",
  version: "1.0.0",
  description: "Title exceeds 60 characters; may truncate in search results.",
  category: "seo" as const,
  defaultSeverity: "medium" as const,
};

const META_TITLE_DUPLICATE_WORDS = {
  id: "seo.title_duplicate_words" as FindingCode,
  name: "Duplicate Words in Title",
  version: "1.0.0",
  description: "Title contains consecutive duplicate words.",
  category: "seo" as const,
  defaultSeverity: "low" as const,
};

const META_MISSING_META_DESCRIPTION = {
  id: "seo.missing_meta_description" as FindingCode,
  name: "Missing Meta Description",
  version: "1.0.0",
  description: "Page has no meta description element.",
  category: "seo" as const,
  defaultSeverity: "high" as const,
};

const META_META_DESCRIPTION_TOO_SHORT = {
  id: "seo.meta_description_too_short" as FindingCode,
  name: "Meta Description Too Short",
  version: "1.0.0",
  description: "Meta description is under 120 characters.",
  category: "seo" as const,
  defaultSeverity: "low" as const,
};

const META_META_DESCRIPTION_TOO_LONG = {
  id: "seo.meta_description_too_long" as FindingCode,
  name: "Meta Description Too Long",
  version: "1.0.0",
  description: "Meta description exceeds 160 characters; may truncate in search.",
  category: "seo" as const,
  defaultSeverity: "medium" as const,
};

const META_MISSING_H1 = {
  id: "seo.missing_h1" as FindingCode,
  name: "Missing H1",
  version: "1.0.0",
  description: "Page has no H1 heading element.",
  category: "seo" as const,
  defaultSeverity: "high" as const,
};

const META_MULTIPLE_H1 = {
  id: "seo.multiple_h1" as FindingCode,
  name: "Multiple H1",
  version: "1.0.0",
  description: "Page has multiple H1 headings; should have exactly one.",
  category: "seo" as const,
  defaultSeverity: "medium" as const,
};

const META_HEADING_HIERARCHY = {
  id: "seo.heading_hierarchy" as FindingCode,
  name: "Skipped Heading Level",
  version: "1.0.0",
  description: "Heading levels are not sequential in the document.",
  category: "seo" as const,
  defaultSeverity: "low" as const,
};

const META_MISSING_ALT = {
  id: "accessibility.missing_alt" as FindingCode,
  name: "Missing Alt Text",
  version: "1.0.0",
  description: "Image missing alt attribute.",
  category: "accessibility" as const,
  defaultSeverity: "medium" as const,
};

const META_EMPTY_ALT = {
  id: "accessibility.empty_alt" as FindingCode,
  name: "Empty Alt Text",
  version: "1.0.0",
  description: "Image has empty alt text (purely decorative).",
  category: "accessibility" as const,
  defaultSeverity: "low" as const,
};

const META_EMPTY_ANCHOR_TEXT = {
  id: "seo.empty_anchor_text" as FindingCode,
  name: "Empty Anchor Text",
  version: "1.0.0",
  description: "Link has no visible text content.",
  category: "seo" as const,
  defaultSeverity: "low" as const,
};

const META_SUSPICIOUS_URLS = {
  id: "links.suspicious_urls" as FindingCode,
  name: "Suspicious URLs",
  version: "1.0.0",
  description: "Links use javascript:, mailto:, tel:, or anchor-only URLs.",
  category: "links" as const,
  defaultSeverity: "info" as const,
};

const META_EXTERNAL_LINK_REL = {
  id: "links.external_link_rel" as FindingCode,
  name: "External Link Needs Rel Attribute",
  version: "1.0.0",
  description: "External link should have rel='noopener' or 'nofollow'.",
  category: "links" as const,
  defaultSeverity: "info" as const,
};

const META_MISSING_CANONICAL = {
  id: "seo.missing_canonical" as FindingCode,
  name: "Missing Canonical",
  version: "1.0.0",
  description: "Page has no canonical URL.",
  category: "seo" as const,
  defaultSeverity: "medium" as const,
};

const META_MISSING_OG = {
  id: "metadata.missing_og" as FindingCode,
  name: "Missing Open Graph",
  version: "1.0.0",
  description: "Missing Open Graph metadata tags.",
  category: "metadata" as const,
  defaultSeverity: "high" as const,
};

const META_MISSING_TWITTER = {
  id: "metadata.missing_twitter" as FindingCode,
  name: "Missing Twitter Card",
  version: "1.0.0",
  description: "Missing Twitter Card metadata tags.",
  category: "metadata" as const,
  defaultSeverity: "low" as const,
};

const META_ROBOTS_NOINDEX = {
  id: "seo.robots_noindex" as FindingCode,
  name: "noindex Directive",
  version: "1.0.0",
  description: "Page blocks indexing via robots meta tag.",
  category: "seo" as const,
  defaultSeverity: "critical" as const,
};

const META_ROBOTS_NOFOLLOW = {
  id: "seo.robots_nofollow" as FindingCode,
  name: "nofollow Directive",
  version: "1.0.0",
  description: "Page blocks link following via robots meta tag.",
  category: "seo" as const,
  defaultSeverity: "medium" as const,
};

const META_MISSING_LANG = {
  id: "accessibility.missing_lang" as FindingCode,
  name: "Missing Language",
  version: "1.0.0",
  description: "HTML element missing lang attribute.",
  category: "accessibility" as const,
  defaultSeverity: "low" as const,
};

const META_MISSING_JSONLD = {
  id: "technical.missing_jsonld" as FindingCode,
  name: "Missing JSON-LD",
  version: "1.0.0",
  description: "Page has no structured data (JSON-LD).",
  category: "technical" as const,
  defaultSeverity: "info" as const,
};

// Meta for placeholder rules
const META_BROKEN_IMAGES = {
  id: "links.broken_images" as FindingCode,
  name: "Broken Images",
  version: "1.0.0",
  description: "Image sources return HTTP errors.",
  category: "links" as const,
  defaultSeverity: "medium" as const,
};

const META_BROKEN_INTERNAL_LINKS = {
  id: "links.broken_internal_links" as FindingCode,
  name: "Broken Internal Links",
  version: "1.0.0",
  description: "Internal links return HTTP errors.",
  category: "links" as const,
  defaultSeverity: "medium" as const,
};

const META_INVALID_CANONICAL = {
  id: "seo.invalid_canonical" as FindingCode,
  name: "Invalid Canonical",
  version: "1.0.0",
  description: "Canonical URL is malformed or points to different domain.",
  category: "seo" as const,
  defaultSeverity: "medium" as const,
};

const META_MULTIPLE_CANONICAL = {
  id: "seo.multiple_canonical" as FindingCode,
  name: "Multiple Canonicals",
  version: "1.0.0",
  description: "Multiple canonical link elements found.",
  category: "seo" as const,
  defaultSeverity: "low" as const,
};

const META_ROBOTS_CONFLICT = {
  id: "seo.robots_conflict" as FindingCode,
  name: "Robots Conflict",
  version: "1.0.0",
  description: "Conflicting robot directives present.",
  category: "seo" as const,
  defaultSeverity: "low" as const,
};

// Title rules
export const MISSING_TITLE: AnalysisRule = {
  code: META_MISSING_TITLE.id,
  analyze: (s) =>
    s.pageTitle.trim() === ""
      ? [createFinding(META_MISSING_TITLE.id, META_MISSING_TITLE.name, META_MISSING_TITLE.description, META_MISSING_TITLE.defaultSeverity, META_MISSING_TITLE.category, "head > title")]
      : [],
};

export const TITLE_TOO_SHORT: AnalysisRule = {
  code: META_TITLE_TOO_SHORT.id,
  analyze: (s) =>
    s.pageTitle.trim() !== "" && s.pageTitle.length < 30
      ? [createFinding(META_TITLE_TOO_SHORT.id, META_TITLE_TOO_SHORT.name, META_TITLE_TOO_SHORT.description, META_TITLE_TOO_SHORT.defaultSeverity, META_TITLE_TOO_SHORT.category, "head > title")]
      : [],
};

export const TITLE_TOO_LONG: AnalysisRule = {
  code: META_TITLE_TOO_LONG.id,
  analyze: (s) =>
    s.pageTitle.trim() !== "" && s.pageTitle.length > 60
      ? [createFinding(META_TITLE_TOO_LONG.id, META_TITLE_TOO_LONG.name, META_TITLE_TOO_LONG.description, META_TITLE_TOO_LONG.defaultSeverity, META_TITLE_TOO_LONG.category, "head > title")]
      : [],
};

export const TITLE_DUPLICATE_WORDS: AnalysisRule = {
  code: META_TITLE_DUPLICATE_WORDS.id,
  analyze: (s) => {
    if (s.pageTitle.trim() === "") return [];
    const words = s.pageTitle.toLowerCase().split(/\s+/);
    const hasDuplicates = words.some((w, i) => i > 0 && w === words[i - 1]);
    return hasDuplicates
      ? [createFinding(META_TITLE_DUPLICATE_WORDS.id, META_TITLE_DUPLICATE_WORDS.name, META_TITLE_DUPLICATE_WORDS.description, META_TITLE_DUPLICATE_WORDS.defaultSeverity, META_TITLE_DUPLICATE_WORDS.category, "head > title")]
      : [];
  },
};

// Meta description rules
export const MISSING_META_DESCRIPTION: AnalysisRule = {
  code: META_MISSING_META_DESCRIPTION.id,
  analyze: (s) =>
    s.metaDescription.trim() === ""
      ? [createFinding(META_MISSING_META_DESCRIPTION.id, META_MISSING_META_DESCRIPTION.name, META_MISSING_META_DESCRIPTION.description, META_MISSING_META_DESCRIPTION.defaultSeverity, META_MISSING_META_DESCRIPTION.category, "head > meta[name='description']")]
      : [],
};

export const META_DESCRIPTION_TOO_SHORT: AnalysisRule = {
  code: META_META_DESCRIPTION_TOO_SHORT.id,
  analyze: (s) =>
    s.metaDescription.trim() !== "" && s.metaDescription.length < 120
      ? [createFinding(META_META_DESCRIPTION_TOO_SHORT.id, META_META_DESCRIPTION_TOO_SHORT.name, META_META_DESCRIPTION_TOO_SHORT.description, META_META_DESCRIPTION_TOO_SHORT.defaultSeverity, META_META_DESCRIPTION_TOO_SHORT.category, "head > meta[name='description']")]
      : [],
};

export const META_DESCRIPTION_TOO_LONG: AnalysisRule = {
  code: META_META_DESCRIPTION_TOO_LONG.id,
  analyze: (s) =>
    s.metaDescription.trim() !== "" && s.metaDescription.length > 160
      ? [createFinding(META_META_DESCRIPTION_TOO_LONG.id, META_META_DESCRIPTION_TOO_LONG.name, META_META_DESCRIPTION_TOO_LONG.description, META_META_DESCRIPTION_TOO_LONG.defaultSeverity, META_META_DESCRIPTION_TOO_LONG.category, "head > meta[name='description']")]
      : [],
};

// Heading rules
export const MISSING_H1: AnalysisRule = {
  code: META_MISSING_H1.id,
  analyze: (s) => {
    const h1Count = s.headings.filter((h) => h.level === 1).length;
    return h1Count === 0
      ? [createFinding(META_MISSING_H1.id, META_MISSING_H1.name, META_MISSING_H1.description, META_MISSING_H1.defaultSeverity, META_MISSING_H1.category, "body")]
      : [];
  },
};

export const MULTIPLE_H1: AnalysisRule = {
  code: META_MULTIPLE_H1.id,
  analyze: (s) => {
    const h1Count = s.headings.filter((h) => h.level === 1).length;
    return h1Count > 1
      ? [createFinding(META_MULTIPLE_H1.id, META_MULTIPLE_H1.name, META_MULTIPLE_H1.description, META_MULTIPLE_H1.defaultSeverity, META_MULTIPLE_H1.category)]
      : [];
  },
};

export const HEADING_HIERARCHY: AnalysisRule = {
  code: META_HEADING_HIERARCHY.id,
  analyze: (s) => {
    const findings: Finding[] = [];
    const h1Count = s.headings.filter((h) => h.level === 1).length;
    if (h1Count === 0) return findings;
    let expectedLevel = 2;
    for (const h of s.headings) {
      if (h.level === 1) continue;
      if (h.level > expectedLevel) {
        findings.push(
          createFinding(
            META_HEADING_HIERARCHY.id,
            META_HEADING_HIERARCHY.name,
            META_HEADING_HIERARCHY.description,
            META_HEADING_HIERARCHY.defaultSeverity,
            META_HEADING_HIERARCHY.category,
            `h${h.level}`,
          ),
        );
      }
      expectedLevel = h.level;
      if (h.level < 6) expectedLevel = h.level + 1;
    }
    return findings;
  },
};

// Image rules
export const MISSING_ALT: AnalysisRule = {
  code: META_MISSING_ALT.id,
  analyze: (s) =>
    s.images
      .map((img, i) =>
        img.alt === undefined || img.alt === null
          ? createFinding(META_MISSING_ALT.id, META_MISSING_ALT.name, META_MISSING_ALT.description, META_MISSING_ALT.defaultSeverity, META_MISSING_ALT.category, `img:nth-child(${i + 1})`)
          : null,
      )
      .filter((f): f is Finding => f !== null),
};

export const EMPTY_ALT: AnalysisRule = {
  code: META_EMPTY_ALT.id,
  analyze: (s) =>
    s.images
      .map((img, i) =>
        img.alt === ""
          ? createFinding(META_EMPTY_ALT.id, META_EMPTY_ALT.name, META_EMPTY_ALT.description, META_EMPTY_ALT.defaultSeverity, META_EMPTY_ALT.category, `img:nth-child(${i + 1})`)
          : null,
      )
      .filter((f): f is Finding => f !== null),
};

// Link rules
export const EMPTY_ANCHOR_TEXT: AnalysisRule = {
  code: META_EMPTY_ANCHOR_TEXT.id,
  analyze: (s) =>
    s.links
      .map((link, i) =>
        link.text.trim() === ""
          ? createFinding(META_EMPTY_ANCHOR_TEXT.id, META_EMPTY_ANCHOR_TEXT.name, META_EMPTY_ANCHOR_TEXT.description, META_EMPTY_ANCHOR_TEXT.defaultSeverity, META_EMPTY_ANCHOR_TEXT.category, `a:nth-child(${i + 1})`)
          : null,
      )
      .filter((f): f is Finding => f !== null),
};

export const SUSPICIOUS_URLS: AnalysisRule = {
  code: META_SUSPICIOUS_URLS.id,
  analyze: (s) => {
    const suspicious = s.links.filter((l) => /javascript:|mailto:|tel:|^#/i.test(l.href));
    return suspicious.length > 0
      ? [createFinding(META_SUSPICIOUS_URLS.id, META_SUSPICIOUS_URLS.name, META_SUSPICIOUS_URLS.description, META_SUSPICIOUS_URLS.defaultSeverity, META_SUSPICIOUS_URLS.category)]
      : [];
  },
};

export const EXTERNAL_LINK_REL: AnalysisRule = {
  code: META_EXTERNAL_LINK_REL.id,
  analyze: (s) =>
    s.links
      .map((link, i) =>
        !link.isInternal
          ? createFinding(META_EXTERNAL_LINK_REL.id, META_EXTERNAL_LINK_REL.name, META_EXTERNAL_LINK_REL.description, META_EXTERNAL_LINK_REL.defaultSeverity, META_EXTERNAL_LINK_REL.category, `a:nth-child(${i + 1})`)
          : null,
      )
      .filter((f): f is Finding => f !== null),
};

// Canonical rules
export const MISSING_CANONICAL: AnalysisRule = {
  code: META_MISSING_CANONICAL.id,
  analyze: (s) =>
    s.canonicalUrl.trim() === ""
      ? [createFinding(META_MISSING_CANONICAL.id, META_MISSING_CANONICAL.name, META_MISSING_CANONICAL.description, META_MISSING_CANONICAL.defaultSeverity, META_MISSING_CANONICAL.category, "head > link[rel='canonical']")]
      : [],
};

// Open Graph rules
export const MISSING_OG: AnalysisRule = {
  code: META_MISSING_OG.id,
  analyze: (s) => {
    const missing: string[] = [];
    if (!s.openGraph.title) missing.push("og:title");
    if (!s.openGraph.description) missing.push("og:description");
    if (!s.openGraph.image) missing.push("og:image");
    return missing.length > 0
      ? [createFinding(META_MISSING_OG.id, META_MISSING_OG.name, `${META_MISSING_OG.description} Missing: ${missing.join(", ")}.`, META_MISSING_OG.defaultSeverity, META_MISSING_OG.category)]
      : [];
  },
};

// Twitter Card rules
export const MISSING_TWITTER: AnalysisRule = {
  code: META_MISSING_TWITTER.id,
  analyze: (s) => {
    const missing: string[] = [];
    if (!s.twitterCard.title) missing.push("twitter:title");
    if (!s.twitterCard.description) missing.push("twitter:description");
    return missing.length > 0
      ? [createFinding(META_MISSING_TWITTER.id, META_MISSING_TWITTER.name, `${META_MISSING_TWITTER.description} Missing: ${missing.join(", ")}.`, META_MISSING_TWITTER.defaultSeverity, META_MISSING_TWITTER.category)]
      : [];
  },
};

// Robots rules
export const ROBOTS_NOINDEX: AnalysisRule = {
  code: META_ROBOTS_NOINDEX.id,
  analyze: (s) =>
    s.robots.noindex
      ? [createFinding(META_ROBOTS_NOINDEX.id, META_ROBOTS_NOINDEX.name, META_ROBOTS_NOINDEX.description, META_ROBOTS_NOINDEX.defaultSeverity, META_ROBOTS_NOINDEX.category, "head > meta[name='robots']")]
      : [],
};

export const ROBOTS_NOFOLLOW: AnalysisRule = {
  code: META_ROBOTS_NOFOLLOW.id,
  analyze: (s) =>
    s.robots.nofollow
      ? [createFinding(META_ROBOTS_NOFOLLOW.id, META_ROBOTS_NOFOLLOW.name, META_ROBOTS_NOFOLLOW.description, META_ROBOTS_NOFOLLOW.defaultSeverity, META_ROBOTS_NOFOLLOW.category, "head > meta[name='robots']")]
      : [],
};

// Language rule
export const MISSING_LANG: AnalysisRule = {
  code: META_MISSING_LANG.id,
  analyze: (s) =>
    s.language.trim() === ""
      ? [createFinding(META_MISSING_LANG.id, META_MISSING_LANG.name, META_MISSING_LANG.description, META_MISSING_LANG.defaultSeverity, META_MISSING_LANG.category, "html")]
      : [],
};

// JSON-LD rule
export const MISSING_JSONLD: AnalysisRule = {
  code: META_MISSING_JSONLD.id,
  analyze: (s) =>
    s.jsonLd.length === 0
      ? [createFinding(META_MISSING_JSONLD.id, META_MISSING_JSONLD.name, META_MISSING_JSONLD.description, META_MISSING_JSONLD.defaultSeverity, META_MISSING_JSONLD.category)]
      : [],
};

// Placeholder rules (cannot be determined without live checks)
export const BROKEN_IMAGES: AnalysisRule = {
  code: META_BROKEN_IMAGES.id,
  analyze: () => [],
};

export const BROKEN_INTERNAL_LINKS: AnalysisRule = {
  code: META_BROKEN_INTERNAL_LINKS.id,
  analyze: () => [],
};

export const INVALID_CANONICAL: AnalysisRule = {
  code: META_INVALID_CANONICAL.id,
  analyze: () => [],
};

export const MULTIPLE_CANONICAL: AnalysisRule = {
  code: META_MULTIPLE_CANONICAL.id,
  analyze: () => [],
};

export const ROBOTS_CONFLICT: AnalysisRule = {
  code: META_ROBOTS_CONFLICT.id,
  analyze: () => [],
};

// All rules registry
export const ALL_RULES: readonly AnalysisRule[] = [
  MISSING_TITLE,
  TITLE_TOO_SHORT,
  TITLE_TOO_LONG,
  TITLE_DUPLICATE_WORDS,
  MISSING_META_DESCRIPTION,
  META_DESCRIPTION_TOO_SHORT,
  META_DESCRIPTION_TOO_LONG,
  MISSING_H1,
  MULTIPLE_H1,
  HEADING_HIERARCHY,
  MISSING_ALT,
  EMPTY_ALT,
  BROKEN_IMAGES,
  BROKEN_INTERNAL_LINKS,
  EMPTY_ANCHOR_TEXT,
  SUSPICIOUS_URLS,
  EXTERNAL_LINK_REL,
  MISSING_CANONICAL,
  INVALID_CANONICAL,
  MULTIPLE_CANONICAL,
  MISSING_OG,
  MISSING_TWITTER,
  ROBOTS_NOINDEX,
  ROBOTS_NOFOLLOW,
  ROBOTS_CONFLICT,
  MISSING_LANG,
  MISSING_JSONLD,
];

// Export metadata by code lookup
export const RULE_METADATA: Record<FindingCode, RuleMetadata> = {
  [META_MISSING_TITLE.id]: META_MISSING_TITLE,
  [META_TITLE_TOO_SHORT.id]: META_TITLE_TOO_SHORT,
  [META_TITLE_TOO_LONG.id]: META_TITLE_TOO_LONG,
  [META_TITLE_DUPLICATE_WORDS.id]: META_TITLE_DUPLICATE_WORDS,
  [META_MISSING_META_DESCRIPTION.id]: META_MISSING_META_DESCRIPTION,
  [META_META_DESCRIPTION_TOO_SHORT.id]: META_META_DESCRIPTION_TOO_SHORT,
  [META_META_DESCRIPTION_TOO_LONG.id]: META_META_DESCRIPTION_TOO_LONG,
  [META_MISSING_H1.id]: META_MISSING_H1,
  [META_MULTIPLE_H1.id]: META_MULTIPLE_H1,
  [META_HEADING_HIERARCHY.id]: META_HEADING_HIERARCHY,
  [META_MISSING_ALT.id]: META_MISSING_ALT,
  [META_EMPTY_ALT.id]: META_EMPTY_ALT,
  [META_EMPTY_ANCHOR_TEXT.id]: META_EMPTY_ANCHOR_TEXT,
  [META_SUSPICIOUS_URLS.id]: META_SUSPICIOUS_URLS,
  [META_EXTERNAL_LINK_REL.id]: META_EXTERNAL_LINK_REL,
  [META_MISSING_CANONICAL.id]: META_MISSING_CANONICAL,
  [META_MISSING_OG.id]: META_MISSING_OG,
  [META_MISSING_TWITTER.id]: META_MISSING_TWITTER,
  [META_ROBOTS_NOINDEX.id]: META_ROBOTS_NOINDEX,
  [META_ROBOTS_NOFOLLOW.id]: META_ROBOTS_NOFOLLOW,
  [META_MISSING_LANG.id]: META_MISSING_LANG,
  [META_MISSING_JSONLD.id]: META_MISSING_JSONLD,
  [META_BROKEN_IMAGES.id]: META_BROKEN_IMAGES,
  [META_BROKEN_INTERNAL_LINKS.id]: META_BROKEN_INTERNAL_LINKS,
  [META_INVALID_CANONICAL.id]: META_INVALID_CANONICAL,
  [META_MULTIPLE_CANONICAL.id]: META_MULTIPLE_CANONICAL,
  [META_ROBOTS_CONFLICT.id]: META_ROBOTS_CONFLICT,
};