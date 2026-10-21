// @forge/providers-wordpress
// Rank Math SEO meta transport (Sprint 28).
//
// Rank Math stores its fields in private post meta that the core wp/v2 API does
// not expose. The companion plugin exposes a whitelisted GET/POST endpoint that
// reads, sanitizes, writes, and re-reads the fields server-side. This transport
// is the typed client for that endpoint.

import { WordPressClient } from "./client.js";

export const SEO_META_COMPANION_PATH = "wp-json/forge/v1/seo-meta";

export type SeoMetaField = "title" | "description" | "focusKeyword" | "canonical" | "robots";

export interface SeoMetaFields {
  readonly title?: string | null;
  readonly description?: string | null;
  readonly focusKeyword?: string | null;
  readonly canonical?: string | null;
  readonly robots?: string[] | null;
}

export interface SeoMetaRead {
  readonly postId: number;
  readonly plugin: string;
  readonly fields: SeoMetaFields;
  readonly modified?: string;
}

export interface SeoMetaWriteResult {
  readonly postId: number;
  readonly plugin: string;
  readonly written: string[];
  readonly verified: boolean;
  readonly old: SeoMetaFields;
  readonly new: SeoMetaFields;
  readonly modified?: string;
}

export class SeoMetaTransport {
  constructor(
    private readonly client: WordPressClient,
    private readonly basePath: string = SEO_META_COMPANION_PATH,
  ) {}

  async read(postId: number | string): Promise<SeoMetaRead> {
    return this.client.rawRequest<SeoMetaRead>(`${this.basePath}/${postId}`, "GET");
  }

  async write(postId: number | string, fields: SeoMetaFields): Promise<SeoMetaWriteResult> {
    return this.client.rawRequest<SeoMetaWriteResult>(`${this.basePath}/${postId}`, "POST", {
      fields,
    });
  }
}
