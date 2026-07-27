// @forge/dom-engine
// Elementor widget schema: maps widget types to settings keys.

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
 * Resolve the settings key for a given Elementor widget type and semantic intent.
 */
export function resolveElementorSettingsKey(widgetType: string | undefined, semanticKind: string): string | null {
  if (!widgetType) return null;
  const widgetSchema = ELEMENTOR_WIDGET_SCHEMA[widgetType];
  if (!widgetSchema) return null;
  return widgetSchema[semanticKind] ?? widgetSchema.default ?? null;
}
