import type { MemoryEvent } from "@forge/memory-engine";
import type { MissionDefinition, MissionExecution } from "./types.js";

export function missionToMemoryEvent(project: string, mission: MissionDefinition, type: MemoryEvent["type"]): MemoryEvent {
  return {
    id: `${type}-${mission.metadata.id}`,
    type,
    project,
    timestamp: new Date().toISOString(),
    payload: {
      missionId: mission.metadata.id,
      missionName: mission.metadata.name,
      status: mission.metadata.status,
      summary: mission.summary,
    },
  };
}

export function recordMissionEvent(store: { append(event: MemoryEvent): void }, project: string, mission: MissionDefinition, type: MemoryEvent["type"]): void {
  store.append(missionToMemoryEvent(project, mission, type));
}

export function executionToMemoryEvent(project: string, mission: MissionDefinition, execution: MissionExecution): MemoryEvent {
  return {
    id: `mission-executed-${mission.metadata.id}-${execution.completedAt}`,
    type: "mission-executed",
    project,
    timestamp: execution.completedAt,
    payload: { missionId: mission.metadata.id, execution },
  };
}
