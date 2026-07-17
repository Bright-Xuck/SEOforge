import { describe, expect, it } from "vitest";
import { resolveProject, resolveProjectFromProvider, resolveProjectFromWorkspace } from "./index.js";

describe("ProjectResolver", () => {
  it("prefers explicit project ids", () => {
    expect(resolveProject({ project: "cli-project" }).project).toBe("cli-project");
  });

  it("resolves from workspace config before provider", () => {
    expect(resolveProjectFromWorkspace({ projectId: "workspace-project" })).toBe("workspace-project");
    expect(resolveProject({ workspace: { projectId: "workspace-project" }, provider: { project: "provider-project" } }).project).toBe("workspace-project");
  });

  it("resolves from provider context", () => {
    expect(resolveProjectFromProvider({ siteUrl: "example.com" })).toBe("example.com");
  });

  it("fails without any project signal", () => {
    expect(() => resolveProject({})).toThrow(/Unable to resolve the active project/);
  });
});
