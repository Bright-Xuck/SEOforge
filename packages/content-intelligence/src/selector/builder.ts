// @forge/content-intelligence
// SelectorBuilder: fluent, deterministic selector construction.
// NO AI.

import type {
  AnySelector,
  BlockSelector,
  HeadingSelector,
  MediaSelector,
  NodeSelector,
  ParagraphSelector,
  SectionSelector,
  SelectorOptions,
  TextSelector,
} from "./types.js";

export class SelectorBuilder {
  private constructor(private readonly selector: AnySelector) {}

  static section(kind: string, options?: SelectorOptions): SectionSelector {
    return {
      type: "section",
      target: "section",
      kind,
      css: `[data-section="${kind}"], [class*="${kind}"], section.${kind}`,
      options,
    };
  }

  static block(sectionId: string, options?: SelectorOptions): BlockSelector {
    return {
      type: "block",
      target: "block",
      sectionId,
      css: `[data-block="${sectionId}"], [class*="block"]`,
      options,
    };
  }

  static node(nodeId: string, target: "sentence" | "block" = "block"): NodeSelector {
    return {
      type: "node",
      target,
      nodeId,
      css: `[data-node="${nodeId}"], #${nodeId}`,
    };
  }

  static paragraph(blockId: string, options?: SelectorOptions): ParagraphSelector {
    return {
      type: "paragraph",
      target: "paragraph",
      blockId,
      css: `[data-paragraph="${blockId}"] p`,
      options,
    };
  }

  static heading(level?: number): HeadingSelector {
    return {
      type: "heading",
      target: "heading",
      level,
      css: level ? `h${level}` : "h1, h2, h3, h4, h5, h6",
    };
  }

  static text(textContains: string, target: "paragraph" | "sentence" = "paragraph"): TextSelector {
    return {
      type: "text",
      target,
      textContains,
      css: target === "paragraph" ? "p" : "[data-node]",
    };
  }

  static media(withAlt = true): MediaSelector {
    return {
      type: "media",
      target: "image",
      withAlt,
      css: withAlt ? "img[alt]:not([alt=''])" : "img",
    };
  }

  build(): AnySelector {
    return this.selector;
  }
}
