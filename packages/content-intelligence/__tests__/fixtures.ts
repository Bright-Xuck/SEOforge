// @forge/content-intelligence
// Shared test fixtures. No network, no AI.

import type { WebsiteSnapshot } from "@forge/core";

export function makeSnapshot(partial: Partial<WebsiteSnapshot> = {}): WebsiteSnapshot {
  return {
    originalUrl: "https://example.com",
    finalUrl: "https://example.com",
    statusCode: 200,
    pageTitle: "Example Product",
    metaDescription: "A great product for your needs.",
    canonicalUrl: "https://example.com",
    language: "en",
    charset: "utf-8",
    favicon: "/favicon.ico",
    robots: { noindex: false, nofollow: false, index: true, follow: true },
    headings: [
      { level: 1, text: "Example Product" },
      { level: 2, text: "Features" },
      { level: 2, text: "Pricing" },
    ],
    images: [{ src: "/hero.png", alt: "Hero" }],
    links: [
      { href: "/features", text: "Features", isInternal: true },
      { href: "https://other.com", text: "Partner", isInternal: false },
    ],
    scripts: [],
    stylesheets: [],
    jsonLd: [{ "@type": "Product", name: "Example Product" }],
    openGraph: { title: "Example Product" },
    twitterCard: { title: "Example Product" },
    rawHtml: "<!doctype html><html><head><title>Example Product</title></head><body></body></html>",
    ...partial,
  };
}

export const SAMPLE_HTML = `
<!doctype html>
<html lang="en">
<head>
  <title>Acme CRM - Best CRM Software for Teams</title>
  <meta name="description" content="Acme CRM helps teams manage customers and close deals faster.">
  <script type="application/ld+json">{"@type":"Product","name":"Acme CRM"}</script>
</head>
<body>
  <nav class="main-menu"><a href="/">Home</a></nav>
  <section class="hero"><h1>Acme CRM</h1><p>Best CRM software for your team.</p><a class="cta" href="/signup">Get Started</a></section>
  <section class="features"><h2>Features</h2><ul><li>Contact management</li><li>Deal tracking</li></ul></section>
  <section class="pricing"><h2>Pricing</h2><p>Plans from $9 per month.</p></section>
  <section class="testimonials"><h2>Testimonials</h2><p>What our customers say about Acme CRM.</p></section>
  <section class="faq"><h2>FAQ</h2><p>Frequently asked questions about Acme CRM.</p></section>
  <footer class="site-footer"><p>Copyright Acme</p></footer>
</body>
</html>
`;

export function makeRichSnapshot(): WebsiteSnapshot {
  return makeSnapshot({
    pageTitle: "Acme CRM - Best CRM Software for Teams",
    metaDescription: "Acme CRM helps teams manage customers and close deals faster.",
    rawHtml: SAMPLE_HTML,
    headings: [
      { level: 1, text: "Acme CRM" },
      { level: 2, text: "Features" },
      { level: 2, text: "Pricing" },
      { level: 2, text: "Testimonials" },
      { level: 2, text: "FAQ" },
    ],
    jsonLd: [{ "@type": "Product", name: "Acme CRM" }],
  });
}
