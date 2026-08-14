// @forge/content-intelligence
// Internal link opportunities (Sprint 24).
// Outputs opportunities ONLY. No links are modified — the existing
// Optimization Composer / Review / Execution architecture handles changes.

import type {
  InternalLinkOpportunity,
  InternalLinkOpportunityKind,
  SiteContentModel,
  TopicCluster,
} from "./types.js";

/**
 * Detect internal link opportunities:
 * - orphan pages
 * - weakly connected pages
 * - missing contextual links (pages sharing topics but not linked)
 * - missing hub → supporting links
 * - missing supporting → pillar links
 * - relevant cross-cluster links (clusters sharing entities)
 */
export function detectInternalLinkOpportunities(
  model: SiteContentModel,
  clusters: TopicCluster[],
): InternalLinkOpportunity[] {
  const opportunities: InternalLinkOpportunity[] = [];
  const seen = new Set<string>();

  const add = (
    kind: InternalLinkOpportunityKind,
    source: string | undefined,
    target: string | undefined,
    description: string,
    evidence: string[],
    priority: InternalLinkOpportunity["priority"],
  ): void => {
    const key = `${kind}:${source ?? ""}:${target ?? ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    opportunities.push({
      id: `link-${opportunities.length + 1}`,
      kind,
      sourcePage: source,
      targetPage: target,
      description,
      evidence,
      priority,
    });
  };

  // Orphan / weakly connected pages.
  for (const page of model.pages) {
    if (pathIsHome(page.url)) continue;
    const inbound = model.inboundLinks[page.url] ?? 0;
    const outbound = model.pageToPageLinks[page.url]?.length ?? 0;
    if (inbound === 0) {
      add(
        "orphan-page",
        undefined,
        page.url,
        `"${page.title}" has no inbound internal links from other site pages.`,
        [`inbound links=0`, `outbound page links=${outbound}`],
        outbound === 0 ? "high" : "medium",
      );
    } else if (inbound + outbound < 2) {
      add(
        "weakly-connected-page",
        undefined,
        page.url,
        `"${page.title}" has very few internal connections (${inbound} in, ${outbound} out).`,
        [`inbound=${inbound}`, `outbound=${outbound}`],
        "medium",
      );
    }
  }

  // Hub → supporting and supporting → pillar links within clusters.
  for (const cluster of clusters) {
    const pillar = cluster.pillarPage;
    if (!pillar) continue;
    const pillarLinks = model.pageToPageLinks[pillar] ?? [];
    for (const supporting of cluster.supportingPages) {
      if (!pillarLinks.includes(supporting)) {
        add(
          "missing-hub-to-supporting-link",
          pillar,
          supporting,
          `Cluster "${cluster.primaryTopic}" pillar does not link to supporting page.`,
          [`pillar=${pillar}`, `supporting=${supporting}`],
          "medium",
        );
      }
      const supportingLinks = model.pageToPageLinks[supporting] ?? [];
      if (!supportingLinks.includes(pillar)) {
        add(
          "missing-supporting-to-pillar-link",
          supporting,
          pillar,
          `Supporting page does not link back to cluster pillar.`,
          [`supporting=${supporting}`, `pillar=${pillar}`],
          "low",
        );
      }
    }
  }

  // Missing contextual links: pages sharing ≥2 topics but not linked.
  const pages = model.pages;
  for (let i = 0; i < pages.length; i += 1) {
    const a = pages[i];
    if (!a) continue;
    for (let j = i + 1; j < pages.length; j += 1) {
      const b = pages[j];
      if (!b) continue;
      if (a.url === b.url) continue;
      const shared = sharedTopicTerms(a, b);
      if (shared.length < 2) continue;
      const aLinksB = model.pageToPageLinks[a.url]?.includes(b.url) ?? false;
      const bLinksA = model.pageToPageLinks[b.url]?.includes(a.url) ?? false;
      if (aLinksB || bLinksA) continue;
      add(
        "missing-contextual-link",
        a.url,
        b.url,
        `Pages share topics (${shared.join(", ")}) but are not linked.`,
        [`shared topics=${shared.length}`],
        "low",
      );
    }
  }

  // Relevant cross-cluster links: clusters sharing an entity.
  for (let i = 0; i < clusters.length; i += 1) {
    const a = clusters[i];
    if (!a) continue;
    for (let j = i + 1; j < clusters.length; j += 1) {
      const b = clusters[j];
      if (!b) continue;
      const sharedEntities = sharedClusterEntities(a, b, model);
      if (sharedEntities.length === 0) continue;
      const pillarA = a.pillarPage;
      const pillarB = b.pillarPage;
      if (!pillarA || !pillarB) continue;
      const aLinksB = model.pageToPageLinks[pillarA]?.includes(pillarB) ?? false;
      const bLinksA = model.pageToPageLinks[pillarB]?.includes(pillarA) ?? false;
      if (aLinksB || bLinksA) continue;
      add(
        "relevant-cross-cluster-link",
        pillarA,
        pillarB,
        `Clusters "${a.primaryTopic}" and "${b.primaryTopic}" share entities (${sharedEntities.join(", ")}) — a cross-link would reinforce topical authority.`,
        [`shared entities=${sharedEntities.length}`],
        "low",
      );
    }
  }

  return opportunities;
}

function sharedTopicTerms(a: SiteContentModel["pages"][number], b: SiteContentModel["pages"][number]): string[] {
  const bTerms = new Set(b.topics.map((topic) => topic.term.toLowerCase()));
  return a.topics
    .map((topic) => topic.term)
    .filter((term) => bTerms.has(term.toLowerCase()));
}

function sharedClusterEntities(a: TopicCluster, b: TopicCluster, model: SiteContentModel): string[] {
  const entitiesA = new Set<string>();
  for (const pageUrl of a.pages) {
    const page = model.pageLookup[pageUrl];
    if (!page) continue;
    for (const entity of page.entities) entitiesA.add(entity.value.toLowerCase());
  }
  const shared = new Set<string>();
  for (const pageUrl of b.pages) {
    const page = model.pageLookup[pageUrl];
    if (!page) continue;
    for (const entity of page.entities) {
      if (entitiesA.has(entity.value.toLowerCase())) shared.add(entity.value);
    }
  }
  return [...shared];
}

function pathIsHome(url: string): boolean {
  try {
    return new URL(url).pathname === "/" || new URL(url).pathname === "";
  } catch {
    return false;
  }
}
