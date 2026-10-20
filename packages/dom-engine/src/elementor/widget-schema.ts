// @forge/dom-engine
// Elementor widget schema: maps widget types to settings keys (Sprint 21).
// Sprint 25: adds rich-text awareness and conservative widget coverage.
//
// The bridge must NOT guess: unknown widget types or unknown controls must
// resolve to `unsupported`, never a best-effort settings key.

export const ELEMENTOR_WIDGET_SCHEMA: Record<string, Record<string, string>> = {
  heading: {
    "heading-text": "title",
    default: "title",
  },
  button: {
    "button-text": "text",
    "button-link": "link",
    default: "text",
  },
  "text-editor": {
    "text-content": "editor",
    default: "editor",
  },
  image: {
    "image-alt": "alt",
    "image-caption": "caption",
    default: "image",
  },
  "text-path": {
    "text-content": "text",
    default: "text",
  },
  icon: {
    "icon-text": "text",
    default: "text",
  },
  "icon-list": {
    "icon-list-text": "text",
    default: "text",
  },
  video: {
    "video-url": "video_url",
    default: "video_url",
  },
  divider: {
    "divider-text": "text",
    default: "text",
  },
  spacer: {
    "spacer-height": "height",
    default: "height",
  },
  columns: {
    default: "columns",
  },
};

/**
 * Widget types whose content is plain text (no markup may be injected).
 */
export const ELEMENTOR_PLAIN_TEXT_WIDGETS: Record<string, string[]> = {
  button: ["text"],
  "text-path": ["text"],
  icon: ["text"],
  "icon-list": ["text"],
  image: ["alt", "caption"],
  video: ["video_url"],
  divider: ["text"],
  spacer: ["height"],
};

/**
 * Settings that expect rich text (inline markup + block content) per widget type.
 * heading.title supports inline HTML; text-editor.editor is the canonical rich
 * text control; accordion/tabs content controls accept rich text.
 */
export const ELEMENTOR_RICH_TEXT_SETTINGS: Record<string, string[]> = {
  heading: ["title"],
  "text-editor": ["editor"],
};

/**
 * Whether a given (widgetType, settingsKey) control expects rich text.
 */
export function isElementorRichTextSetting(widgetType: string | undefined, settingsKey: string): boolean {
  if (!widgetType) return false;
  const rich = ELEMENTOR_RICH_TEXT_SETTINGS[widgetType];
  if (!rich) return false;
  return rich.includes(settingsKey);
}

/**
 * Whether a given (widgetType, settingsKey) control expects plain text.
 */
export function isElementorPlainTextSetting(widgetType: string | undefined, settingsKey: string): boolean {
  if (!widgetType) return false;
  const plain = ELEMENTOR_PLAIN_TEXT_WIDGETS[widgetType];
  if (!plain) return false;
  return plain.includes(settingsKey);
}

/**
 * Widget types explicitly declared UNSUPPORTED for content patching.
 * These widgets embed code/templates/third-party content — patching their
 * settings could break the page, so the bridge refuses rather than guessing.
 */
export const ELEMENTOR_UNSUPPORTED_WIDGETS = new Set([
  "html",
  "shortcode",
  "template",
  "loop-grid",
  "loop-carousel",
  "form",
  "nav-menu",
  "popup",
  "google_maps",
  "maps",
  "lottie",
  "code-highlight",
]);

/**
 * Resolve the settings key for a given Elementor widget type and semantic intent.
 */
export function resolveElementorSettingsKey(widgetType: string | undefined, semanticKind: string): string | null {
  if (!widgetType) return null;
  const widgetSchema = ELEMENTOR_WIDGET_SCHEMA[widgetType];
  if (!widgetSchema) return null;
  return widgetSchema[semanticKind] ?? widgetSchema.default ?? null;
}

/**
 * Normalize an Elementor widget type (rendered HTML uses "heading.default").
 */
export function normalizeElementorWidgetType(widgetType: string | undefined): string | undefined {
  if (!widgetType) return undefined;
  return widgetType.replace(/\.default$/, "");
}

/**
 * Whether a widget type is known to the schema at all.
 */
export function isKnownElementorWidget(widgetType: string | undefined): boolean {
  if (!widgetType) return false;
  const normalized = normalizeElementorWidgetType(widgetType);
  return normalized ? normalized in ELEMENTOR_WIDGET_SCHEMA : false;
}

/**
 * Whether a specific settings key is a declared, editable control for a
 * widget type (Sprint 26). Used to distinguish "the element exists but this
 * control is not editable for it" (unsupported setting) from "the element
 * does not exist at all" (target not found).
 */
export function isKnownElementorControl(widgetType: string | undefined, settingsKey: string): boolean {
  if (!widgetType) return false;
  const normalized = normalizeElementorWidgetType(widgetType);
  if (!normalized) return false;
  const widgetSchema = ELEMENTOR_WIDGET_SCHEMA[normalized];
  if (!widgetSchema) return false;
  const declared = new Set(Object.values(widgetSchema));
  return declared.has(settingsKey);
}

/**
 * All declared editable settings keys for a widget type (Sprint 26).
 * Used by inspection to report supported vs unsupported fields.
 */
export function getElementorEditableControls(widgetType: string | undefined): string[] {
  if (!widgetType) return [];
  const normalized = normalizeElementorWidgetType(widgetType);
  if (!normalized) return [];
  const widgetSchema = ELEMENTOR_WIDGET_SCHEMA[normalized];
  if (!widgetSchema) return [];
  return [...new Set(Object.values(widgetSchema))];
}
