import type { Strategy } from "./types.js";

function encode(value: unknown, indent = 0): string {
  const pad = "  ".repeat(indent);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return value
      .map((item) => `${pad}- ${typeof item === "object" && item !== null ? `\n${encode(item, indent + 1)}` : encode(item, 0)}`)
      .join("\n");
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return "{}";
    return entries
      .map(([key, item]) => {
        if (item && typeof item === "object") {
          return `${pad}${key}:\n${encode(item, indent + 1)}`;
        }
        return `${pad}${key}: ${encode(item, 0)}`;
      })
      .join("\n");
  }
  return JSON.stringify(value);
}

export function serializeStrategyToJson(strategy: Strategy): string {
  return JSON.stringify(strategy, null, 2);
}

export function serializeStrategyToYaml(strategy: Strategy): string {
  return encode(strategy);
}

export function deserializeStrategyFromJson(serialized: string): Strategy {
  return JSON.parse(serialized) as Strategy;
}

export function deserializeStrategyFromYaml(serialized: string): Strategy {
  const trimmed = serialized.trim();
  if (!trimmed) {
    throw new Error("Cannot deserialize empty YAML strategy.");
  }
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return JSON.parse(trimmed) as Strategy;
  }
  throw new Error("YAML import is supported for exported strategy payloads only.");
}
