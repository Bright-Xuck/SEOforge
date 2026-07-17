import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { MemoryStore } from "./engine.js";
import type { MemoryEvent } from "./types.js";

function projectDir(rootDir: string, projectId: string): string {
  return join(rootDir, projectId);
}

export async function ensureProjectMemory(rootDir: string, projectId: string): Promise<void> {
  await mkdir(projectDir(rootDir, projectId), { recursive: true });
}

export async function loadMemory(rootDir: string, projectId: string): Promise<MemoryStore> {
  const store = new MemoryStore();
  try {
    const content = await readFile(join(projectDir(rootDir, projectId), "memory.json"), "utf8");
    const events = JSON.parse(content) as MemoryEvent[];
    for (const event of events) store.append(event);
  } catch {
    return store;
  }
  return store;
}

export async function saveMemory(rootDir: string, projectId: string, store: MemoryStore): Promise<void> {
  await ensureProjectMemory(rootDir, projectId);
  await writeFile(join(projectDir(rootDir, projectId), "memory.json"), JSON.stringify(store.timeline(projectId), null, 2), "utf8");
}
