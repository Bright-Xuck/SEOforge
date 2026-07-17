import type { Finding } from "@forge/core";
import type { HomepageAnalysis, HomepageContext } from "./types.js";

function createFinding(
  id: string,
  title: string,
  description: string,
  severity: Finding["severity"],
  evidence: string[],
): Finding {
  return {
    id: id as Finding["id"],
    title,
    description,
    severity,
    category: "seo",
    evidence: evidence.map((detail) => ({ source: "homepage-analysis", detail })),
    confidence: 0.8,
    fixable: true,
  };
}

function readabilityScore(context: HomepageContext): number {
  const textLength = context.snapshot.rawHtml.length;
  if (textLength < 1500) return 42;
  if (textLength < 3500) return 58;
  if (textLength < 7000) return 72;
  return 66;
}

export class HomepageAnalyzer {
  analyze(context: HomepageContext): HomepageAnalysis {
    const findings: Finding[] = [];
    const contentMap = context.contentMap;
    const snapshot = context.snapshot;

    if (!snapshot.pageTitle.trim()) findings.push(createFinding("homepage.missing_title", "Missing title", "Homepage needs a title.", "critical", ["pageTitle empty"]));
    if (!snapshot.metaDescription.trim()) findings.push(createFinding("homepage.missing_meta_description", "Missing meta description", "Homepage needs a meta description.", "high", ["metaDescription empty"]));
    if (!snapshot.canonicalUrl.trim()) findings.push(createFinding("homepage.missing_canonical", "Missing canonical", "Homepage should define a canonical URL.", "medium", ["canonicalUrl empty"]));
    if (snapshot.robots.noindex) findings.push(createFinding("homepage.noindex", "Noindex homepage", "Homepage should not be noindexed.", "critical", ["robots.noindex true"]));
    if (snapshot.headings.filter((heading: { level: 1 | 2 | 3 | 4 | 5 | 6 }) => heading.level === 1).length === 0) findings.push(createFinding("homepage.missing_h1", "Missing H1", "Homepage should have an H1.", "high", ["no h1 found"]));
    if (!contentMap.hero.present) findings.push(createFinding("homepage.missing_hero", "Missing hero section", "Homepage should include a hero section.", "high", ["hero section not detected"]));
    if (!contentMap.cta.present) findings.push(createFinding("homepage.missing_cta", "Missing CTA", "Homepage should include a primary CTA.", "high", ["cta not detected"]));
    if (!contentMap.testimonials.present) findings.push(createFinding("homepage.missing_testimonials", "Missing testimonials", "Homepage should include trust signals.", "medium", ["testimonials not detected"]));
    if (!contentMap.faq.present) findings.push(createFinding("homepage.missing_faq", "Missing FAQ", "Homepage should include an FAQ section.", "medium", ["faq not detected"]));
    if (!contentMap.footer.present) findings.push(createFinding("homepage.missing_footer", "Missing footer", "Homepage should include a complete footer.", "low", ["footer not detected"]));

    const score = Math.max(0, 100 - findings.reduce((sum, finding) => sum + (finding.severity === "critical" ? 20 : finding.severity === "high" ? 12 : finding.severity === "medium" ? 6 : 2), 0));
    const bySeverity = findings.reduce<Record<string, number>>((acc, finding) => {
      acc[finding.severity] = (acc[finding.severity] ?? 0) + 1;
      return acc;
    }, {});

    return {
      url: context.siteUrl,
      analyzedAt: new Date().toISOString(),
      homepageType: context.homepageType,
      contentMap,
      findings,
      summary: {
        total: findings.length,
        bySeverity,
        score,
        readabilityScore: readabilityScore(context),
      },
    };
  }
}
