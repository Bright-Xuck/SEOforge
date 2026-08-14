// @forge/providers-wordpress/wordpress-provider
// WordPress provider implementation.

import type {
  WordPressConnectionConfig,
  WordPressPost,
  WordPressPage,
  WordPressMedia,
  WordPressCategory,
  WordPressTag,
  WordPressSettings,
  WordPressSiteInfo,
  WordPressThemeInfo,
  CapabilityDescriptor,
  PaginatedResponse,
  WordPressRequestOptions,
  WriteOperation,
  WriteResult,
  WriteSummary,
  WriteDiff,
} from "@forge/core";
import { WordPressClient } from "./client.js";
import {
  ElementorDocumentTransport,
  ElementorTransportError,
} from "./elementor-transport.js";
import type {
  ElementorDocumentRead,
  ElementorDocumentWriteResult,
} from "./elementor-transport.js";

/**
 * WordPress provider metadata.
 */
export const WORDPRESS_PROVIDER_METADATA = {
  id: "wordpress",
  name: "WordPress Provider",
  version: "0.1.0",
  description: "WordPress REST API provider for Forge",
  supportedActions: ["read"],
  supportedPlatforms: ["wordpress"],
  supportedCapabilities: ["posts", "pages", "media", "categories", "tags", "settings"],
} as const;

/**
 * Mutable capability descriptor for detection.
 */
interface MutableCapabilityDescriptor {
  supportsMedia: boolean;
  supportsMenus: boolean;
  supportsPlugins: boolean;
  supportsCustomPostTypes: boolean;
  supportsTaxonomies: boolean;
  supportsFeaturedImages: boolean;
  supportsApplicationPasswords: boolean;
}

/**
 * WordPress provider implementation.
 * Provides read-only access to WordPress sites via REST API.
 */
export class WordPressProvider {
  readonly id = "wordpress";
  readonly name = "WordPress Provider";
  readonly version = "0.1.0";
  readonly description = "WordPress REST API provider for Forge";

  private readonly client: WordPressClient;
  private elementorTransport?: ElementorDocumentTransport;

  constructor(config: WordPressConnectionConfig) {
    this.client = new WordPressClient({
      siteUrl: config.siteUrl,
      username: config.username,
      applicationPassword: config.applicationPassword,
    });
  }

  /**
   * Lazily-created Elementor document transport (companion endpoint).
   */
  private getElementorTransport(): ElementorDocumentTransport {
    this.elementorTransport ??= new ElementorDocumentTransport(this.client);
    return this.elementorTransport;
  }

  /**
   * Test connection to WordPress site.
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getSiteInfo();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get general site information.
   */
  async getSiteInfo(): Promise<WordPressSiteInfo> {
    const [settings, themes, plugins] = await Promise.all([
      this.getSettings(),
      this.getThemes(),
      this.getPlugins(),
    ]);

    return {
      name: settings.title,
      description: settings.description,
      url: settings.url,
      home: settings.url,
      wpVersion: "",
      theme: themes[0] ?? { name: "Unknown", version: "0.0.0", stylesheet: "" },
      plugins: plugins.map((p) => ({
        name: (p.name as string) ?? "Unknown",
        version: (p.version as string) ?? "0.0.0",
        status: (p.status as string) ?? "unknown",
      })),
    };
  }

  /**
   * Get all posts.
   */
  async getPosts(options?: WordPressRequestOptions): Promise<PaginatedResponse<WordPressPost>> {
    return this.client.get<WordPressPost>("posts", options);
  }

