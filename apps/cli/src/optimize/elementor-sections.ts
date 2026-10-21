// @forge/cli
// Derive generation sections and concrete Elementor write targets from the
// live document inventory.
//
// The rendered HTML detector cannot see Elementor source widgets reliably
// (page 6 renders a heading, a text editor, and a button, but no heuristic
// "section" wrappers). Generation must target the real editable fields, so the
// caller inspects the document first and passes these mappings into the
// orchestrator context.

import type { SectionInfo, SectionKind } from "@forge/content-intelligence";
import type { SectionTarget } from "@forge/optimization-orchestrator";
import type { ElementorInspectResult } from "../elementor/bridge.js";

const WIDGET_KIND: Record<string, SectionKind> = {
  heading: "hero",
  "text-editor": "benefits",
  button: "cta",
};

const WIDGET_ORDER = ["heading", "text-editor", "button"];

export interface DerivedElementorSections {
  readonly sections: SectionInfo[];
  readonly targets: SectionTarget[];
}

/**
 * Turn an Elementor inspection into generation sections.
 *
 * Only widgets with a supported text field are included. Link-only fields and
 * unsupported widgets are ignored: Forge must never guess a write target.
 */
export function deriveElementorSections(inspect: ElementorInspectResult): DerivedElementorSections {
  const sections: SectionInfo[] = [];
  const targets: SectionTarget[] = [];
  const fingerprint = inspect.fingerprint;

  const widgets = [...inspect.inventory.widgets].sort(
    (a, b) => orderOf(a.widgetType) - orderOf(b.widgetType),
  );

  for (const widget of widgets) {
    if (!widget.supported) continue;
    const kind = WIDGET_KIND[widget.widgetType];
    if (!kind) continue;

    for (const field of widget.supportedFields) {
      // Only textual controls are generation targets. `link` and other
      // settings are not reviewable prose.
      if (!isTextControl(field.settingsKey)) continue;
      if (!field.normalizedText && field.settingsKey !== "editor" && field.settingsKey !== "title") {
        continue;
      }

      const sectionId = `elementor-${widget.elementId}-${field.settingsKey}`;
      sections.push({
        kind,
        present: true,
        confidence: 1,
        evidence: field.normalizedText ? [field.normalizedText] : [],
        id: sectionId,
        selector: `[data-id="${widget.elementId}"]`,
        containedNodes: [],
        childSections: [],
      });

      targets.push({
        sectionId,
        elementId: widget.elementId,
        settingsKey: field.settingsKey,
        widgetType: widget.widgetType,
        richText: field.richText,
        currentContent: field.normalizedText,
        fingerprint,
      });
    }
  }

  return { sections, targets };
}

/**
 * Build a stable page URL for reading. WordPress accepts `?page_id=` even when
 * pretty permalinks are enabled, so this works for drafts and staging pages.
 */
export function pageUrlFor(siteUrl: string, pageId?: number): string {
  if (!pageId) return siteUrl;
  const url = new URL(siteUrl);
  url.searchParams.set("page_id", String(pageId));
  return url.toString();
}

function isTextControl(settingsKey: string): boolean {
  return settingsKey === "title" || settingsKey === "editor" || settingsKey === "text";
}

function orderOf(widgetType: string): number {
  const index = WIDGET_ORDER.indexOf(widgetType);
  return index === -1 ? WIDGET_ORDER.length : index;
}
