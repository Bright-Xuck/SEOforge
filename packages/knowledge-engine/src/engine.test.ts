import { describe, expect, it } from "vitest";
import { createKnowledgeGraph, updateKnowledgeGraph, mergeKnowledgeGraphs, exportKnowledgeGraph, importKnowledgeGraph } from "./index.js";

describe("knowledge-engine", () => {
  it("creates and updates a graph", () => {
    const graph = createKnowledgeGraph("project-a");
    const updated = updateKnowledgeGraph(graph, { brand: "Forge", products: ["A"] });
    expect(updated.brand).toBe("Forge");
    expect(updated.products).toEqual(["A"]);
    expect(updated.version.version).toBe(2);
  });

  it("merges graphs", () => {
    const base = createKnowledgeGraph("project-a");
    const incoming = updateKnowledgeGraph(base, { products: ["A"], languages: ["en"] });
    const merged = mergeKnowledgeGraphs(base, incoming);
    expect(merged.products).toEqual(["A"]);
    expect(merged.languages).toEqual(["en"]);
  });

  it("exports and imports json", () => {
    const graph = createKnowledgeGraph("project-a");
    expect(importKnowledgeGraph(exportKnowledgeGraph(graph)).project).toBe("project-a");
  });
});
