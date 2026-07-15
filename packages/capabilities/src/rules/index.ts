// @forge/capabilities/rules/index
// Registry of all analysis rules with metadata.

import type { AnalysisRule, Finding, FindingId, RuleMetadata } from "@forge/core";

// Metadata objects for each rule (stable, deterministic)
const META_MISSING_TITLE: RuleMetadata = {
  id: "seo.missing_title" as FindingId,
  name: "Missing Title",
  version: "1.0.0",
  description: "Page has no title element.",
  category: "seo" as const,
  defaultSeverity: "critical" as const,
};

const META_TITLE_TOO_SHORT: RuleMetadata = {
  id: "seo.title_too_short" as FindingId,
  name: "Title Too Short",
  version: "1.0.0",
  description: "Title is under 30 characters for optimal SEO.",
  category: "seo" as const,
  defaultSeverity: "low" as const,
};

const META_TITLE_TOO_LONG: RuleMetadata = {
  id: "seo.title_too_long" as FindingId,
  name: "Title Too Long",
  version: "1.0.0",
  description: "Title exceeds 60 characters; may truncate in search results.",
  category: "seo" as const,
  defaultSeverity: "medium" as const,
};

const META_TITLE_DUPLICATE_WORDS: RuleMetadata = {
  id: "seo.title_duplicate_words" as FindingId,
  name: "Duplicate Words in Title",
  version: "1.0.0",
  description: "Title contains consecutive duplicate words.",
  category: "seo" as const,
  defaultSeverity: "low" as const,
};

const META_MISSING_META_DESCRIPTION: RuleMetadata = {
  id: "seo.missing_meta_description" as FindingId,
  name: "Missing Meta Description",
  version: "1.0.0",
  description: "Page has no meta description element.",
  category: "seo" as const,
  defaultSeverity: "high" as const,
};

const META_META_DESCRIPTION_TOO_SHORT: RuleMetadata = {
  id: "seo.meta_description_too_short" as FindingId,
  name: "Meta Description Too Short",
  version: "1.0.0",
  description: "Meta description is under 120 characters.",
  category: "seo" as const,
  defaultSeverity: "low" as const,
};

const META_META_DESCRIPTION_TOO_LONG: RuleMetadata = {
  id: "seo.meta_description_too_long" as FindingId,
  name: "Meta Description Too Long",
  version: "1.0.0",
  description: "Meta description exceeds 160 characters; may truncate in search.",
  category: "seo" as const,
  defaultSeverity: "medium" as const,
};

const META_MISSING_H1: RuleMetadata = {
  id: "seo.missing_h1" as FindingId,
  name: "Missing H1",
  version: "1.0.0",
  description: "Page has no H1 heading element.",
  category: "seo" as const,
  defaultSeverity: "high" as const,
};

const META_MULTIPLE_H1: RuleMetadata = {
  id: "seo.multiple_h1" as FindingId,
  name: "Multiple H1",
  version: "1.0.0",
  description: "Page has multiple H1 headings; should have exactly one.",
  category: "seo" as const,
  defaultSeverity: "medium" as const,
};

const META_HEADING_HIERARCHY: RuleMetadata = {
  id: "seo.heading_hierarchy" as FindingId,
  name: "Skipped Heading Level",
  version: "1.0.0",
  description: "Heading levels are not sequential in the document.",
  category: "seo" as const,
  defaultSeverity: "low" as const,
};

const META_MISSING_ALT: RuleMetadata = {
  id: "accessibility.missing_alt" as FindingId,
  name: "Missing Alt Text",
  version: "1.0.0",
  description: "Image missing alt attribute.",
  category: "accessibility" as const,
  defaultSeverity: "medium" as const,
};

const META_EMPTY_ALT: RuleMetadata = {
  id: "accessibility.empty_alt" as FindingId,
  name: "Empty Alt Text",
  version: "1.0.0",
  description: "Image has empty alt text (purely decorative).",
  category: "accessibility" as const,
  defaultSeverity: "low" as const,
};

const META_EMPTY_ANCHOR_TEXT: RuleMetadata = {
  id: "seo.empty_anchor_text" as FindingId,
  name: "Empty Anchor Text",
  version: "1.0.0",
  description: "Link has no visible text content.",
  category: "seo" as const,
  defaultSeverity: "low" as const,
};

const META_SUSPICIOUS_URLS: RuleMetadata = {
  id: "links.suspicious_urls" as FindingId,
  name: "Suspicious URLs",
  version: "1.0.0",
  description: "Links use javascript:, mailto:, tel:, or anchor-only URLs.",
  category: "links" as const,
  defaultSeverity: "info" as const,
};

