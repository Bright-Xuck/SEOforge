// @forge/providers-wordpress/wordpress-plugin
// WordPress plugin registration for the plugin registry.

import type { Plugin, CapabilityManifest } from "@forge/core";
import { WORDPRESS_PROVIDER_METADATA } from "./wordpress-provider.js";

/**
 * WordPress plugin manifest.
 */
const wordpressManifest: CapabilityManifest = {
  id: "wordpress-provider",
  name: "WordPress Provider",
  version: "0.1.0",
  description: "WordPress REST API provider for Forge",
  supportedPlatforms: ["wordpress"],
  requiredTools: [],
  supportedInputs: ["credentials"],
  supportedOutputs: ["posts", "pages", "media", "categories", "tags", "settings"],
};

/**
 * WordPress plugin for registration.
 */
export const wordpressPlugin: Plugin = {
  id: "wordpress",
  name: WORDPRESS_PROVIDER_METADATA.name,
  version: WORDPRESS_PROVIDER_METADATA.version,
  description: WORDPRESS_PROVIDER_METADATA.description,
  manifest: wordpressManifest,
  supportedPlatforms: [...wordpressManifest.supportedPlatforms],
  requiredTools: [...wordpressManifest.requiredTools],
  supportedInputs: [...wordpressManifest.supportedInputs],
  supportedOutputs: [...wordpressManifest.supportedOutputs],
  supportedActions: [...WORDPRESS_PROVIDER_METADATA.supportedActions],
};

/**
 * Register the WordPress plugin with a registry.
 */
export function registerWordPressPlugin(registry: { register: (plugin: Plugin) => void }): void {
  registry.register(wordpressPlugin);
}