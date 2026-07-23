import type { ContentPatchRef, PatchGraph, PatchNode, PatchEdge } from './types.js';
import { PRIORITY_RANK } from './types.js';

/**
 * Section-level dependency mapping for inference.
 * If Hero changes, CTA likely needs review. If FAQ changes, Schema likely needs review.
 */
const SECTION_INFERENCE_MAP: Record<string, string[]> = {
  hero: ["cta", "benefits", "testimonials"],
  benefits: ["cta"],
  cta: [],
  faq: ["schema", "footer"],
  footer: [],
  schema: [],
  content: [],
  "product-grid": ["cta"],
  testimonials: [],
  form: [],
  nav: [],
  meta: [],
  canonical: [],
};

export class PatchDAG {
  private nodes: Map<string, PatchNode> = new Map();
  private edges: PatchEdge[] = [];
  private inferenceEnabled: boolean;

  constructor(inferenceEnabled = true) {
    this.inferenceEnabled = inferenceEnabled;
  }

  /**
   * Add a patch to the graph.
   * Explicit dependencies (from ContentPatchRef.dependencies) are always the source of truth.
   * Inference is optional and only adds dependencies when no explicit dep exists for that relationship.
   */
  addPatch(patch: ContentPatchRef, inferDependencies = false): void {
    if (this.nodes.has(patch.id)) {
      throw new Error(`Patch already exists: ${patch.id}`);
    }

    // Step 1: Start with explicit dependencies (source of truth)
    let dependencies = [...(patch.dependencies || [])];

    // Step 2: Optionally infer additional dependencies
    // Rule: Never infer if explicit already exists for that section relationship
    if (this.inferenceEnabled && inferDependencies) {
      dependencies = this.mergeInferredDependencies(patch, dependencies);
    }

    // Validate: no self-dependencies
    if (dependencies.includes(patch.id)) {
      throw new Error(`Self-dependency detected: ${patch.id}`);
    }

    const newNode: PatchNode = {
      id: patch.id,
      patch,
      dependents: [],
      dependencies,
    };

    this.nodes.set(patch.id, newNode);

    // Step 3: Register edges for resolved dependencies
    for (const depId of dependencies) {
      if (!this.nodes.has(depId) && depId !== patch.id) {
        // Dependency may not exist yet — allow forward references for DAG building
        // but validate at execution time
        continue;
      }
      if (depId !== patch.id) {
        const depNode = this.nodes.get(depId);
        if (depNode) {
          depNode.dependents.push(patch.id);
        }
        this.edges.push({ from: depId, to: patch.id });
      }
    }
  }

  /**
   * Merge inferred dependencies while respecting the rule:
   * Never infer if explicit already exists for that section relationship.
   * Never create circular dependencies.
   */
  private mergeInferredDependencies(patch: ContentPatchRef, explicitDeps: string[]): string[] {
    const inferred = this.inferDependencies(patch.section, explicitDeps, patch.id);
    const merged = [...explicitDeps];

    for (const depId of inferred) {
      // Rule: Never infer if explicit already exists
      if (merged.includes(depId)) continue;
      // Rule: Never create circular dependencies
      if (this.wouldCreateCycle(patch.id, depId)) continue;
      merged.push(depId);
    }

    return merged;
  }

  /**
   * Infer probable dependencies from section type.
   * E.g., a CTA patch likely depends on Hero changes.
   * Only returns dependencies that make structural sense.
   */
  private inferDependencies(section: string, explicitDeps: string[], patchId: string): string[] {
    const lowerSection = section.toLowerCase();
    const inferredDeps: string[] = [];

    // Check if this section has dependents mapped
    for (const [sourceSection, dependentSections] of Object.entries(SECTION_INFERENCE_MAP)) {
      if (dependentSections.includes(lowerSection)) {
        // This patch's section is a dependent of sourceSection
        // Find patches in the graph whose section matches sourceSection
        for (const [nodeId, node] of this.nodes) {
          if (nodeId === patchId) continue;
          if (node.patch.section.toLowerCase() === sourceSection) {
            // Only infer if not already explicitly declared
            if (!explicitDeps.includes(nodeId)) {
              inferredDeps.push(nodeId);
            }
          }
        }
      }
    }

    // If this patch modifies a section that others depend on, add those downstream deps
    // E.g., if Hero changes, any patches on CTA should depend on the Hero patch
    if (SECTION_INFERENCE_MAP[lowerSection]) {
      const downstreamSections = SECTION_INFERENCE_MAP[lowerSection];
      for (const [nodeId, node] of this.nodes) {
        if (nodeId === patchId) continue;
        if (downstreamSections.includes(node.patch.section.toLowerCase())) {
          // The downstream patch should depend on this one — but that's their edge, not ours
          // We only add edges for the patch being added
        }
      }
    }

    return inferredDeps;
  }

