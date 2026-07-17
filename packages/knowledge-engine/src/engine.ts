import type { KnowledgeGraph, KnowledgePatch } from "./types.js";

function cloneList(values?: readonly string[]): string[] {
  return [...(values ?? [])];
}

export function createKnowledgeGraph(project: string): KnowledgeGraph {
  const timestamp = new Date().toISOString();
  return {
    project,
    products: [],
    services: [],
    competitors: [],
    languages: [],
    websiteStructure: [],
    contentCategories: [],
    primaryKeywords: [],
    secondaryKeywords: [],
    businessGoals: [],
    providerInformation: [],
    installedPlugins: [],
    taxonomies: [],
    schemas: [],
    version: { version: 1, createdAt: timestamp, updatedAt: timestamp },
  };
}

export function updateKnowledgeGraph(graph: KnowledgeGraph, patch: KnowledgePatch): KnowledgeGraph {
  return {
    ...graph,
    ...patch,
    products: cloneList(patch.products ?? graph.products),
    services: cloneList(patch.services ?? graph.services),
    competitors: cloneList(patch.competitors ?? graph.competitors),
    languages: cloneList(patch.languages ?? graph.languages),
    websiteStructure: cloneList(patch.websiteStructure ?? graph.websiteStructure),
    contentCategories: cloneList(patch.contentCategories ?? graph.contentCategories),
    primaryKeywords: cloneList(patch.primaryKeywords ?? graph.primaryKeywords),
    secondaryKeywords: cloneList(patch.secondaryKeywords ?? graph.secondaryKeywords),
    businessGoals: cloneList(patch.businessGoals ?? graph.businessGoals),
    providerInformation: cloneList(patch.providerInformation ?? graph.providerInformation),
    installedPlugins: cloneList(patch.installedPlugins ?? graph.installedPlugins),
    taxonomies: cloneList(patch.taxonomies ?? graph.taxonomies),
    schemas: cloneList(patch.schemas ?? graph.schemas),
    version: {
      version: graph.version.version + 1,
      createdAt: graph.version.createdAt,
      updatedAt: new Date().toISOString(),
    },
  };
}

export function mergeKnowledgeGraphs(base: KnowledgeGraph, incoming: KnowledgeGraph): KnowledgeGraph {
  return updateKnowledgeGraph(base, {
    brand: incoming.brand ?? base.brand,
    industry: incoming.industry ?? base.industry,
    products: Array.from(new Set([...base.products, ...incoming.products])),
    services: Array.from(new Set([...base.services, ...incoming.services])),
    competitors: Array.from(new Set([...base.competitors, ...incoming.competitors])),
    targetAudience: incoming.targetAudience ?? base.targetAudience,
    brandVoice: incoming.brandVoice ?? base.brandVoice,
    languages: Array.from(new Set([...base.languages, ...incoming.languages])),
    websiteStructure: Array.from(new Set([...base.websiteStructure, ...incoming.websiteStructure])),
    contentCategories: Array.from(new Set([...base.contentCategories, ...incoming.contentCategories])),
    primaryKeywords: Array.from(new Set([...base.primaryKeywords, ...incoming.primaryKeywords])),
    secondaryKeywords: Array.from(new Set([...base.secondaryKeywords, ...incoming.secondaryKeywords])),
    businessGoals: Array.from(new Set([...base.businessGoals, ...incoming.businessGoals])),
    providerInformation: Array.from(new Set([...base.providerInformation, ...incoming.providerInformation])),
    installedPlugins: Array.from(new Set([...base.installedPlugins, ...incoming.installedPlugins])),
    taxonomies: Array.from(new Set([...base.taxonomies, ...incoming.taxonomies])),
    schemas: Array.from(new Set([...base.schemas, ...incoming.schemas])),
    mediaInventorySummary: incoming.mediaInventorySummary ?? base.mediaInventorySummary,
  });
}

export function exportKnowledgeGraph(graph: KnowledgeGraph): string {
  return JSON.stringify(graph, null, 2);
}

export function importKnowledgeGraph(serialized: string): KnowledgeGraph {
  return JSON.parse(serialized) as KnowledgeGraph;
}
