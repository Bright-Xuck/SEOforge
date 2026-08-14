// @forge/content-intelligence
// Site-level content opportunities (Sprint 24).
// EXTENDS the existing page-level gap detection (`detectGaps`) with site-level
// opportunities. Every opportunity references the underlying PageDNA / quality
// / section findings where possible. This is not a second gap engine.

import type {
  SiteAuthorityScores,
  SiteContentModel,
  SiteOpportunity,
  SiteOpportunityKind,
  TopicCluster,
  RefreshCandidate,
  InternalLinkOpportunity,
  OpportunityReference,
} from "./types.js";

export interface OpportunityOptions {
  readonly knowledge?: { readonly products?: string[]; readonly services?: string[] };
}

const USE_CASE_TERMS = ["use case", "use-case", "scenario", "example"];
const THIN_WORD_THRESHOLD = 300;

/**
 * Detect site-level content opportunities from the site content model,
 * topic clusters, authority scores, refresh candidates and internal link
 * opportunities. Page-level gaps remain owned by `detectGaps`.
 */
export function detectSiteOpportunities(
  model: SiteContentModel,
  clusters: TopicCluster[],
  authority: SiteAuthorityScores,
  refreshCandidates: RefreshCandidate[],
  linkOpportunities: InternalLinkOpportunity[],
  options: OpportunityOptions = {},
): SiteOpportunity[] {
  const opportunities: SiteOpportunity[] = [];
  let index = 0;

  const add = (
    kind: SiteOpportunityKind,
    title: string,
    description: string,
    priority: SiteOpportunity["priority"],
    evidence: string[],
    relatedPages: string[],
    references: OpportunityReference[],
    estimatedImpact: string,
  ): void => {
    index += 1;
    opportunities.push({
      id: `opp-${kind}-${index}`,
      kind,
      title,
      description,
      priority,
      evidence,
      relatedPages: [...new Set(relatedPages)],
      references,
      estimatedImpact,
    });
  };

  // ─── Cluster-level coverage opportunities ─────────────────────────
  for (const cluster of clusters) {
    const clusterRefs: OpportunityReference[] = cluster.pages.map((pageUrl) => ({
      pageUrl,
      field: "cluster.pages",
      value: cluster.id,
    }));

    if (!cluster.pillarPage) {
      add(
        "missing-pillar-coverage",
        `Missing pillar coverage for "${cluster.primaryTopic}"`,
        `Cluster "${cluster.primaryTopic}" has ${cluster.pages.length} pages but no dedicated pillar page consolidating the topic.`,
        cluster.pages.length >= 2 ? "high" : "medium",
        [`pages=${cluster.pages.length}`, "no pillar page identified"],
        cluster.pages,
        clusterRefs,
        `Creating a pillar page for "${cluster.primaryTopic}" could consolidate topical authority.`,
      );
    }

    if (cluster.coverageScore < 60) {
      add(
        "weak-topic-coverage",
        `Weak topic coverage for "${cluster.primaryTopic}"`,
        `Cluster coverage score is ${cluster.coverageScore}/100 — content is thin or missing key sections.`,
        cluster.coverageScore < 40 ? "high" : "medium",
        [`coverage score=${cluster.coverageScore}`, `site topical coverage=${authority.topicalCoverage}`, `missing=${cluster.missingCoverage.join(", ") || "none"}`],
        cluster.pages,
        clusterRefs,
        `Deepening coverage for "${cluster.primaryTopic}" could strengthen topical authority.`,
      );
    }

    if (cluster.supportingPages.length < 2) {
      add(
        "missing-supporting-content",
        `Missing supporting content for "${cluster.primaryTopic}"`,
        `Only ${cluster.supportingPages.length} supporting page(s) back the "${cluster.primaryTopic}" cluster.`,
        cluster.supportingPages.length === 0 ? "medium" : "low",
        [`supporting pages=${cluster.supportingPages.length}`],
        cluster.pages,
        clusterRefs,
        `Adding supporting articles for "${cluster.primaryTopic}" would deepen coverage.`,
      );
    }

    for (const section of cluster.missingCoverage) {
      if (section === "faq") {
        add(
          "missing-faq",
          `Missing FAQ content for "${cluster.primaryTopic}"`,
          `No page in the "${cluster.primaryTopic}" cluster contains an FAQ section.`,
          "medium",
          ["cluster.missingCoverage includes faq"],
          cluster.pages,
          clusterRefs,
          `Adding an FAQ for "${cluster.primaryTopic}" could capture question-based queries.`,
        );
      } else if (section === "comparison") {
        add(
          "missing-comparison",
          `Missing comparison content for "${cluster.primaryTopic}"`,
          `No comparison content found in the "${cluster.primaryTopic}" cluster.`,
          "low",
          ["cluster.missingCoverage includes comparison"],
          cluster.pages,
          clusterRefs,
          `A comparison page could capture consideration-stage traffic for "${cluster.primaryTopic}".`,
        );
      } else if (section === "buying-guide") {
        add(
          "missing-buying-guide",
          `Missing buying guide for "${cluster.primaryTopic}"`,
          `No buying-guide content found in the "${cluster.primaryTopic}" cluster.`,
          "low",
          ["cluster.missingCoverage includes buying-guide"],
          cluster.pages,
          clusterRefs,
          `A buying guide could support consideration-stage users for "${cluster.primaryTopic}".`,
        );
      }
    }

    const hasUseCase = cluster.pages.some((pageUrl) => {
      const page = model.pageLookup[pageUrl];
      if (!page) return false;
      const haystack = `${page.title} ${page.topics.map((t) => t.term).join(" ")}`.toLowerCase();
      return USE_CASE_TERMS.some((term) => haystack.includes(term));
    });
    if (!hasUseCase && cluster.pages.length >= 2) {
      add(
        "missing-use-case",
        `Missing use-case content for "${cluster.primaryTopic}"`,
        `No page in the "${cluster.primaryTopic}" cluster frames the topic through concrete use cases.`,
        "low",
        ["no use-case terms in cluster pages"],
        cluster.pages,
        clusterRefs,
        `Use-case content for "${cluster.primaryTopic}" could capture long-tail queries.`,
      );
    }
  }

  // ─── Glossary opportunity (site-level) ─────────────────────────────
  const knownProductTerms = [
    ...(options.knowledge?.products ?? []),
    ...(options.knowledge?.services ?? []),
  ];
  const hasGlossary = model.pages.some((page) =>
    /glossary/i.test(`${page.url} ${page.title}`),
  );
  if (!hasGlossary && (knownProductTerms.length > 0 || model.entities.length >= 10)) {
    add(
      "missing-glossary",
      "Missing glossary content",
      "The site has substantial entity/product vocabulary but no glossary page.",
      "low",
      [`known terms=${knownProductTerms.length || model.entities.length}`, "no glossary page detected"],
      model.pages.map((page) => page.url),
      [],
      "A glossary page could capture definitional queries and support entity coverage.",
    );
  }

  // ─── Page-level opportunities (composed from existing findings) ────
  for (const candidate of refreshCandidates) {
    if (candidate.priority !== "high") continue;
    add(
      "outdated-page",
      `Outdated content: ${pageTitle(model, candidate.pageUrl)}`,
      `Page shows ${candidate.reasons.length} refresh signals.`,
      "medium",
      candidate.evidence,
      [candidate.pageUrl],
      candidate.reasons.map((reason) => ({
        pageUrl: candidate.pageUrl,
        field: `refresh.${reason}`,
        value: true,
      })),
      candidate.estimatedImpact,
    );
  }

  for (const page of model.pages) {
    if (page.quality.contentDepth.score < 50) {
      add(
        "thin-page",
        `Thin content: ${page.title}`,
        `Page has ${page.quality.contentDepth.wordCount} words and a content depth score of ${page.quality.contentDepth.score}/100.`,
        page.quality.contentDepth.wordCount < THIN_WORD_THRESHOLD ? "high" : "medium",
        [`words=${page.quality.contentDepth.wordCount}`, `depth score=${page.quality.contentDepth.score}`],
        [page.url],
        [
          { pageUrl: page.url, field: "quality.contentDepth.score", value: page.quality.contentDepth.score },
          { pageUrl: page.url, field: "dna.contentLength", value: page.contentLength },
        ],
        `Expanding "${page.title}" could improve relevance for its topics.`,
      );
    }
  }

  for (const link of linkOpportunities) {
    if (link.kind === "orphan-page" || link.kind === "weakly-connected-page") {
      const page = link.targetPage ? model.pageLookup[link.targetPage] : undefined;
      add(
        "weakly-connected-page",
        `Weakly connected page: ${page?.title ?? link.targetPage ?? "unknown"}`,
        link.description,
        link.priority,
        link.evidence,
        link.targetPage ? [link.targetPage] : [],
        link.targetPage
          ? [
              { pageUrl: link.targetPage, field: `links.${link.kind}`, value: true },
              { pageUrl: link.targetPage, field: "links.inbound", value: model.inboundLinks[link.targetPage] ?? 0 },
            ]
          : [],
        `Improving internal links to this page could distribute topical authority.`,
      );
    }
  }

  // Order: high → medium → low, deterministic within priority.
  return opportunities.sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority));
}

function pageTitle(model: SiteContentModel, pageUrl: string): string {
  return model.pageLookup[pageUrl]?.title ?? pageUrl;
}

function priorityWeight(priority: SiteOpportunity["priority"]): number {
  return priority === "high" ? 3 : priority === "medium" ? 2 : 1;
}
