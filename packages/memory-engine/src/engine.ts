import type { MemoryEvent, MemoryFilter, MemorySummary } from "./types.js";

export class MemoryStore {
  private events: MemoryEvent[] = [];

  append(event: MemoryEvent): void {
    this.events.push(event);
  }

  query(filter: MemoryFilter = {}): MemoryEvent[] {
    return this.events.filter((event) => {
      if (filter.type && event.type !== filter.type) return false;
      if (filter.from && event.timestamp < filter.from) return false;
      if (filter.to && event.timestamp > filter.to) return false;
      if (filter.contains) {
        const haystack = JSON.stringify(event.payload);
        if (!haystack.includes(filter.contains)) return false;
      }
      return true;
    });
  }

  filter(filter: MemoryFilter = {}): MemoryEvent[] {
    return this.query(filter);
  }

  summarize(project: string): MemorySummary {
    const projectEvents = this.events.filter((event) => event.project === project);
    const byType: Record<string, number> = {};
    for (const event of projectEvents) {
      byType[event.type] = (byType[event.type] ?? 0) + 1;
    }
    return {
      project,
      total: projectEvents.length,
      byType,
      lastEventAt: projectEvents.at(-1)?.timestamp,
    };
  }

  timeline(project: string): MemoryEvent[] {
    return this.events.filter((event) => event.project === project).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }
}
