// @forge/content-intelligence
// Shared site-level test fixtures (Sprint 24). No network, no AI.

import type { WebsiteSnapshot } from "@forge/core";

export const BASE_URL = "https://example.com";

export const FIXED_ANALYZED_AT = "2026-08-01T00:00:00.000Z";

interface PageSpec {
  readonly url: string;
  readonly title: string;
  readonly metaDescription: string;
  readonly headings: readonly { level: number; text: string }[];
  readonly bodyHtml: string;
  readonly links: readonly { href: string; text: string }[];
  readonly jsonLd?: readonly Record<string, unknown>[];
}

export function makeSiteSnapshot(spec: PageSpec): WebsiteSnapshot {
  return {
    originalUrl: spec.url,
    finalUrl: spec.url,
    statusCode: 200,
    responseHeaders: {},
    pageTitle: spec.title,
    metaDescription: spec.metaDescription,
    canonicalUrl: spec.url,
    language: "en",
    charset: "utf-8",
    favicon: "/favicon.ico",
    robots: { noindex: false, nofollow: false, index: true, follow: true },
    headings: spec.headings as WebsiteSnapshot["headings"],
    images: [],
    links: spec.links.map((link) => ({
      href: link.href,
      text: link.text,
      isInternal: link.href.startsWith("/"),
    })),
    scripts: [],
    stylesheets: [],
    jsonLd: (spec.jsonLd ?? []) as WebsiteSnapshot["jsonLd"],
    openGraph: { title: spec.title },
    twitterCard: { title: spec.title },
    rawHtml: `<!doctype html><html><head><title>${spec.title}</title></head><body>${spec.bodyHtml}</body></html>`,
  };
}

const CRM_BODY = `
  <nav class="main-menu"><a href="/">Home</a></nav>
  <section class="hero"><h1>Acme CRM</h1><p>Acme CRM is the best CRM software for teams. Manage customers, track deals, and close faster with Acme CRM.</p><a class="cta" href="/signup">Get Started</a></section>
  <section class="features"><h2>Features</h2><p>Acme CRM features include contact management, deal tracking, pipeline automation, and reporting for every team that needs CRM software.</p></section>
  <section class="pricing"><h2>Pricing</h2><p>Acme CRM pricing plans start at $9 per month. Every plan includes the core CRM features your team needs.</p></section>
  <section class="testimonials"><h2>Testimonials</h2><p>Customers say Acme CRM is the best CRM software they have used for their teams and their business.</p></section>
  <section class="faq"><h2>FAQ</h2><p>Frequently asked questions about Acme CRM pricing, features, and onboarding for teams.</p></section>
  <footer class="site-footer"><p>Copyright Acme</p></footer>
`;

const FEATURES_BODY = `
  <section class="features"><h2>Acme CRM Features</h2><p>Contact management, deal tracking, and pipeline automation are core Acme CRM features that every team relies on.</p>
  <ul><li>Contact management</li><li>Deal tracking</li><li>Pipeline automation</li><li>Reporting dashboards</li></ul></section>
  <section class="comparison"><h2>Comparison</h2><p>Compare Acme CRM with other CRM software: Acme CRM offers more features at a better price for teams.</p></section>
`;

const PRICING_BODY = `
  <section class="pricing"><h2>Acme CRM Pricing</h2><p>Acme CRM pricing plans start at $9 per month for small teams and scale for enterprise. Pricing includes all core CRM features.</p></section>
  <section class="faq"><h2>Pricing FAQ</h2><p>Frequently asked questions about Acme CRM pricing, billing, and plan limits for teams.</p></section>
`;

const GUIDE_BODY = `
  <section class="hero"><h2>The Complete CRM Buying Guide</h2><p>This CRM buying guide explains how to choose the best CRM software for your team, with practical examples and scenarios.</p></section>
  <section class="buying-guide"><h2>Buying Guide</h2><p>Use this buying guide to evaluate CRM software: features, pricing, integrations, and support. Every team should read this buying guide before choosing a CRM.</p></section>
  <section class="faq"><h2>CRM FAQ</h2><p>Frequently asked questions about choosing CRM software for teams and business needs.</p></section>
  <section class="related-content"><h2>Related Articles</h2><p>Related articles about Acme CRM features and pricing for teams.</p></section>
`;

const ABOUT_BODY = `
  <section class="about"><h2>About Acme</h2><p>Acme is the company behind Acme CRM, the best CRM software for teams. Our mission is to help every team manage customers and close deals.</p></section>
  <section class="team"><h2>Team</h2><p>Meet the Acme team building CRM software for teams everywhere.</p></section>
`;

const CONTACT_BODY = `
  <section class="contact"><h2>Contact Acme</h2><p>Contact the Acme team about Acme CRM pricing, features, or support. We answer every message about CRM software.</p></section>
  <footer class="site-footer"><p>Copyright Acme</p></footer>
`;

const GLOSSARY_BODY = `
  <section class="related-content"><h2>CRM Glossary</h2><p>Definitions of CRM terms: pipeline, deal, contact management, and CRM software for teams.</p></section>
  <section class="faq"><h2>Glossary FAQ</h2><p>Frequently asked questions about common CRM terminology.</p></section>
`;

const ORPHAN_BODY = `
  <section class="related-content"><h2>Orphan Notes</h2><p>Internal notes about CRM software best practices that nothing else on the site links to.</p></section>
`;

/**
 * A six-page CRM site with rich cross-linking plus one orphan page.
 * Every page repeats "CRM" so topic extraction is deterministic.
 */
