import type { Agent, AgentMetadata } from "./types.js";

export class AgentRegistry {
  private agents = new Map<string, Agent>();

  register(agent: Agent): void {
    const validation = this.validate(agent);
    if (!validation.valid) {
      throw new Error(validation.issues.join("; "));
    }
    this.agents.set(agent.metadata.id, agent);
  }

  unregister(id: string): void {
    this.agents.delete(id);
  }

  list(): Agent[] {
    return [...this.agents.values()];
  }

  get(id: string): Agent {
    const agent = this.agents.get(id);
    if (!agent) throw new Error(`Agent not found: ${id}`);
    return agent;
  }

  exists(id: string): boolean {
    return this.agents.has(id);
  }

  validate(agent: Agent): { valid: boolean; issues: string[] } {
    const metadata = agent.metadata as AgentMetadata;
    const issues: string[] = [];
    if (!metadata.id) issues.push("Agent id is required");
    if (!metadata.name) issues.push("Agent name is required");
    if (!metadata.version) issues.push("Agent version is required");
    if (!metadata.description) issues.push("Agent description is required");
    if (!metadata.goal) issues.push("Agent goal is required");
    if (!metadata.supportedPipelines.length) issues.push("Agent must support at least one pipeline");
    if (!metadata.capabilities.length) issues.push("Agent must declare capabilities");
    return { valid: issues.length === 0, issues };
  }
}
