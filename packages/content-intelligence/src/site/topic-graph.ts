// @forge/content-intelligence
// Deterministic topic graph (Sprint 24).
// Built from existing extracted topics/entities and URL structure.
// NO LLM. Heuristic confidence is explicitly labeled.

import type {
  SiteTopic,
  TopicEdge,
  TopicGraph,
  TopicGraphEdge,
  SiteContentModel,
} from "./types.js";

const MAX_RELATED = 10;
const MAX_ASSOCIATED_ENTITIES = 5;

/**
 * Build the deterministic topic graph from the site content model.
 *
 * Relationships derived:
 * - related             → topics co-occurring on the same pages
 * - supporting          → a topic whose pages are a strict subset of another's
 * - parent / child      → term inclusion and URL path structure
 * - associated-entity   → entities co-occurring with the topic
 *
 * Confidence is a deterministic heuristic (co-occurrence counts, subset
 * overlap), never semantic AI confidence.
 */
export function buildTopicGraph(model: SiteContentModel, minOccurrences = 2): TopicGraph {
  const topicTerms = model.topics
    .filter((topic) => topic.occurrences >= minOccurrences)
    .map((topic) => topic.term);

  const pagesByTopic = new Map<string, string[]>();
  for (const topic of topicTerms) {
    const pages: string[] = [];
    for (const page of model.pages) {
      if (page.topics.some((t) => t.term.toLowerCase() === topic.toLowerCase())) {
        pages.push(page.url);
      }
    }
    if (pages.length > 0) {
      pagesByTopic.set(topic, pages);
    }
  }

  const terms = [...pagesByTopic.keys()];
  const topics: SiteTopic[] = [];

  for (const term of terms) {
    const aggregated = model.topics.find((t) => t.term === term);
    const pages = pagesByTopic.get(term) ?? [];
    const related = findRelated(term, pages, pagesByTopic);
    const supporting = findSupporting(term, pages, pagesByTopic);
    const { parent, children } = findHierarchy(term, pages, pagesByTopic);
    const entities = findAssociatedEntities(pages, model.pageLookup);
    const methods = new Set<string>(["co-occurrence"]);
    if (parent) methods.add("term-inclusion");
    if (children.length > 0) methods.add("url-path");
    if (entities.length > 0) methods.add("entity-association");

    topics.push({
      term,
      weight: aggregated?.weight ?? 0,
      occurrences: aggregated?.occurrences ?? 0,
      pageCount: pages.length,
      pages,
      relatedTopics: related.slice(0, MAX_RELATED),
      supportingTopics: supporting.slice(0, MAX_RELATED),
      parentTopic: parent,
      childTopics: children,
      associatedEntities: entities.slice(0, MAX_ASSOCIATED_ENTITIES),
      confidence: confidenceFor(methods, pages.length),
      method: [...methods],
    });
  }

  const byTerm: Record<string, SiteTopic> = {};
  for (const topic of topics) {
    byTerm[topic.term] = topic;
  }

  const edges: TopicGraphEdge[] = [];
  for (const topic of topics) {
    for (const edge of topic.relatedTopics) {
      edges.push({ source: topic.term, target: edge.term, kind: "related", strength: edge.strength });
    }
    for (const edge of topic.supportingTopics) {
      edges.push({ source: topic.term, target: edge.term, kind: "supporting", strength: edge.strength });
    }
    if (topic.parentTopic) {
      edges.push({ source: topic.term, target: topic.parentTopic, kind: "parent", strength: 1 });
    }
    for (const child of topic.childTopics) {
      edges.push({ source: topic.term, target: child, kind: "child", strength: 1 });
    }
    for (const entity of topic.associatedEntities) {
      edges.push({ source: topic.term, target: entity, kind: "associated-entity", strength: 0.6 });
    }
  }

  return { topics, topicCount: topics.length, byTerm, edges };
}

function findRelated(
  term: string,
  pages: string[],
  pagesByTopic: Map<string, string[]>,
): TopicEdge[] {
  const edges: TopicEdge[] = [];
  for (const [otherTerm, otherPages] of pagesByTopic) {
    if (otherTerm === term) continue;
    const shared = pages.filter((page) => otherPages.includes(page)).length;
    if (shared === 0) continue;
    const strength = shared / Math.min(pages.length, otherPages.length);
    edges.push({ term: otherTerm, strength: round(strength) });
  }
  return edges.sort((a, b) => b.strength - a.strength);
}

function findSupporting(
  term: string,
  pages: string[],
  pagesByTopic: Map<string, string[]>,
): TopicEdge[] {
  const edges: TopicEdge[] = [];
  for (const [otherTerm, otherPages] of pagesByTopic) {
    if (otherTerm === term) continue;
    const isStrictSubset =
      otherPages.length < pages.length && otherPages.every((page) => pages.includes(page));
    if (!isStrictSubset) continue;
    edges.push({ term: otherTerm, strength: round(otherPages.length / pages.length) });
  }
  return edges.sort((a, b) => b.strength - a.strength);
}

interface Hierarchy {
  readonly parent?: string;
  readonly children: string[];
}

function findHierarchy(
  term: string,
  pages: string[],
  pagesByTopic: Map<string, string[]>,
): Hierarchy {
  const children: string[] = [];
  let parent: string | undefined;
  const termLower = term.toLowerCase();

  // Term inclusion: a shorter whole-word term that shares pages is the parent.
  for (const [otherTerm, otherPages] of pagesByTopic) {
    if (otherTerm === term) continue;
    const otherLower = otherTerm.toLowerCase();
    if (otherLower.length >= termLower.length) continue;
    if (hasWordBoundary(termLower, otherLower)) {
      if (pages.some((page) => otherPages.includes(page))) {
        parent = otherTerm;
        break;
      }
    }
  }

  // URL path: a page path segment matching another topic marks it as a child.
  for (const [otherTerm, otherPages] of pagesByTopic) {
    if (otherTerm === term) continue;
    const otherLower = otherTerm.toLowerCase();
    for (const page of otherPages) {
      const path = pathSegments(page);
      if (path.some((segment) => segment === otherLower) && pages.includes(page)) {
        children.push(otherTerm);
        break;
      }
    }
  }

  return { parent, children: [...new Set(children)] };
}

function findAssociatedEntities(
  pages: string[],
  pagesByUrl: Record<string, SiteContentModel["pages"][number]>,
): string[] {
  const counts = new Map<string, number>();
  for (const pageUrl of pages) {
    const page = pagesByUrl[pageUrl];
    if (!page) continue;
    for (const entity of page.entities) {
      const key = entity.value;
      counts.set(key, (counts.get(key) ?? 0) + entity.occurrences);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([value]) => value);
}

function confidenceFor(methods: Set<string>, pageCount: number): number {
  let confidence = 0.5;
  if (pageCount >= 3) confidence = 0.8;
  else if (pageCount === 2) confidence = 0.65;
  if (methods.has("term-inclusion") || methods.has("url-path")) confidence += 0.05;
  if (methods.has("entity-association")) confidence += 0.05;
  return round(Math.min(0.95, confidence));
}

function hasWordBoundary(haystack: string, needle: string): boolean {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, "i").test(haystack);
}

function pathSegments(url: string): string[] {
  try {
    return new URL(url).pathname.split("/").filter(Boolean).map((segment) => segment.toLowerCase());
  } catch {
    return [];
  }
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
