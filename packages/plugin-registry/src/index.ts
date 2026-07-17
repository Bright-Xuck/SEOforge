// @forge/plugin-registry
// Central registry for all extensions inside Forge.

export { PluginRegistry, globalRegistry } from "./registry.js";
export { PluginAlreadyRegisteredError, PluginNotFoundError } from "./errors.js";
export { PipelineRegistry } from "./pipeline-registry.js";
export { PipelineNotFoundError, PipelineStepNotFoundError, PipelineValidationError } from "./pipeline-errors.js";
export type { Plugin, CapabilityManifest } from "@forge/core";
export type { PipelineRegistryEntry, PipelineStepRegistryEntry } from "./pipeline-types.js";
