import type { HomepageContentMap, HomepageContext, HomepageType } from "./types.js";
import type { WebsiteSnapshot } from "@forge/core";

function hasWord(text: string, pattern: string): boolean {
  return text.toLowerCase().includes(pattern.toLowerCase());
}

function makeSection(kind: HomepageContentMap[keyof HomepageContentMap]["kind"], present: boolean, evidence: string[], confidence: number) {
  return { kind, present, evidence, confidence } as const;
}

export class HomepageDetector {
  detectType(snapshot: WebsiteSnapshot, siteUrl: string): HomepageType {
    const url = new URL(snapshot.finalUrl || siteUrl);
    const path = url.pathname.replace(/\/+$/, "");
    const body = `${snapshot.pageTitle} ${snapshot.metaDescription} ${snapshot.rawHtml}`.toLowerCase();

    if (path === "" || path === "/") return "front-page";
    if (path === "/blog" || hasWord(body, "blog")) return "blog-homepage";
    if (hasWord(body, "store") || hasWord(body, "shop") || hasWord(body, "cart")) return "store-homepage";
    if (hasWord(body, "wordpress")) return "wordpress-front-page";
    if (path === "/home" || path === "/homepage") return "static-homepage";
    return "unknown";
  }

  detectContentMap(snapshot: WebsiteSnapshot): HomepageContentMap {
    const html = snapshot.rawHtml.toLowerCase();
    const headingText = snapshot.headings.map((heading) => heading.text).join(" ");
    const text = `${snapshot.pageTitle} ${snapshot.metaDescription} ${headingText}`.toLowerCase();
    return {
      hero: makeSection("hero", /<section[^>]*hero|hero/i.test(html) || hasWord(text, "hero"), ["hero"], 0.7),
      benefits: makeSection("benefits", hasWord(text, "benefit"), ["benefits"], 0.6),
      features: makeSection("features", hasWord(text, "feature"), ["features"], 0.6),
      testimonials: makeSection("testimonials", hasWord(text, "testimonial"), ["testimonials"], 0.7),
      faq: makeSection("faq", hasWord(text, "faq") || snapshot.jsonLd.some((item: Record<string, unknown>) => JSON.stringify(item).toLowerCase().includes("question")), ["faq"], 0.7),
      cta: makeSection("cta", hasWord(text, "sign up") || hasWord(text, "get started") || hasWord(text, "contact"), ["cta"], 0.6),
      footer: makeSection("footer", html.includes("<footer"), ["footer"], 0.9),
    };
  }

  detectContext(project: string, snapshot: WebsiteSnapshot, siteUrl: string, projectProfile: HomepageContext["projectProfile"]): HomepageContext {
    const contentMap = this.detectContentMap(snapshot);
    return {
      project,
      projectProfile,
      knowledge: projectProfile.knowledge,
      memorySummary: projectProfile.memorySummary,
      siteUrl,
      snapshot,
      homepageType: this.detectType(snapshot, siteUrl),
      contentMap,
    };
  }
}
