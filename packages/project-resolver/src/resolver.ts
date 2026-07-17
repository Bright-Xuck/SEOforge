import { ForgeError } from "@forge/core";
import type { ProjectResolutionInput, ProjectResolutionResult, ProviderProjectContext, WorkspaceProjectConfig } from "./types.js";

function normalizeProjectId(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function resolveProjectFromWorkspace(workspace: WorkspaceProjectConfig | null | undefined): string | undefined {
  return normalizeProjectId(workspace?.projectId ?? workspace?.project);
}

export function resolveProjectFromProvider(provider: ProviderProjectContext | null | undefined): string | undefined {
  return normalizeProjectId(provider?.projectId ?? provider?.project ?? provider?.siteUrl ?? provider?.currentWebsiteUrl);
}

export function resolveProject(input: ProjectResolutionInput): ProjectResolutionResult {
  const explicit = normalizeProjectId(input.project);
  if (explicit) return { project: explicit, source: "cli" };

  const workspace = resolveProjectFromWorkspace(input.workspace);
  if (workspace) return { project: workspace, source: "workspace" };

  const provider = resolveProjectFromProvider(input.provider);
  if (provider) return { project: provider, source: "provider" };

  const website = normalizeProjectId(input.currentWebsiteUrl);
  if (website) return { project: website, source: "website" };

  throw new ForgeError(
    "PROJECT_RESOLUTION_FAILED",
    "Unable to resolve the active project. Provide an explicit project, configure the workspace, connect a provider, or supply the current website URL.",
  );
}
