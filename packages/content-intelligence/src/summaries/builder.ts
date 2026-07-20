// @forge/content-intelligence
// Deterministic summary builders for links, media, trust, schema, metadata.
// NO AI.

import type { CheerioAPI } from "cheerio";
import type {
  HeadingDistribution,
  LinkSummary,
  MediaSummary,
  MetadataSummary,
  SchemaSummary,
  TrustIndicators,
  WebsiteSnapshot,
} from "../types.js";

export function buildHeadingDistribution(snapshot: WebsiteSnapshot): HeadingDistribution {
  const distribution: { h1: number; h2: number; h3: number; h4: number; h5: number; h6: number; total: number } = {
    h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0, total: snapshot.headings.length,
  };
  for (const heading of snapshot.headings) {
    const key = `h${heading.level}` as keyof typeof distribution;
    if (key in distribution) {
      distribution[key] = (distribution[key] as number) + 1;
    }
  }
  return distribution;
}

export function buildLinkSummary(snapshot: WebsiteSnapshot): LinkSummary {
  const internalLinks = snapshot.links.filter((link: { isInternal: boolean }) => link.isInternal);
  const externalLinks = snapshot.links.filter((link: { isInternal: boolean }) => !link.isInternal);
  return {
    internal: internalLinks.length,
    external: externalLinks.length,
    total: snapshot.links.length,
    internalAnchors: internalLinks.map((link) => link.text).slice(0, 20),
    externalAnchors: externalLinks.map((link) => link.text).slice(0, 20),
  };
}

export function buildMediaSummary(snapshot: WebsiteSnapshot, $: CheerioAPI): MediaSummary {
  const imagesWithAlt = snapshot.images.filter((image) => image.alt && image.alt.trim().length > 0).length;
  const videos = $("video").length + $("iframe[src*='youtube'], iframe[src*='vimeo']").length;
  return {
    images: snapshot.images.length,
    imagesWithAlt,
    imagesWithoutAlt: snapshot.images.length - imagesWithAlt,
    videos,
    hasHeroImage: snapshot.images.length > 0,
  };
}

export function buildSchemaSummary(snapshot: WebsiteSnapshot): SchemaSummary {
  const types = snapshot.jsonLd.map((item) => String(item["@type"] ?? "")).filter(Boolean);
  const lower = types.map((type) => type.toLowerCase());
  return {
    types,
    count: types.length,
    hasOrganization: lower.some((type) => type.includes("organization")),
    hasProduct: lower.some((type) => type.includes("product")),
    hasBreadcrumb: lower.some((type) => type.includes("breadcrumb")),
    hasFAQ: lower.some((type) => type.includes("faq")),
  };
}

export function buildMetadataSummary(snapshot: WebsiteSnapshot): MetadataSummary {
  return {
    hasTitle: Boolean(snapshot.pageTitle && snapshot.pageTitle.trim().length > 0),
    hasMetaDescription: Boolean(snapshot.metaDescription && snapshot.metaDescription.trim().length > 0),
    hasCanonical: Boolean(snapshot.canonicalUrl),
    hasOpenGraph: Boolean(snapshot.openGraph && Object.keys(snapshot.openGraph).length > 0),
    hasTwitterCard: Boolean(snapshot.twitterCard && Object.keys(snapshot.twitterCard).length > 0),
    hasJsonLd: snapshot.jsonLd.length > 0,
    hasLang: Boolean(snapshot.language),
  };
}

export function buildTrustIndicators(snapshot: WebsiteSnapshot, $: CheerioAPI): TrustIndicators {
  const text = $("body").text().toLowerCase();
  const hasTestimonials = /testimonial|review|rating|5\s*star/i.test(text);
  const hasReviews = /review|rating|stars?/i.test(text);
  const hasCertifications = /certified|certification|iso\s*\d+|accredited/i.test(text);
  const hasSecurityBadges = /secure|ssl|encrypted|pci|gdpr/i.test(text);
  const hasAboutPage = /about us|our story|our team|who we are/i.test(text);
  const hasContactInfo = Boolean(snapshot.robots) || /contact us|email|phone|address/i.test(text);
  const hasSocialProof = /customers?|clients?|users?|companies|trusted by/i.test(text);

  const signals = [
    hasTestimonials && "testimonials",
    hasReviews && "reviews",
    hasCertifications && "certifications",
    hasSecurityBadges && "security-badges",
    hasAboutPage && "about-page",
    hasContactInfo && "contact-info",
    hasSocialProof && "social-proof",
  ].filter(Boolean) as string[];

  const score = Math.round((signals.length / 7) * 100);
  return {
    hasTestimonials,
    hasReviews,
    hasCertifications,
    hasSecurityBadges,
    hasAboutPage,
    hasContactInfo,
    hasSocialProof,
    score,
  };
}
