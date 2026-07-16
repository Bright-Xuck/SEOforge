// @forge/providers-wordpress
// WordPress provider for Forge.

export { WordPressClient } from "./client.js";
export { WordPressProvider, createWordPressProvider, WORDPRESS_PROVIDER_METADATA } from "./wordpress-provider.js";
export { wordpressPlugin, registerWordPressPlugin } from "./wordpress-plugin.js";
export type {
  WordPressConnectionConfig,
  WordPressPost,
  WordPressPage,
  WordPressMedia,
  WordPressCategory,
  WordPressTag,
  WordPressSettings,
  WordPressSiteInfo,
  WordPressThemeInfo,
  WordPressPluginInfo,
  CapabilityDescriptor,
  IWordPressProvider,
} from "@forge/core";