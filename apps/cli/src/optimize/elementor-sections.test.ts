// @forge/cli
// Tests for deriving generation sections from a live Elementor inventory.

import { describe, expect, it } from "vitest";
import type { ElementorInspectResult } from "../elementor/bridge.js";
import { deriveElementorSections, pageUrlFor } from "./elementor-sections.js";

function inspectWith(
  widgets: Array<{
    elementId: string;
    widgetType: string;
    supported?: boolean;
    fields?: Array<{ settingsKey: string; richText?: boolean; normalizedText?: string }>;
  }>,
): ElementorInspectResult {
  return {
    postId: 6,
    title: "Staging",
    fingerprint: "fingerprint-1",
    support: { supported: true } as never,
    document: {} as never,
    inventory: {
      fingerprint: "fingerprint-1",
      layouts: ["container", "widget"],
      widgetCount: widgets.length,
      supportedWidgetCount: widgets.filter((w) => w.supported !== false).length,
      widgets: widgets.map((widget) => ({
        elementId: widget.elementId,
        widgetType: widget.widgetType,
        elementPath: ["container", widget.widgetType],
        supported: widget.supported !== false,
        supportedFields: (widget.fields ?? []).map((field) => ({
          settingsKey: field.settingsKey,
          settingsPath: [field.settingsKey],
          richText: field.richText ?? false,
          normalizedText: field.normalizedText ?? "",
          locator: `${widget.elementId}.${field.settingsKey}`,
        })),
        unsupportedFields: [],
      })),
    },
  } as unknown as ElementorInspectResult;
}

describe("deriveElementorSections", () => {
  it("maps heading, text editor, and button widgets to generation targets", () => {
    const inspect = inspectWith([
      {
        elementId: "e1f2a3b4",
        widgetType: "heading",
        fields: [{ settingsKey: "title", normalizedText: "Accounting Software" }],
      },
      {
        elementId: "c3d4e5f6",
        widgetType: "text-editor",
        fields: [{ settingsKey: "editor", richText: true, normalizedText: "Premium accounting" }],
      },
      {
        elementId: "f7a8b9c0",
        widgetType: "button",
        fields: [{ settingsKey: "text", normalizedText: "Start Free Trial" }],
      },
    ]);

    const { sections, targets } = deriveElementorSections(inspect);

    expect(sections.map((section) => section.id)).toEqual([
      "elementor-e1f2a3b4-title",
      "elementor-c3d4e5f6-editor",
      "elementor-f7a8b9c0-text",
    ]);
    expect(sections.map((section) => section.kind)).toEqual(["hero", "benefits", "cta"]);
    expect(targets).toHaveLength(3);
    expect(targets[1]).toMatchObject({
      elementId: "c3d4e5f6",
      settingsKey: "editor",
      widgetType: "text-editor",
      richText: true,
      currentContent: "Premium accounting",
      fingerprint: "fingerprint-1",
    });
  });

  it("skips unsupported widgets, link-only fields, and widgets with no text field", () => {
    const inspect = inspectWith([
      {
        elementId: "unsupported",
        widgetType: "video",
        supported: false,
        fields: [{ settingsKey: "title", normalizedText: "Video" }],
      },
      {
        elementId: "button-link",
        widgetType: "button",
        fields: [{ settingsKey: "link", normalizedText: "https://example.test" }],
      },
      {
        elementId: "divider",
        widgetType: "divider",
        fields: [],
      },
    ]);

    const { sections, targets } = deriveElementorSections(inspect);
    expect(sections).toHaveLength(0);
    expect(targets).toHaveLength(0);
  });

  it("does not invent a target for widgets with no supported fields", () => {
    const inspect = inspectWith([{ elementId: "e1", widgetType: "heading", fields: [] }]);
    const { targets } = deriveElementorSections(inspect);
    expect(targets).toHaveLength(0);
  });
});

describe("pageUrlFor", () => {
  it("adds a page_id query parameter without dropping existing query params", () => {
    expect(pageUrlFor("https://example.com/site?preview=true", 6)).toBe(
      "https://example.com/site?preview=true&page_id=6",
    );
  });

  it("returns the site URL unchanged when no page id is given", () => {
    expect(pageUrlFor("https://example.com/", undefined)).toBe("https://example.com/");
  });
});
