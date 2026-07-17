import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { KnowledgeGraph } from "./types.js";
import { createKnowledgeGraph, importKnowledgeGraph } from "./engine.js";

export interface ProjectStoragePaths {
  readonly rootDir: string;
  readonly projectId: string;
}

export interface ProjectStorageBundle {
  readonly knowledge: KnowledgeGraph;
  readonly memory: unknown;
  readonly timeline: unknown[];
  readonly changes: unknown[];
}

function projectDir(rootDir: string, projectId: string): string {
  return join(rootDir, projectId);
}

export async function ensureProjectStorage(rootDir: string, projectId: string): Promise<void> {
  await mkdir(projectDir(rootDir, projectId), { recursive: true });
}

export async function loadKnowledge(rootDir: string, projectId: string): Promise<KnowledgeGraph> {
  try {
    const content = await readFile(join(projectDir(rootDir, projectId), "knowledge.json"), "utf8");
    return importKnowledgeGraph(content);
  } catch {
    return createKnowledgeGraph(projectId);
  }
}

export async function saveKnowledge(rootDir: string, graph: KnowledgeGraph): Promise<void> {
  await ensureProjectStorage(rootDir, graph.project);
  await writeFile(join(projectDir(rootDir, graph.project), "knowledge.json"), JSON.stringify(graph, null, 2), "utf8");
}

export async function readProjectBundle(rootDir: string, projectId: string): Promise<ProjectStorageBundle> {
  await ensureProjectStorage(rootDir, projectId);
  const knowledge = await loadKnowledge(rootDir, projectId);
  const readJson = async <T>(fileName: string, fallback: T): Promise<T> => {
    try {
      const content = await readFile(join(projectDir(rootDir, projectId), fileName), "utf8");
      return JSON.parse(content) as T;
    } catch {
      return fallback;
    }
  };
  return {
    knowledge,
    memory: await readJson("memory.json", []),
    timeline: await readJson("timeline.json", []),
    changes: await readJson("changes.json", []),
  };
}
