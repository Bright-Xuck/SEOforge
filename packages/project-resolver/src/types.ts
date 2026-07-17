export interface WorkspaceProjectConfig {
  readonly project?: string;
  readonly projectId?: string;
  readonly currentWebsiteUrl?: string;
}

export interface ProviderProjectContext {
  readonly project?: string;
  readonly projectId?: string;
  readonly siteUrl?: string;
  readonly currentWebsiteUrl?: string;
}

export interface ProjectResolutionInput {
  readonly project?: string;
  readonly workspace?: WorkspaceProjectConfig | null;
  readonly provider?: ProviderProjectContext | null;
  readonly currentWebsiteUrl?: string | null;
}

export interface ProjectResolutionResult {
  readonly project: string;
  readonly source: "cli" | "workspace" | "provider" | "website";
}