const META_EXTERNAL_LINK_REL: RuleMetadata = {
  id: "links.external_link_rel" as FindingId,
  name: "External Link Needs Rel Attribute",
  version: "1.0.0",
  description: "External link should have rel='noopener' or 'nofollow'.",
  category: "links" as const,
  defaultSeverity: "info" as const,
};

const META_MISSING_CANONICAL: RuleMetadata = {
  id: "seo.missing_canonical" as FindingId,
  name: "Missing Canonical",
  version: "1.0.0",
  description: "Page has no canonical URL.",
  category: "seo" as const,
  defaultSeverity: "medium" as const,
};

const META_MISSING_OG: RuleMetadata = {
  id: "metadata.missing_og" as FindingId,
  name: "Missing Open Graph",
  version: "1.0.0",
  description: "Missing Open Graph metadata tags.",
  category: "metadata" as const,
  defaultSeverity: "high" as const,
};

const META_MISSING_TWITTER: RuleMetadata = {
  id: "metadata.missing_twitter" as FindingId,
  name: "Missing Twitter Card",
  version: "1.0.0",
  description: "Missing Twitter Card metadata tags.",
  category: "metadata" as const,
  defaultSeverity: "low" as const,
};

const META_ROBOTS_NOINDEX: RuleMetadata = {
  id: "seo.robots_noindex" as FindingId,
  name: "noindex Directive",
  version: "1.0.0",
  description: "Page blocks indexing via robots meta tag.",
  category: "seo" as const,
  defaultSeverity: "critical" as const,
};

const META_ROBOTS_NOFOLLOW: RuleMetadata = {
  id: "seo.robots_nofollow" as FindingId,
  name: "nofollow Directive",
  version: "1.0.0",
  description: "Page blocks link following via robots meta tag.",
  category: "seo" as const,
  defaultSeverity: "medium" as const,
};

const META_MISSING_LANG: RuleMetadata = {
  id: "accessibility.missing_lang" as FindingId,
  name: "Missing Language",
  version: "1.0.0",
  description: "HTML element missing lang attribute.",
  category: "accessibility" as const,
  defaultSeverity: "low" as const,
};

const META_MISSING_JSONLD: RuleMetadata = {
  id: "technical.missing_jsonld" as FindingId,
  name: "Missing JSON-LD",
  version: "1.0.0",
  description: "Page has no structured data (JSON-LD).",
  category: "technical" as const,
  defaultSeverity: "info" as const,
};

// Meta for placeholder rules
const META_BROKEN_IMAGES: RuleMetadata = {
  id: "links.broken_images" as FindingId,
  name: "Broken Images",
  version: "1.0.0",
  description: "Image sources return HTTP errors.",
  category: "links" as const,
  defaultSeverity: "medium" as const,
};

const META_BROKEN_INTERNAL_LINKS: RuleMetadata = {
  id: "links.broken_internal_links" as FindingId,
  name: "Broken Internal Links",
  version: "1.0.0",
  description: "Internal links return HTTP errors.",
  category: "links" as const,
  defaultSeverity: "medium" as const,
};

const META_INVALID_CANONICAL: RuleMetadata = {
  id: "seo.invalid_canonical" as FindingId,
  name: "Invalid Canonical",
  version: "1.0.0",
  description: "Canonical URL is malformed or points to different domain.",
  category: "seo" as const,
  defaultSeverity: "medium" as const,
};

const META_MULTIPLE_CANONICAL: RuleMetadata = {
  id: "seo.multiple_canonical" as FindingId,
  name: "Multiple Canonicals",
  version: "1.0.0",
  description: "Multiple canonical link elements found.",
  category: "seo" as const,
  defaultSeverity: "low" as const,
};

const META_ROBOTS_CONFLICT: RuleMetadata = {
  id: "seo.robots_conflict" as FindingId,
  name: "Robots Conflict",
  version: "1.0.0",
  description: "Conflicting robot directives present.",
  category: "seo" as const,
  defaultSeverity: "low" as const,
};

// Helper to create a finding with stable ID
function createFinding(
  meta: RuleMetadata,
  location?: string,
): Finding {
  return {
    id: meta.id,
    title: meta.name,
    description: meta.description,
    severity: meta.defaultSeverity,
    category: meta.category,
    evidence: location
      ? [{ source: "analysis", detail: location, value: location }]
      : [{ source: "analysis", detail: meta.name }],
    location,
    confidence: 1.0,
    fixable: true,
    ruleMetadata: meta,
  };
}

