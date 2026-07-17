export interface SnapshotLike {
  readonly pages?: string[];
  readonly title?: string;
  readonly metadata?: Record<string, unknown>;
  readonly headings?: string[];
  readonly images?: string[];
  readonly internalLinks?: string[];
  readonly schemas?: string[];
  readonly provider?: string[];
}

export interface ChangeReport {
  readonly detectedAt: string;
  readonly newPages: string[];
  readonly removedPages: string[];
  readonly titleChanges: string[];
  readonly metadataChanges: string[];
  readonly headingChanges: string[];
  readonly imageChanges: string[];
  readonly internalLinkChanges: string[];
  readonly schemaChanges: string[];
  readonly providerChanges: string[];
}

function diffList(current: readonly string[] = [], previous: readonly string[] = []): { added: string[]; removed: string[] } {
  const currentSet = new Set(current);
  const previousSet = new Set(previous);
  return {
    added: [...currentSet].filter((item) => !previousSet.has(item)),
    removed: [...previousSet].filter((item) => !currentSet.has(item)),
  };
}

export function detectChanges(current: SnapshotLike, previous: SnapshotLike): ChangeReport {
  const pages = diffList(current.pages, previous.pages);
  const metadata = current.metadata ?? {};
  const previousMetadata = previous.metadata ?? {};
  return {
    detectedAt: new Date().toISOString(),
    newPages: pages.added,
    removedPages: pages.removed,
    titleChanges: current.title !== previous.title ? [previous.title ?? "", current.title ?? ""] : [],
    metadataChanges: JSON.stringify(metadata) === JSON.stringify(previousMetadata) ? [] : ["metadata changed"],
    headingChanges: JSON.stringify(current.headings ?? []) === JSON.stringify(previous.headings ?? []) ? [] : ["headings changed"],
    imageChanges: diffList(current.images, previous.images).added.concat(diffList(current.images, previous.images).removed),
    internalLinkChanges: diffList(current.internalLinks, previous.internalLinks).added.concat(diffList(current.internalLinks, previous.internalLinks).removed),
    schemaChanges: diffList(current.schemas, previous.schemas).added.concat(diffList(current.schemas, previous.schemas).removed),
    providerChanges: diffList(current.provider, previous.provider).added.concat(diffList(current.provider, previous.provider).removed),
  };
}
