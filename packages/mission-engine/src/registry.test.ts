import { describe, expect, it } from "vitest";
import { createMissionRegistry } from "./index.js";

describe("MissionRegistry", () => {
  it("registers builtin missions", () => {
    const registry = createMissionRegistry();
    expect(registry.list().length).toBeGreaterThan(0);
    expect(registry.exists("weekly-optimization")).toBe(true);
  });
});
