export interface KnowledgeVersion {
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface KnowledgeGraph {
  readonly project: string;
  readonly brand?: string;
  readonly industry?: string;
  readonly products: string[];
  readonly services: string[];
  readonly competitors: string[];
  readonly targetAudience?: string;
  readonly brandVoice?: string;
  readonly languages: string[];
  readonly websiteStructure: string[];
  readonly contentCategories: string[];
  readonly primaryKeywords: string[];
  readonly secondaryKeywords: string[];
  readonly businessGoals: string[];
  readonly providerInformation: string[];
  readonly installedPlugins: string[];
  readonly taxonomies: string[];
  readonly schemas: string[];
  readonly mediaInventorySummary?: string;
  readonly version: KnowledgeVersion;
}

export interface KnowledgePatch {
  readonly brand?: string;
  readonly industry?: string;
  readonly products?: string[];
  readonly services?: string[];
  readonly competitors?: string[];
  readonly targetAudience?: string;
  readonly brandVoice?: string;
  readonly languages?: string[];
  readonly websiteStructure?: string[];
  readonly contentCategories?: string[];
  readonly primaryKeywords?: string[];
  readonly secondaryKeywords?: string[];
  readonly businessGoals?: string[];
  readonly providerInformation?: string[];
  readonly installedPlugins?: string[];
  readonly taxonomies?: string[];
  readonly schemas?: string[];
  readonly mediaInventorySummary?: string;
}