  /**
   * Check if adding depId as a dependency of patchId would create a cycle.
   */
  private wouldCreateCycle(patchId: string, depId: string): boolean {
    // Quick check: if depId transitively depends on patchId already
    const visited = new Set<string>();
    const queue = [depId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === patchId) return true;
      if (visited.has(current)) continue;
      visited.add(current);
      const node = this.nodes.get(current);
      if (node) {
        queue.push(...node.dependencies);
      }
    }
    return false;
  }

  hasCycle(): boolean {
    const visited = new Set<string>();
    const inStack = new Set<string>();

    for (const id of this.nodes.keys()) {
      if (this.detectCycle(id, visited, inStack)) return true;
    }
    return false;
  }

  private detectCycle(nodeId: string, visited: Set<string>, inStack: Set<string>): boolean {
    if (inStack.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;

    visited.add(nodeId);
    inStack.add(nodeId);

    const node = this.nodes.get(nodeId);
    if (node) {
      for (const depId of node.dependencies) {
        if (this.detectCycle(depId, visited, inStack)) return true;
      }
    }

    inStack.delete(nodeId);
    return false;
  }

  topSort(): string[] {
    if (this.nodes.size === 0) return [];
    if (this.hasCycle()) {
      throw new Error("Circular dependency detected in patch graph");
    }

    const sorted: string[] = [];
    const visited = new Set<string>();

    // Process by priority: critical (0), high (1), medium (2), low (3)
    const priorities: number[] = [0, 1, 2, 3];

    for (const priority of priorities) {
      for (const [id] of this.nodes) {
        const node = this.nodes.get(id);
        if (node && PRIORITY_RANK[node.patch.priority] === priority && !visited.has(id)) {
          this.traverse(id, visited, sorted);
        }
      }
    }

    // Handle any remaining (safety net)
    for (const [id] of this.nodes) {
      if (!visited.has(id)) {
        this.traverse(id, visited, sorted);
      }
    }

    return sorted;
  }

  private traverse(id: string, visited: Set<string>, sorted: string[]): void {
    if (visited.has(id)) return;
    visited.add(id);

    const node = this.nodes.get(id);
    if (node) {
      // First traverse dependencies (they must execute first)
      for (const depId of node.dependencies) {
        if (this.nodes.has(depId)) {
          this.traverse(depId, visited, sorted);
        }
      }
      sorted.push(id);
    }
  }

  getNode(id: string): PatchNode | undefined {
    return this.nodes.get(id);
  }

  getGraph(): PatchGraph {
    return {
      nodes: new Map(this.nodes),
      edges: [...this.edges],
    };
  }

  getExecutionOrder(): string[] {
    return this.topSort();
  }

  getLeafNodes(): string[] {
    const result: string[] = [];
    for (const [id, node] of this.nodes) {
      if (node.dependents.length === 0) {
        result.push(id);
      }
    }
    return result;
  }

  getRootNodes(): string[] {
    const result: string[] = [];
    for (const [id, node] of this.nodes) {
      if (node.dependencies.length === 0) {
        result.push(id);
      }
    }
    return result;
  }

  getDependents(id: string): string[] {
    return this.nodes.get(id)?.dependents ?? [];
  }

  getDependencies(id: string): string[] {
    return this.nodes.get(id)?.dependencies ?? [];
  }

  clear(): void {
    this.nodes.clear();
    this.edges = [];
  }
}