// Title rules
export const MISSING_TITLE: AnalysisRule = {
  metadata: META_MISSING_TITLE,
  analyze: (s) =>
    s.pageTitle.trim() === ""
      ? [createFinding(META_MISSING_TITLE, "head > title")]
      : [],
};

export const TITLE_TOO_SHORT: AnalysisRule = {
  metadata: META_TITLE_TOO_SHORT,
  analyze: (s) =>
    s.pageTitle.trim() !== "" && s.pageTitle.length < 30
      ? [createFinding(META_TITLE_TOO_SHORT, "head > title")]
      : [],
};

export const TITLE_TOO_LONG: AnalysisRule = {
  metadata: META_TITLE_TOO_LONG,
  analyze: (s) =>
    s.pageTitle.trim() !== "" && s.pageTitle.length > 60
      ? [createFinding(META_TITLE_TOO_LONG, "head > title")]
      : [],
};

export const TITLE_DUPLICATE_WORDS: AnalysisRule = {
  metadata: META_TITLE_DUPLICATE_WORDS,
  analyze: (s) => {
    if (s.pageTitle.trim() === "") return [];
    const words = s.pageTitle.toLowerCase().split(/\s+/);
    const hasDuplicates = words.some((w, i) => i > 0 && w === words[i - 1]);
    return hasDuplicates
      ? [createFinding(META_TITLE_DUPLICATE_WORDS, "head > title")]
      : [];
  },
};

// Meta description rules
export const MISSING_META_DESCRIPTION: AnalysisRule = {
  metadata: META_MISSING_META_DESCRIPTION,
  analyze: (s) =>
    s.metaDescription.trim() === ""
      ? [createFinding(META_MISSING_META_DESCRIPTION, "head > meta[name='description']")]
      : [],
};

export const META_DESCRIPTION_TOO_SHORT: AnalysisRule = {
  metadata: META_META_DESCRIPTION_TOO_SHORT,
  analyze: (s) =>
    s.metaDescription.trim() !== "" && s.metaDescription.length < 120
      ? [createFinding(META_META_DESCRIPTION_TOO_SHORT, "head > meta[name='description']")]
      : [],
};

export const META_DESCRIPTION_TOO_LONG: AnalysisRule = {
  metadata: META_META_DESCRIPTION_TOO_LONG,
  analyze: (s) =>
    s.metaDescription.trim() !== "" && s.metaDescription.length > 160
      ? [createFinding(META_META_DESCRIPTION_TOO_LONG, "head > meta[name='description']")]
      : [],
};

// Heading rules
export const MISSING_H1: AnalysisRule = {
  metadata: META_MISSING_H1,
  analyze: (s) => {
    const h1Count = s.headings.filter((h) => h.level === 1).length;
    return h1Count === 0
      ? [createFinding(META_MISSING_H1, "body")]
      : [];
  },
};

export const MULTIPLE_H1: AnalysisRule = {
  metadata: META_MULTIPLE_H1,
  analyze: (s) => {
    const h1Count = s.headings.filter((h) => h.level === 1).length;
    return h1Count > 1
      ? [createFinding(META_MULTIPLE_H1)]
      : [];
  },
};