  /**
   * Get a single post by ID.
   */
  async getPost(id: number): Promise<WordPressPost | null> {
    try {
      const result = await this.client.get<WordPressPost>(`posts/${id}`);
      return result.data[0] ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Get all pages.
   */
  async getPages(options?: WordPressRequestOptions): Promise<PaginatedResponse<WordPressPage>> {
    return this.client.get<WordPressPage>("pages", options);
  }

  /**
   * Get a single page by ID.
   */
  async getPage(id: number): Promise<WordPressPage | null> {
    try {
      const result = await this.client.get<WordPressPage>(`pages/${id}`);
      return result.data[0] ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Get all media items.
   */
  async getMedia(options?: WordPressRequestOptions): Promise<PaginatedResponse<WordPressMedia>> {
    return this.client.get<WordPressMedia>("media", options);
  }

  /**
   * Get a single media item by ID.
   */
  async getMediaItem(id: number): Promise<WordPressMedia | null> {
    try {
      const result = await this.client.get<WordPressMedia>(`media/${id}`);
      return result.data[0] ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Get site settings.
   */
  async getSettings(): Promise<WordPressSettings> {
    const result = await this.client.get<WordPressSettings>("settings");
    const settings = result.data[0];
    if (!settings) {
      throw new Error("NO_SETTINGS_RETURNED");
    }
    return settings;
  }

  /**
   * Get all categories.
   */
  async getCategories(): Promise<WordPressCategory[]> {
    const result = await this.client.get<WordPressCategory>("categories");
    return result.data;
  }

  /**
   * Get all tags.
   */
  async getTags(): Promise<WordPressTag[]> {
    const result = await this.client.get<WordPressTag>("tags");
    return result.data;
  }

  /**
   * Update a page.
   */
  async updatePage(pageId: number, payload: Record<string, unknown>): Promise<WriteResult> {
    return this.executeWrite({
      id: `page-${pageId}-${Date.now()}`,
      type: "page.update",
      resourceType: "page",
      resourceId: pageId,
      mode: "apply",
      timestamp: new Date().toISOString(),
      oldValue: await this.fetchResource("pages", pageId),
      newValue: payload,
      diffs: this.createDiffs(await this.fetchResource("pages", pageId), payload),
      summary: this.createSummary(await this.fetchResource("pages", pageId), payload, false),
    });
  }

  /**
   * Update a post.
   */
  async updatePost(postId: number, payload: Record<string, unknown>): Promise<WriteResult> {
    return this.executeWrite({
      id: `post-${postId}-${Date.now()}`,
      type: "post.update",
      resourceType: "post",
      resourceId: postId,
      mode: "apply",
      timestamp: new Date().toISOString(),
      oldValue: await this.fetchResource("posts", postId),
      newValue: payload,
      diffs: this.createDiffs(await this.fetchResource("posts", postId), payload),
      summary: this.createSummary(await this.fetchResource("posts", postId), payload, false),
    });
  }

  /**
   * Create a draft post.
   */
  async createDraft(payload: Record<string, unknown>): Promise<WriteResult> {
    const created = await this.client.post<Record<string, unknown>>("posts", { ...payload, status: "draft" });
    const resourceId = typeof created.id === "number" || typeof created.id === "string" ? created.id : `draft-${Date.now()}`;
    return this.createResult("post", resourceId, {}, created, false, true, undefined);
  }

  /**
   * Update an existing draft.
   */
  async updateDraft(postId: number, payload: Record<string, unknown>): Promise<WriteResult> {
    return this.updatePost(postId, { ...payload, status: "draft" });
  }

  /**
   * Publish a draft.
   */
  async publishDraft(postId: number): Promise<WriteResult> {
    const current = await this.fetchResource("posts", postId);
    const published = await this.client.put<Record<string, unknown>>(`posts/${postId}`, { status: "publish" });
    return this.createResult("post", postId, current, published, false, true);
  }

  /**
   * Delete a draft post.
   */
  async deleteDraft(postId: number): Promise<WriteResult> {
    const current = await this.fetchResource("posts", postId);
    await this.client.delete(`posts/${postId}`);
    return this.createResult("post", postId, current, {}, false, true);
  }

  /**
   * Update the SEO title.
   */
  async updateSeoTitle(pageId: number, title: string): Promise<WriteResult> {
    return this.updatePage(pageId, { title });
  }

  /**
   * Update the meta description.
   */
  async updateMetaDescription(pageId: number, description: string): Promise<WriteResult> {
    return this.updatePage(pageId, { excerpt: description });
  }

  /**
   * Update the slug.
   */
  async updateSlug(pageId: number, slug: string): Promise<WriteResult> {
    return this.updatePage(pageId, { slug });
  }

  /**
   * Update canonical URL.
   */
  async updateCanonical(pageId: number, canonical: string): Promise<WriteResult> {
    return this.updatePage(pageId, { canonical_url: canonical });
  }

  /**
   * Update robots directives.
   */
  async updateRobots(pageId: number, robots: Record<string, unknown>): Promise<WriteResult> {
    return this.updatePage(pageId, { robots });
  }

  /**
   * Update excerpt.
   */
  async updateExcerpt(postId: number, excerpt: string): Promise<WriteResult> {
    return this.updatePost(postId, { excerpt });
  }

  /**
   * Update image alt text.
   */
  async updateImageAlt(mediaId: number, altText: string): Promise<WriteResult> {
    return this.executeWrite({
      id: `media-alt-${mediaId}-${Date.now()}`,
      type: "media.update-alt",
      resourceType: "media",
      resourceId: mediaId,
      mode: "apply",
      timestamp: new Date().toISOString(),
      oldValue: await this.fetchResource("media", mediaId),
      newValue: { alt_text: altText },
      diffs: this.createDiffs(await this.fetchResource("media", mediaId), { alt_text: altText }),
      summary: this.createSummary(await this.fetchResource("media", mediaId), { alt_text: altText }, false),
    });
  }

  /**
   * Update image caption.
   */
  async updateImageCaption(mediaId: number, caption: string): Promise<WriteResult> {
    return this.executeWrite({
      id: `media-caption-${mediaId}-${Date.now()}`,
      type: "media.update-caption",
      resourceType: "media",
      resourceId: mediaId,
      mode: "apply",
      timestamp: new Date().toISOString(),
      oldValue: await this.fetchResource("media", mediaId),
      newValue: { caption },
      diffs: this.createDiffs(await this.fetchResource("media", mediaId), { caption }),
      summary: this.createSummary(await this.fetchResource("media", mediaId), { caption }, false),
    });
  }

  /**
   * Update image description.
   */
  async updateImageDescription(mediaId: number, description: string): Promise<WriteResult> {
    return this.executeWrite({
      id: `media-description-${mediaId}-${Date.now()}`,
      type: "media.update-description",
      resourceType: "media",
      resourceId: mediaId,
      mode: "apply",
      timestamp: new Date().toISOString(),
      oldValue: await this.fetchResource("media", mediaId),
      newValue: { description },
      diffs: this.createDiffs(await this.fetchResource("media", mediaId), { description }),
      summary: this.createSummary(await this.fetchResource("media", mediaId), { description }, false),
    });
  }

  /**
   * Update featured image.
   */
  async updateFeaturedImage(pageId: number, mediaId: number): Promise<WriteResult> {
    return this.updatePage(pageId, { featured_media: mediaId });
  }

  /**
   * Update JSON-LD.
   */
  async updateJsonLd(pageId: number, schema: Record<string, unknown>): Promise<WriteResult> {
    return this.updatePage(pageId, { json_ld: schema });
  }

  /**
   * Insert FAQ schema.
   */
  async insertFaqSchema(pageId: number, schema: Record<string, unknown>): Promise<WriteResult> {
    return this.updatePage(pageId, { faq_schema: schema });
  }

  /**
   * Insert Breadcrumb schema.
   */
  async insertBreadcrumbSchema(pageId: number, schema: Record<string, unknown>): Promise<WriteResult> {
    return this.updatePage(pageId, { breadcrumb_schema: schema });
  }

  /**
   * Update categories.
   */
  async updateCategories(postId: number, categories: number[]): Promise<WriteResult> {
    return this.updatePost(postId, { categories });
  }

  /**
   * Update tags.
   */
  async updateTags(postId: number, tags: number[]): Promise<WriteResult> {
    return this.updatePost(postId, { tags });
  }

  /**
   * Create a redirect.
   */
  async createRedirect(payload: Record<string, unknown>): Promise<WriteResult> {
    return this.executeWrite({
      id: `redirect-create-${Date.now()}`,
      type: "redirect.create",
      resourceType: "redirect",
      resourceId: `${payload.from ?? "unknown"}->${payload.to ?? "unknown"}`,
      mode: "apply",
      timestamp: new Date().toISOString(),
      oldValue: {},
      newValue: payload,
      diffs: this.createDiffs({}, payload),
      summary: this.createSummary({}, payload, true),
    });
  }

  /**
   * Update a redirect.
   */
  async updateRedirect(redirectId: string, payload: Record<string, unknown>): Promise<WriteResult> {
    return this.executeWrite({
      id: `redirect-update-${redirectId}-${Date.now()}`,
      type: "redirect.update",
      resourceType: "redirect",
      resourceId: redirectId,
      mode: "apply",
      timestamp: new Date().toISOString(),
      oldValue: {},
      newValue: payload,
      diffs: this.createDiffs({}, payload),
      summary: this.createSummary({}, payload, true),
    });
  }

  /**
   * Delete a redirect.
   */
  async deleteRedirect(redirectId: string): Promise<WriteResult> {
    return this.executeWrite({
      id: `redirect-delete-${redirectId}-${Date.now()}`,
      type: "redirect.delete",
      resourceType: "redirect",
      resourceId: redirectId,
      mode: "apply",
      timestamp: new Date().toISOString(),
      oldValue: {},
      newValue: {},
      diffs: [],
      summary: this.createSummary({}, {}, true),
    });
  }

  /**
   * Update content.
   */
  async updateContent(pageId: number, content: string): Promise<WriteResult> {
    return this.updatePage(pageId, { content });
  }

  /**
   * Replace a content section.
   */
  async replaceSection(pageId: number, sectionId: string, content: string): Promise<WriteResult> {
    return this.updatePage(pageId, { sectionId, content, operation: "replace" });
  }

  /**
   * Insert a content section.
   */
  async insertSection(pageId: number, sectionId: string, content: string): Promise<WriteResult> {
    return this.updatePage(pageId, { sectionId, content, operation: "insert" });
  }

  /**
   * Append a content section.
   */
  async appendSection(pageId: number, sectionId: string, content: string): Promise<WriteResult> {
    return this.updatePage(pageId, { sectionId, content, operation: "append" });
  }

  /**
   * Remove a content section.
   */
  async removeSection(pageId: number, sectionId: string): Promise<WriteResult> {
    return this.updatePage(pageId, { sectionId, operation: "remove" });
  }

  /**
   * Preview a write operation.
   */
  async previewWrite(operation: WriteOperation): Promise<WriteResult> {
    return this.createResult(
      operation.resourceType,
      operation.resourceId,
      operation.oldValue,
      operation.newValue,
      true,
      false,
      operation.revisionId,
      operation,
    );
  }

  /**
   * Apply a write operation.
   * Elementor-document operations are routed to the companion endpoint
   * (atomic whole-document write + verification); everything else uses the
   * standard wp/v2 REST API.
   */
  async applyWrite(operation: WriteOperation): Promise<WriteResult> {
    if (operation.resourceType === "elementor-document") {
      return this.applyElementorWrite(operation);
    }
    const endpoint = this.getEndpoint(operation.resourceType, operation.resourceId);
    const current = await this.fetchResource(operation.resourceType, operation.resourceId);
    const updated = await this.client.put<Record<string, unknown>>(endpoint, operation.newValue);
    const revisionId = await this.fetchRevisionId(operation.resourceType, operation.resourceId);
    return this.createResult(operation.resourceType, operation.resourceId, current, updated, false, true, revisionId, operation);
  }

  // ─── Elementor document read/write (Sprint 25) ──────────────────────────

  /**
   * Read an Elementor document (raw `_elementor_data` + meta) via the
   * companion endpoint. Returns null when the endpoint is unavailable.
   */
  async getElementorDocument(postId: number | string): Promise<ElementorDocumentRead | null> {
    try {
      return await this.getElementorTransport().readDocument(postId);
    } catch (error) {
      if (error instanceof ElementorTransportError) return null;
      throw error;
    }
  }

  /**
   * Write an Elementor document atomically with optimistic concurrency.
   */
  async updateElementorDocument(
    postId: number | string,
    data: string,
    expected?: { elementorVersion?: string; fingerprint?: string; modified?: string },
  ): Promise<ElementorDocumentWriteResult> {
    return this.getElementorTransport().writeDocument(postId, data, expected);
  }

  /**
   * Whether the Elementor companion endpoint is available on the site.
   */
  async isElementorAvailable(): Promise<boolean> {
    return this.getElementorTransport().isAvailable();
  }

  /**
   * Elementor-document write path: read current source, write the new source
   * atomically with optimistic concurrency, verify by re-reading, and return
   * a WriteResult whose oldValue carries the original `_elementor_data` for
   * rollback. A successful HTTP response alone is NOT sufficient — the
   * re-read must contain the written data.
   */
  private async applyElementorWrite(operation: WriteOperation): Promise<WriteResult> {
    if (operation.mode === "preview" || operation.mode === "dry-run") {
      return this.createResult(
        operation.resourceType,
        operation.resourceId,
        operation.oldValue,
        operation.newValue,
        true,
        false,
        operation.revisionId,
        operation,
      );
    }

    const transport = this.getElementorTransport();
    const current = await transport.readDocument(operation.resourceId);

    const payload = operation.newValue as Record<string, unknown>;
    const data = typeof payload.elementor_data === "string"
      ? payload.elementor_data
      : typeof payload.content === "string"
        ? payload.content
        : null;
    if (data === null) {
      throw new ElementorTransportError(
        "ELEMENTOR_INVALID_RESPONSE",
        "Elementor write operation is missing elementor_data/content payload.",
      );
    }

    const writeResult = await transport.writeDocument(operation.resourceId, data, {
      elementorVersion: current.elementorVersion,
      fingerprint: typeof payload.expectedFingerprint === "string" ? payload.expectedFingerprint : undefined,
      modified: current.modified,
    });

    // Verification: the re-read must contain the exact written data.
    if (!writeResult.reRead || writeResult.reRead.data !== data) {
      throw new ElementorTransportError(
        "ELEMENTOR_INVALID_RESPONSE",
        "Verification failed: re-read Elementor document does not match the written data.",
      );
    }

    const oldValue: Record<string, unknown> = { elementor_data: current.data };
    const newValue: Record<string, unknown> = { elementor_data: writeResult.reRead.data };
    const revisionId = await this.fetchRevisionId("pages", operation.resourceId).catch(() => undefined);

    return this.createResult(
      operation.resourceType,
      operation.resourceId,
      oldValue,
      newValue,
      false,
      true,
      revisionId,
      operation,
    );
  }

  /**
   * Rollback a write operation.
   */
  async rollbackWrite(
    resourceType: string,
    resourceId: string | number,
    originalValue: Record<string, unknown>,
    revisionId?: string,
  ): Promise<WriteResult> {
    const endpoint = this.getEndpoint(resourceType, resourceId);
    const updated = await this.client.put<Record<string, unknown>>(endpoint, originalValue);
    return this.createResult(resourceType, resourceId, updated, originalValue, false, true, revisionId);
  }

  /**
   * Detect capabilities of the WordPress site.
   */
  async detectCapabilities(): Promise<CapabilityDescriptor> {
    const capabilities: MutableCapabilityDescriptor = {
      supportsMedia: false,
      supportsMenus: false,
      supportsPlugins: false,
      supportsCustomPostTypes: false,
      supportsTaxonomies: false,
      supportsFeaturedImages: false,
      supportsApplicationPasswords: true,
    };

    // Check media support
    try {
      await this.client.get("media", { perPage: 1 });
      capabilities.supportsMedia = true;
    } catch {
      /* Media not supported */
    }

    // Check menu support (requires plugin or custom endpoint)
    try {
      await this.client.get("menu-locations");
      capabilities.supportsMenus = true;
    } catch {
      /* Menus not supported */
    }

    // Check plugins endpoint
    try {
      await this.client.get("plugins");
      capabilities.supportsPlugins = true;
    } catch {
      /* Plugins endpoint not accessible */
    }

    // Check taxonomies
    try {
      const categories = await this.client.get<WordPressCategory>("categories", { perPage: 1 });
      capabilities.supportsTaxonomies = categories.data.length > 0 || categories.totalItems > 0;
    } catch {
      /* Taxonomies not supported */
    }

    // Check if featured media is used
    try {
      const posts = await this.client.get<Record<string, unknown>>("posts", { perPage: 1 });
      if (posts.data.length > 0) {
        const post = posts.data[0];
        if (post) {
          capabilities.supportsFeaturedImages = typeof post.featured_media === "number";
        }
      }
    } catch {
      /* Featured images check failed */
    }

    return capabilities;
  }

  private async getThemes(): Promise<WordPressThemeInfo[]> {
    try {
      const result = await this.client.get<{ stylesheet: string; version: string }>("themes");
      return result.data.map((t) => ({
        name: t.stylesheet ?? "Unknown",
        version: t.version ?? "0.0.0",
        stylesheet: t.stylesheet ?? "",
      }));
    } catch {
      return [];
    }
  }

  private async getPlugins(): Promise<Record<string, unknown>[]> {
    try {
      const result = await this.client.get<Record<string, unknown>>("plugins");
      return result.data;
    } catch {
      return [];
    }
  }

  private async fetchResource(resourceType: string, resourceId: string | number): Promise<Record<string, unknown>> {
    try {
      const result = await this.client.get<Record<string, unknown>>(`${resourceType}/${resourceId}`);
      return result.data[0] ?? {};
    } catch {
      return {};
    }
  }

  private async fetchRevisionId(resourceType: string, resourceId: string | number): Promise<string | undefined> {
    try {
      const result = await this.client.get<Record<string, unknown>>(`${resourceType}/${resourceId}/revisions`, { perPage: 1 });
      const revision = result.data[0];
      const id = revision && typeof revision.id === "number" ? revision.id : undefined;
      return id === undefined ? undefined : String(id);
    } catch {
      return undefined;
    }
  }

  private getEndpoint(resourceType: string, resourceId: string | number): string {
    if (resourceType === "page" || resourceType === "pages") return `pages/${resourceId}`;
    if (resourceType === "post" || resourceType === "posts") return `posts/${resourceId}`;
    if (resourceType === "media") return `media/${resourceId}`;
    return `${resourceType}/${resourceId}`;
  }

  private createDiffs(oldValue: Record<string, unknown>, newValue: Record<string, unknown>): WriteDiff[] {
    const keys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)]);
    const diffs: WriteDiff[] = [];
    for (const key of keys) {
      const previous = oldValue[key];
      const next = newValue[key];
      if (JSON.stringify(previous) !== JSON.stringify(next)) {
        diffs.push({ field: key, oldValue: previous, newValue: next });
      }
    }
    return diffs;
  }

  private createSummary(oldValue: Record<string, unknown>, newValue: Record<string, unknown>, rollbackSupported: boolean): WriteSummary {
    const diffs = this.createDiffs(oldValue, newValue);
    return {
      totalChanges: diffs.length,
      changedFields: diffs.map((diff) => diff.field),
      preview: false,
      rollbackSupported,
    };
  }

  private createResult(
    resourceType: string,
    resourceId: string | number,
    oldValue: Record<string, unknown>,
    newValue: Record<string, unknown>,
    preview: boolean,
    applied: boolean,
    revisionId?: string,
    operation?: WriteOperation,
  ): WriteResult {
    const diffs = operation?.diffs ?? this.createDiffs(oldValue, newValue);
    return {
      operationId: operation?.id ?? `write-${resourceType}-${resourceId}-${Date.now()}`,
      providerId: this.id,
      resourceType,
      resourceId,
      timestamp: new Date().toISOString(),
      revisionId,
      oldValue,
      newValue,
      diffs,
      summary: {
        ...(operation?.summary ?? this.createSummary(oldValue, newValue, true)),
        preview,
      },
      preview,
      applied,
      message: applied ? "Write operation applied." : preview ? "Write operation previewed." : "Write operation completed.",
    };
  }

  private async executeWrite(operation: WriteOperation): Promise<WriteResult> {
    if (operation.mode === "preview" || operation.mode === "dry-run") {
      return this.createResult(
        operation.resourceType,
        operation.resourceId,
        operation.oldValue,
        operation.newValue,
        true,
        false,
        operation.revisionId,
        operation,
      );
    }

    const endpoint = this.getEndpoint(operation.resourceType, operation.resourceId);
    const updated = await this.client.put<Record<string, unknown>>(endpoint, operation.newValue);
    const revisionId = await this.fetchRevisionId(operation.resourceType, operation.resourceId);
    return this.createResult(operation.resourceType, operation.resourceId, operation.oldValue, updated, false, true, revisionId, operation);
  }
}

/**
 * Factory function to create a WordPress provider.
 */
export function createWordPressProvider(config: WordPressConnectionConfig): WordPressProvider {
  return new WordPressProvider(config);
}
