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
} from "@forge/core";
import { WordPressClient } from "./client.js";

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

  constructor(config: WordPressConnectionConfig) {
    this.client = new WordPressClient({
      siteUrl: config.siteUrl,
      username: config.username,
      applicationPassword: config.applicationPassword,
    });
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
}

/**
 * Factory function to create a WordPress provider.
 */
export function createWordPressProvider(config: WordPressConnectionConfig): WordPressProvider {
  return new WordPressProvider(config);
}