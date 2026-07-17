import type { MissionDefinition, MissionTemplate } from "./types.js";

export function serializeMissionToJson(mission: MissionDefinition | MissionTemplate): string {
  return JSON.stringify(mission, null, 2);
}

export function serializeMissionToYaml(mission: MissionDefinition | MissionTemplate): string {
  return serializeMissionToJson(mission);
}

export function deserializeMissionFromJson(serialized: string): MissionDefinition | MissionTemplate {
  return JSON.parse(serialized) as MissionDefinition | MissionTemplate;
}

export function deserializeMissionFromYaml(serialized: string): MissionDefinition | MissionTemplate {
  const trimmed = serialized.trim();
  if (!trimmed) throw new Error("Cannot deserialize empty mission payload.");
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return JSON.parse(trimmed) as MissionDefinition | MissionTemplate;
  throw new Error("YAML import is supported for exported mission payloads only.");
}
