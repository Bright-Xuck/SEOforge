// @forge/plugin-registry
// Central registry for all extensions inside Forge.

export { PluginRegistry, globalRegistry } from "./registry.js";
export { PluginAlreadyRegisteredError, PluginNotFoundError } from "./errors.js";
export type { Plugin, CapabilityManifest } from "@forge/core";
