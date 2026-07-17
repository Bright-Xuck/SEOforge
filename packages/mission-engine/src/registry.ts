import type { MissionTemplate } from "./types.js";
import { builtinMissionTemplates } from "./templates.js";

export class MissionRegistry {
  private readonly missions = new Map<string, MissionTemplate>();

  register(mission: MissionTemplate): void {
    this.missions.set(mission.id, mission);
  }

  unregister(id: string): boolean {
    return this.missions.delete(id);
  }

  list(): MissionTemplate[] {
    return [...this.missions.values()];
  }

  get(id: string): MissionTemplate {
    const mission = this.missions.get(id);
    if (!mission) {
      throw new Error(`Mission not found: ${id}`);
    }
    return mission;
  }

  exists(id: string): boolean {
    return this.missions.has(id);
  }

  validate(id: string): { valid: boolean; issues: string[] } {
    const mission = this.get(id);
    const issues: string[] = [];
    if (!mission.name.trim()) issues.push("Mission name is required.");
    if (!mission.version.trim()) issues.push("Mission version is required.");
    if (!mission.description.trim()) issues.push("Mission description is required.");
    return { valid: issues.length === 0, issues };
  }
}

export function createMissionRegistry(): MissionRegistry {
  const registry = new MissionRegistry();
  for (const mission of builtinMissionTemplates) {
    registry.register(mission);
  }
  return registry;
}
