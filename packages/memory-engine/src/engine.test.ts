import { describe, expect, it } from "vitest";
import { MemoryStore } from "./index.js";

describe("memory-engine", () => {
  it("appends and summarizes memory", () => {
    const store = new MemoryStore();
    store.append({
      id: "1",
      type: "website-crawl",
      project: "buycleancart",
      timestamp: "2026-07-17T00:00:00.000Z",
      payload: { url: "https://example.com" },
    });
    expect(store.summarize("buycleancart").total).toBe(1);
    expect(store.timeline("buycleancart")).toHaveLength(1);
  });
});
