// @forge/dom-engine
// Elementor nested settings paths (Sprint 25).
// Some Elementor controls are nested objects (e.g. image widget: settings.image.alt).
// This module provides deterministic get/set-by-path helpers so the mutator
// never reconstructs unknown data — it only touches the targeted leaf.

/**
 * Schema of nested setting paths per widget type.
 * settingsKey (human label) → path into `settings`.
 */
export const ELEMENTOR_NESTED_SETTING_PATHS: Record<string, Record<string, string[]>> = {
  image: {
    alt: ["image", "alt"],
  },
};

/**
 * Resolve the settings path for a (widgetType, settingsKey) pair.
 * Defaults to the top-level key.
 */
export function resolveElementorSettingPath(widgetType: string | undefined, settingsKey: string): string[] {
  if (!widgetType) return [settingsKey];
  const nested = ELEMENTOR_NESTED_SETTING_PATHS[widgetType];
  if (!nested) return [settingsKey];
  return nested[settingsKey] ?? [settingsKey];
}

/**
 * Read a value from settings by path (deep).
 */
export function getNestedSetting(settings: Record<string, unknown>, path: string[]): unknown {
  let current: unknown = settings;
  for (const key of path) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/**
 * Write a value into settings by path (deep), creating intermediate objects
 * only where the schema permits. Returns a new settings object (immutable).
 */
export function setNestedSetting(
  settings: Record<string, unknown>,
  path: string[],
  value: unknown,
): Record<string, unknown> {
  if (path.length === 0) return settings;
  const cloned: Record<string, unknown> = { ...settings };
  let current: Record<string, unknown> = cloned;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (key === undefined) break;
    const existing = current[key];
    const next = typeof existing === "object" && existing !== null ? { ...(existing as Record<string, unknown>) } : {};
    current[key] = next;
    current = next;
  }
  const leaf = path[path.length - 1];
  if (leaf !== undefined) current[leaf] = value;
  return cloned;
}