export function makeAcmeSite(): WebsiteSnapshot[] {
  return [
    makeSiteSnapshot({
      url: `${BASE_URL}/`,
      title: "Acme CRM - Best CRM Software for Teams",
      metaDescription: "Acme CRM helps teams manage customers and close deals faster.",
      headings: [
        { level: 1, text: "Acme CRM" },
        { level: 2, text: "Features" },
        { level: 2, text: "Pricing" },
        { level: 2, text: "Testimonials" },
        { level: 2, text: "FAQ" },
      ],
      bodyHtml: CRM_BODY,
      links: [
        { href: "/features", text: "Features" },
        { href: "/pricing", text: "Pricing" },
        { href: "/blog/crm-guide", text: "CRM Buying Guide" },
        { href: "/about", text: "About" },
        { href: "/contact", text: "Contact" },
        { href: "/glossary", text: "Glossary" },
        { href: "https://partner.example.com", text: "Partner" },
      ],
      jsonLd: [{ "@type": "Organization", name: "Acme" }],
    }),
    makeSiteSnapshot({
      url: `${BASE_URL}/features`,
      title: "Acme CRM Features",
      metaDescription: "Explore Acme CRM features: contact management, deal tracking, and pipeline automation.",
      headings: [
        { level: 1, text: "Acme CRM Features" },
        { level: 2, text: "Comparison" },
      ],
      bodyHtml: FEATURES_BODY,
      links: [
        { href: "/", text: "Home" },
        { href: "/pricing", text: "Pricing" },
      ],
      jsonLd: [{ "@type": "Product", name: "Acme CRM" }],
    }),
    makeSiteSnapshot({
      url: `${BASE_URL}/pricing`,
      title: "Acme CRM Pricing",
      metaDescription: "Acme CRM pricing plans start at $9 per month for teams.",
      headings: [
        { level: 1, text: "Acme CRM Pricing" },
        { level: 2, text: "Pricing FAQ" },
      ],
      bodyHtml: PRICING_BODY,
      links: [
        { href: "/", text: "Home" },
        { href: "/features", text: "Features" },
      ],
      jsonLd: [{ "@type": "Product", name: "Acme CRM" }],
    }),
    makeSiteSnapshot({
      url: `${BASE_URL}/blog/crm-guide`,
      title: "The Complete CRM Buying Guide",
      metaDescription: "A CRM buying guide to help teams choose the best CRM software.",
      headings: [
        { level: 1, text: "The Complete CRM Buying Guide" },
        { level: 2, text: "Buying Guide" },
        { level: 2, text: "CRM FAQ" },
      ],
      bodyHtml: GUIDE_BODY,
      links: [
        { href: "/", text: "Home" },
        { href: "/features", text: "Features" },
        { href: "/pricing", text: "Pricing" },
      ],
    }),
    makeSiteSnapshot({
      url: `${BASE_URL}/about`,
      title: "About Acme",
      metaDescription: "Learn about Acme, the company behind Acme CRM.",
      headings: [
        { level: 1, text: "About Acme" },
        { level: 2, text: "Team" },
      ],
      bodyHtml: ABOUT_BODY,
      links: [{ href: "/", text: "Home" }],
    }),
    makeSiteSnapshot({
      url: `${BASE_URL}/contact`,
      title: "Contact Acme",
      metaDescription: "Contact the Acme team about Acme CRM.",
      headings: [
        { level: 1, text: "Contact Acme" },
      ],
      bodyHtml: CONTACT_BODY,
      links: [{ href: "/", text: "Home" }],
    }),
    makeSiteSnapshot({
      url: `${BASE_URL}/glossary`,
      title: "CRM Glossary",
      metaDescription: "Definitions of common CRM terms for teams.",
      headings: [
        { level: 1, text: "CRM Glossary" },
        { level: 2, text: "Glossary FAQ" },
      ],
      bodyHtml: GLOSSARY_BODY,
      links: [{ href: "/", text: "Home" }],
    }),
    makeSiteSnapshot({
      url: `${BASE_URL}/orphan-notes`,
      title: "Orphan Notes",
      metaDescription: "Internal CRM notes.",
      headings: [{ level: 1, text: "Orphan Notes" }],
      bodyHtml: ORPHAN_BODY,
      links: [{ href: "/", text: "Home" }],
    }),
  ];
}

/**
 * A minimal two-page site — used to verify sparse-site opportunity detection.
 */
export function makeSparseSite(): WebsiteSnapshot[] {
  return [
    makeSiteSnapshot({
      url: `${BASE_URL}/`,
      title: "Tiny Co",
      metaDescription: "Tiny Co sells widgets.",
      headings: [
        { level: 1, text: "Tiny Co" },
        { level: 2, text: "Products" },
      ],
      bodyHtml: `
        <section class="hero"><h1>Tiny Co</h1><p>Tiny Co sells widgets for everyone.</p></section>
        <section class="products"><h2>Products</h2><p>Tiny Co products include widgets and more widgets.</p></section>
      `,
      links: [{ href: "/widgets", text: "Widgets" }],
    }),
    makeSiteSnapshot({
      url: `${BASE_URL}/widgets`,
      title: "Widgets",
      metaDescription: "Tiny Co widgets.",
      headings: [{ level: 1, text: "Widgets" }],
      bodyHtml: `<section class="products"><h1>Widgets</h1><p>Widgets from Tiny Co.</p></section>`,
      links: [{ href: "/", text: "Home" }],
    }),
  ];
}