export const HEADING_HIERARCHY: AnalysisRule = {
  metadata: META_HEADING_HIERARCHY,
  analyze: (s) => {
    const findings: Finding[] = [];
    const h1Count = s.headings.filter((h) => h.level === 1).length;
    if (h1Count === 0) return findings;
    let expectedLevel = 2;
    for (const h of s.headings) {
      if (h.level === 1) continue;
      if (h.level > expectedLevel) {
        findings.push(
          createFinding(META_HEADING_HIERARCHY, `h${h.level}`),
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
  metadata: META_MISSING_ALT,
  analyze: (s) =>
    s.images
      .map((img, i) =>
        img.alt === undefined || img.alt === null
          ? createFinding(META_MISSING_ALT, `img:nth-child(${i + 1})`)
          : null,
      )
      .filter((f): f is Finding => f !== null),
};

export const EMPTY_ALT: AnalysisRule = {
  metadata: META_EMPTY_ALT,
  analyze: (s) =>
    s.images
      .map((img, i) =>
        img.alt === ""
          ? createFinding(META_EMPTY_ALT, `img:nth-child(${i + 1})`)
          : null,
      )
      .filter((f): f is Finding => f !== null),
};

// Link rules
export const EMPTY_ANCHOR_TEXT: AnalysisRule = {
  metadata: META_EMPTY_ANCHOR_TEXT,
  analyze: (s) =>
    s.links
      .map((link, i) =>
        link.text.trim() === ""
          ? createFinding(META_EMPTY_ANCHOR_TEXT, `a:nth-child(${i + 1})`)
          : null,
      )
      .filter((f): f is Finding => f !== null),
};

export const SUSPICIOUS_URLS: AnalysisRule = {
  metadata: META_SUSPICIOUS_URLS,
  analyze: (s) => {
    const suspicious = s.links.filter((l) => /javascript:|mailto:|tel:|^#/i.test(l.href));
    return suspicious.length > 0
      ? [createFinding(META_SUSPICIOUS_URLS)]
      : [];
  },
};

export const EXTERNAL_LINK_REL: AnalysisRule = {
  metadata: META_EXTERNAL_LINK_REL,
  analyze: (s) =>
    s.links
      .map((link, i) =>
        !link.isInternal
          ? createFinding(META_EXTERNAL_LINK_REL, `a:nth-child(${i + 1})`)
          : null,
      )
      .filter((f): f is Finding => f !== null),
};

// Canonical rules
export const MISSING_CANONICAL: AnalysisRule = {
  metadata: META_MISSING_CANONICAL,
  analyze: (s) =>
    s.canonicalUrl.trim() === ""
      ? [createFinding(META_MISSING_CANONICAL, "head > link[rel='canonical']")]
      : [],
};

// Open Graph rules
export const MISSING_OG: AnalysisRule = {
  metadata: META_MISSING_OG,
  analyze: (s) => {
    const missing: string[] = [];
    if (!s.openGraph.title) missing.push("og:title");
    if (!s.openGraph.description) missing.push("og:description");
    if (!s.openGraph.image) missing.push("og:image");
    return missing.length > 0
      ? [createFinding(META_MISSING_OG, `Missing: ${missing.join(", ")}.`)]
      : [];
  },
};

// Twitter Card rules
export const MISSING_TWITTER: AnalysisRule = {
  metadata: META_MISSING_TWITTER,
  analyze: (s) => {
    const missing: string[] = [];
    if (!s.twitterCard.title) missing.push("twitter:title");
    if (!s.twitterCard.description) missing.push("twitter:description");
    return missing.length > 0
      ? [createFinding(META_MISSING_TWITTER, `Missing: ${missing.join(", ")}.`)]
      : [];
  },
};

// Robots rules
export const ROBOTS_NOINDEX: AnalysisRule = {
  metadata: META_ROBOTS_NOINDEX,
  analyze: (s) =>
    s.robots.noindex
      ? [createFinding(META_ROBOTS_NOINDEX, "head > meta[name='robots']")]
      : [],
};

export const ROBOTS_NOFOLLOW: AnalysisRule = {
  metadata: META_ROBOTS_NOFOLLOW,
  analyze: (s) =>
    s.robots.nofollow
      ? [createFinding(META_ROBOTS_NOFOLLOW, "head > meta[name='robots']")]
      : [],
};

// Language rule
export const MISSING_LANG: AnalysisRule = {
  metadata: META_MISSING_LANG,
  analyze: (s) =>
    s.language.trim() === ""
      ? [createFinding(META_MISSING_LANG, "html")]
      : [],
};

// JSON-LD rule
export const MISSING_JSONLD: AnalysisRule = {
  metadata: META_MISSING_JSONLD,
  analyze: (s) =>
    s.jsonLd.length === 0
      ? [createFinding(META_MISSING_JSONLD)]
      : [],
};

// Placeholder rules (cannot be determined without live checks)
export const BROKEN_IMAGES: AnalysisRule = {
  metadata: META_BROKEN_IMAGES,
  analyze: () => [],
};

export const BROKEN_INTERNAL_LINKS: AnalysisRule = {
  metadata: META_BROKEN_INTERNAL_LINKS,
  analyze: () => [],
};

export const INVALID_CANONICAL: AnalysisRule = {
  metadata: META_INVALID_CANONICAL,
  analyze: () => [],
};

export const MULTIPLE_CANONICAL: AnalysisRule = {
  metadata: META_MULTIPLE_CANONICAL,
  analyze: () => [],
};

export const ROBOTS_CONFLICT: AnalysisRule = {
  metadata: META_ROBOTS_CONFLICT,
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

// Export metadata by id lookup
export const RULE_METADATA: Record<FindingId, RuleMetadata> = {
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