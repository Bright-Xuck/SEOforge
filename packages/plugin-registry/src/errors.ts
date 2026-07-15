// @forge/plugin-registry/errors
// Registry-specific error types.

/**
 * Error thrown when attempting to register a plugin with a duplicate ID.
 */
export class PluginAlreadyRegisteredError extends Error {
  public readonly pluginId: string;

  constructor(pluginId: string) {
    super(`Plugin with ID "${pluginId}" is already registered.`);
    this.name = "PluginAlreadyRegisteredError";
    this.pluginId = pluginId;
  }
}

/**
 * Error thrown when a plugin is not found in the registry.
 */
export class PluginNotFoundError extends Error {
  public readonly pluginId: string;

  constructor(pluginId: string) {
    super(`Plugin with ID "${pluginId}" not found.`);
    this.name = "PluginNotFoundError";
    this.pluginId = pluginId;
  }
}