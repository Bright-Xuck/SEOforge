import type { SkillDefinition } from "./types.js";

export class SkillRegistry {
  private skills = new Map<string, SkillDefinition>();

  register(skill: SkillDefinition): void {
    this.skills.set(skill.id, skill);
  }

  get(id: string): SkillDefinition {
    const skill = this.skills.get(id);
    if (!skill) throw new Error(`Skill not found: ${id}`);
    return skill;
  }

  list(): SkillDefinition[] {
    return [...this.skills.values()];
  }
}
