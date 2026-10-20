// @forge/dom-engine
// Elementor document inventory (Sprint 26).
//
// Deterministic inspection of an Elementor document: which widgets exist,
// which controls are schema-declared and editable, which fields are
// unsupported, and what the normalized visible text of each editable field is.
// This module is provider-neutral and never mutates the document.

import type { ContentNode } from "../types.js";
import type { ElementorDocument } from "./document.js";
import {
  normalizeElementorWidgetType,
  isKnownElementorWidget,
  isKnownElementorControl,
  getElementorEditableControls,
  ELEMENTOR_UNSUPPORTED_WIDGETS,
} from "./widget-schema.js";
import { isElementorRichTextSetting } from "./widget-schema.js";
import { getNestedSetting } from "./setting-path.js";
import { resolveElementorSettingPath } from "./setting-path.js";
import { textContentOfRichText, normalizeText } from "./rich-text.js";
import { fingerprintElementorTree } from "./document.js";

/**
 * Classification of a single widget found in the document.
 */
export interface ElementorWidgetInventory {
  /** Elementor element id (stable data-id). */
  readonly elementId: string;
  /** Normalized widget type (e.g. "heading"). */
  readonly widgetType: string;
  /** Breadcrumb of element types from the document root. */
  readonly elementPath: string[];
  /** Whether the widget type is patchable by the conservative schema. */
  readonly supported: boolean;
  /** Refusal reason when unsupported (typed, actionable). */
  readonly unsupportedReason?: string;
  /** Schema-declared editable controls present in the widget's settings. */
  readonly supportedFields: ElementorFieldInventory[];
  /** Widget settings keys that are NOT declared editable controls. */
  readonly unsupportedFields: string[];
}

/**
 * A single editable field observed in a widget.
 */
export interface ElementorFieldInventory {
  readonly settingsKey: string;
  readonly settingsPath: string[];
  readonly richText: boolean;
  /** Normalized visible text (for headings/editors) or string value. */
  readonly normalizedText: string;
  /** Deterministic selector-ish locator (for developer inspection). */
  readonly locator: string;
}

/**
 * Full document inventory.
 */
export interface ElementorDocumentInventory {
  /** Structural fingerprint (structural, reformatting-tolerant). */
  readonly fingerprint: string;
  /** Layout kinds found (container/section/column/widget). */
  readonly layouts: string[];
  readonly widgetCount: number;
  readonly supportedWidgetCount: number;
  readonly widgets: ElementorWidgetInventory[];
}

/**
 * Build the full deterministic inventory of an Elementor document.
 */
export function inventoryElementorDocument(document: ElementorDocument): ElementorDocumentInventory {
  const widgets: ElementorWidgetInventory[] = [];
  const layouts = new Set<string>();

  const walk = (node: ContentNode, trail: string[]): void => {
    layouts.add(node.type);
    if (node.widgetType) {
      widgets.push(inventoryWidget(node, trail));
    }
    for (const child of node.children) {
      walk(child, [...trail, node.widgetType ?? node.type]);
    }
  };
  walk(document.root, []);

  const supported = widgets.filter((w) => w.supported).length;
  return {
    fingerprint: fingerprintElementorTree(document.root),
    layouts: [...layouts],
    widgetCount: widgets.length,
    supportedWidgetCount: supported,
    widgets,
  };
}

function inventoryWidget(node: ContentNode, trail: string[]): ElementorWidgetInventory {
  const widgetType = normalizeElementorWidgetType(node.widgetType) ?? (node.widgetType as string);
  const elementPath = [...trail, node.type];

  let unsupportedReason: string | undefined;
  if (node.type === "container" || node.type === "section" || node.type === "column") {
    unsupportedReason = "layout element";
  } else if (widgetType && ELEMENTOR_UNSUPPORTED_WIDGETS.has(widgetType)) {
    unsupportedReason = "widget type is refused for content patching";
  } else if (!isKnownElementorWidget(widgetType)) {
    unsupportedReason = "widget type is not in the conservative widget schema";
  }

  const supportedFields: ElementorFieldInventory[] = [];
  const unsupportedFields: string[] = [];
  const declared = getElementorEditableControls(widgetType);

  for (const key of Object.keys(node.settings)) {
    if (isKnownElementorControl(widgetType, key)) {
      const path = resolveElementorSettingPath(widgetType, key);
      const value = getNestedSetting(node.settings, path);
      supportedFields.push({
        settingsKey: key,
        settingsPath: path,
        richText: isElementorRichTextSetting(widgetType, key),
        normalizedText: normalizeText(
          typeof value === "string" ? textContentOfRichText(value) : value === undefined || value === null ? "" : String(value),
        ),
        locator: `${elementPath.join(">")}#${node.id}.${path.join(".")}`,
      });
    } else {
      unsupportedFields.push(key);
    }
  }

  return {
    elementId: node.id,
    widgetType: widgetType ?? "unknown",
    elementPath,
    supported: unsupportedReason === undefined && declared.length > 0,
    unsupportedReason,
    supportedFields,
    unsupportedFields,
  };
}