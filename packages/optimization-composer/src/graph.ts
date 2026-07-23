import type { ContentPatchRef, PatchGraph, PatchNode, PatchEdge } from './types.js';
import { PRIORITY_RANK } from './types.js';

export class PatchDAG {
  private nodes: Map<string, PatchNode> = new Map();
  private edges: PatchEdge[] = [];

  addPatch(patch: ContentPatchRef): void {
    const dependencies = patch.dependencies || [];
    if (this.nodes.has(patch.id)) {
      throw new Error(`Patch already exists: ${patch.id}`);
    }

    const newNode: PatchNode = {
      id: patch.id,
      patch,
      dependents: [],
      dependencies,
    };

    this.nodes.set(patch.id, newNode);

    for (const depId of dependencies) {
      if (depId === patch.id) {
        throw new Error(`Self-dependency detected: ${patch.id}`);
      }
      if (!this.nodes.has(depId)) {
        throw new Error(`Dependency not found: ${depId}, needed by ${patch.id}`);
      }
      this.nodes.get(depId)!.dependents.push(patch.id);
      this.edges.push({ from: depId, to: patch.id });
    }
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
      for (const depId of node.dependencies) {
        this.traverse(depId, visited, sorted);
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