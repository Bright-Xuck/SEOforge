// @forge/plugin-registry/registry.test
// Unit tests for the plugin registry.

import { describe, it, expect, beforeEach } from "vitest";
import { PluginRegistry } from "./registry.js";
import { PluginAlreadyRegisteredError, PluginNotFoundError } from "./errors.js";
import type { CapabilityManifest } from "@forge/core";

// Mock plugin with required manifest
const createMockPlugin = (id: string) => ({
  id,
  name: `Plugin ${id}`,
  version: "1.0.0",
  description: `Test plugin ${id}`,
  manifest: {
    id,
    name: `Plugin ${id}`,
    version: "1.0.0",
    description: `Test plugin ${id}`,
    supportedPlatforms: [],
    requiredTools: [],
    supportedInputs: [],
    supportedOutputs: [],
  } as CapabilityManifest,
  supportedPlatforms: [],
  requiredTools: [],
  supportedInputs: [],
  supportedOutputs: [],
});

describe("PluginRegistry", () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    registry = new PluginRegistry();
  });

  describe("register()", () => {
    it("registers a plugin successfully", () => {
      const plugin = createMockPlugin("test.plugin");
      registry.register(plugin);

      expect(registry.size).toBe(1);
      expect(registry.exists("test.plugin")).toBe(true);
    });

    it("throws error when registering duplicate plugin ID", () => {
      const plugin = createMockPlugin("test.plugin");
      registry.register(plugin);

      expect(() => registry.register(plugin)).toThrow(PluginAlreadyRegisteredError);
      expect(() => registry.register(plugin)).toThrow('Plugin with ID "test.plugin" is already registered.');
    });

    it("registers multiple plugins with unique IDs", () => {
      registry.register(createMockPlugin("plugin.one"));
      registry.register(createMockPlugin("plugin.two"));
      registry.register(createMockPlugin("plugin.three"));

      expect(registry.size).toBe(3);
    });
  });

  describe("unregister()", () => {
    it("unregisters an existing plugin", () => {
      const plugin = createMockPlugin("test.plugin");
      registry.register(plugin);
      registry.unregister("test.plugin");

      expect(registry.size).toBe(0);
      expect(registry.exists("test.plugin")).toBe(false);
    });

    it("does not throw when unregistering non-existent plugin", () => {
      expect(() => registry.unregister("nonexistent.plugin")).not.toThrow();
    });
  });

  describe("get()", () => {
    it("returns a registered plugin", () => {
      const plugin = createMockPlugin("test.plugin");
      registry.register(plugin);

      const retrieved = registry.get("test.plugin");
      expect(retrieved).toEqual(plugin);
    });

    it("throws error for non-existent plugin", () => {
      expect(() => registry.get("nonexistent.plugin")).toThrow(PluginNotFoundError);
      expect(() => registry.get("nonexistent.plugin")).toThrow(
        'Plugin with ID "nonexistent.plugin" not found.',
      );
    });
  });

  describe("exists()", () => {
    it("returns true for registered plugin", () => {
      const plugin = createMockPlugin("test.plugin");
      registry.register(plugin);

      expect(registry.exists("test.plugin")).toBe(true);
    });

    it("returns false for non-existent plugin", () => {
      expect(registry.exists("nonexistent.plugin")).toBe(false);
    });
  });

  describe("list()", () => {
    it("returns empty array when no plugins registered", () => {
      const list = registry.list();
      expect(list).toEqual([]);
    });

    it("returns all registered plugins", () => {
      const plugin1 = createMockPlugin("plugin.one");
      const plugin2 = createMockPlugin("plugin.two");

      registry.register(plugin1);
      registry.register(plugin2);

      const list = registry.list();
      expect(list).toHaveLength(2);
      expect(list).toContainEqual(plugin1);
      expect(list).toContainEqual(plugin2);
    });
  });

  describe("clear()", () => {
    it("removes all plugins", () => {
      registry.register(createMockPlugin("plugin.one"));
      registry.register(createMockPlugin("plugin.two"));
      registry.clear();

      expect(registry.size).toBe(0);
      expect(registry.list()).toEqual([]);
    });
  });
});