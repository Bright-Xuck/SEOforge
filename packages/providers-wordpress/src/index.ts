// @forge/providers-wordpress
// WordPress provider for Forge.

export { WordPressClient } from "./client.js";
export { WordPressProvider, createWordPressProvider, WORDPRESS_PROVIDER_METADATA } from "./wordpress-provider.js";
export { wordpressPlugin, registerWordPressPlugin } from "./wordpress-plugin.js";
export {
  ElementorDocumentTransport,
  ElementorTransportError,
  ELEMENTOR_COMPANION_PATH,
  ELEMENTOR_SYSTEM_PATH,
} from "./elementor-transport.js";
export type {
  ElementorTransportErrorCode,
  ElementorDocumentRead,
  ElementorDocumentWriteResult,
  ElementorSystemStatus,
} from "./elementor-transport.js";
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