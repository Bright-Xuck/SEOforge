// @forge/content-intelligence
// Deterministic topic extraction from headings and significant terms.
// NO AI.

import type { Topic, WebsiteSnapshot } from "../types.js";

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "your", "are", "was", "were", "have", "has",
  "will", "can", "our", "you", "all", "any", "out", "use", "how", "what", "when", "why", "who", "more",
  "than", "then", "they", "them", "their", "there", "here", "into", "over", "about", "not", "but", "its",
  "his", "her", "one", "two", "get", "got", "new", "now", "off", "per", "via", "www", "com", "http", "https",
]);

export function extractTopics(snapshot: WebsiteSnapshot): Topic[] {
  const headingText = snapshot.headings.map((heading) => heading.text).join(" ");
  const bodyText = stripHtml(snapshot.rawHtml);
  const corpus = `${snapshot.pageTitle} ${snapshot.metaDescription} ${headingText} ${bodyText}`.toLowerCase();

  const counts = new Map<string, number>();
  const words = corpus.split(/[^a-z0-9]+/i).filter((word) => word.length > 2 && !STOP_WORDS.has(word.toLowerCase()));

  for (const word of words) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  // Headings weigh more.
  for (const heading of snapshot.headings) {
    for (const word of heading.text.toLowerCase().split(/[^a-z0-9]+/i)) {
      if (word.length > 2 && !STOP_WORDS.has(word)) {
        counts.set(word, (counts.get(word) ?? 0) + 2);
      }
    }
  }

  const total = [...counts.values()].reduce((sum, value) => sum + value, 0) || 1;

  const topics: Topic[] = [...counts.entries()]
    .filter(([, occurrences]) => occurrences >= 3)
    .map(([term, occurrences]) => ({
      term,
      occurrences,
      weight: Number((occurrences / total).toFixed(4)),
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 20);

  return topics;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}
