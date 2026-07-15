// @forge/plugin-registry/registry
// Central plugin registry for Forge extensions.

import type { Plugin } from "@forge/core";
import { PluginAlreadyRegisteredError, PluginNotFoundError } from "./errors.js";

/**
 * Central registry for all extensions inside Forge.
 * Supports: Capabilities, Providers, AI Providers, Reporters, Mission Plugins, Future Integrations.
 * No dynamic loading - interfaces only.
 */
export class PluginRegistry {
  private plugins = new Map<string, Plugin>();

  /**
   * Register a plugin in the registry.
   * Throws an error if a plugin with the same ID is already registered.
   */
  register(plugin: Plugin): void {
    if (this.plugins.has(plugin.id)) {
      throw new PluginAlreadyRegisteredError(plugin.id);
    }
    this.plugins.set(plugin.id, plugin);
  }

  /**
   * Unregister a plugin from the registry.
   */
  unregister(pluginId: string): void {
    this.plugins.delete(pluginId);
  }

  /**
   * Get a plugin by ID.
   * Throws an error if the plugin is not found.
   */
  get(pluginId: string): Plugin {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new PluginNotFoundError(pluginId);
    }
    return plugin;
  }

  /**
   * Check if a plugin exists in the registry.
   */
  exists(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * List all registered plugins.
   */
  list(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Clear all plugins from the registry.
   */
  clear(): void {
    this.plugins.clear();
  }

  /**
   * Get the number of registered plugins.
   */
  get size(): number {
    return this.plugins.size;
  }
}

/**
 * Global singleton registry instance.
 */
export const globalRegistry = new PluginRegistry();