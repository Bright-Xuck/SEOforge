// @forge/content-intelligence
// Selector type definitions (Hardening Phase).
// NO AI.

export type SelectorType =
  | "section"
  | "block"
  | "node"
  | "paragraph"
  | "heading"
  | "text"
  | "media";

export type SelectorTarget = "page" | "section" | "block" | "paragraph" | "sentence" | "heading" | "image";

export interface SelectorOptions {
  readonly index?: number;
  readonly attribute?: string;
  readonly textContains?: string;
  readonly minConfidence?: number;
}

export interface ContentSelector {
  readonly type: SelectorType;
  readonly target: SelectorTarget;
  readonly css: string;
  readonly options?: SelectorOptions;
}

export interface SectionSelector extends ContentSelector {
  readonly type: "section";
  readonly target: "section";
  readonly kind: string;
}

export interface BlockSelector extends ContentSelector {
  readonly type: "block";
  readonly target: "block";
  readonly sectionId: string;
}

export interface NodeSelector extends ContentSelector {
  readonly type: "node";
  readonly target: "sentence" | "block";
  readonly nodeId: string;
}

export interface ParagraphSelector extends ContentSelector {
  readonly type: "paragraph";
  readonly target: "paragraph";
  readonly blockId: string;
}

export interface HeadingSelector extends ContentSelector {
  readonly type: "heading";
  readonly target: "heading";
  readonly level?: number;
}

export interface TextSelector extends ContentSelector {
  readonly type: "text";
  readonly target: "paragraph" | "sentence";
  readonly textContains: string;
}

export interface MediaSelector extends ContentSelector {
  readonly type: "media";
  readonly target: "image";
  readonly withAlt?: boolean;
}

export type AnySelector =
  | SectionSelector
  | BlockSelector
  | NodeSelector
  | ParagraphSelector
  | HeadingSelector
  | TextSelector
  | MediaSelector;
