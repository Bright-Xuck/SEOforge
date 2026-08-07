// @forge/dom-engine
// Universal Page Model types (Sprint 23)
// Page → Regions → Sections → Blocks → Elements → Text Nodes → Attributes → Selectors

// ─── Builder Detection ─────────────────────────────────────

export type BuilderType = "elementor" | "gutenberg" | "classic" | "bricks" | "unknown";

export type ElementorLayoutType = "container" | "section" | "column" | "widget";

export interface BuilderDetectionResult {
  readonly builderType: BuilderType;
  readonly builderVersion?: string;
  readonly layoutType?: ElementorLayoutType;
  readonly containerHierarchy: string[];
  readonly confidence: number;
  readonly metadata: Record<string, unknown>;
}

// ─── Selectors ─────────────────────────────────────────────

export interface SelectorSet {
  readonly css: string;
  readonly xpath: string;
  readonly domPath: string;
  readonly forgeSelector: string;
  readonly sectionSelector?: string;
  readonly blockSelector?: string;
  readonly attributeSelector?: string;
}

// ─── Attributes ────────────────────────────────────────────

export interface DomAttribute {
  readonly name: string;
  readonly value: string;
}

// ─── Text Nodes ────────────────────────────────────────────

export interface TextNode {
  readonly id: string;
  readonly text: string;
  readonly parentId: string;
  readonly selectors: SelectorSet;
}

// ─── Elements ──────────────────────────────────────────────

export type ElementKind =
  | "heading"
  | "paragraph"
  | "list"
  | "table"
  | "link"
  | "button"
  | "image"
  | "video"
  | "audio"
  | "embed"
  | "form"
  | "input"
  | "icon"
  | "divider"
  | "spacer"
  | "nav"
  | "footer"
  | "header"
  | "section"
  | "aside"
  | "main"
  | "article"
  | "figure"
  | "figcaption"
  | "blockquote"
  | "code"
  | "pre"
  | "span"
  | "div"
  | "unknown";

export interface DomElement {
  readonly id: string;
  readonly tagName: string;
  readonly kind: ElementKind;
  readonly attributes: DomAttribute[];
  readonly textNodes: TextNode[];
  readonly children: DomElement[];
  readonly parentId?: string;
  readonly selectors: SelectorSet;
  readonly metadata: Record<string, unknown>;
}

// ─── Blocks ────────────────────────────────────────────────

export type BlockKind =
  // Elementor widgets
  | "heading-widget"
  | "image-widget"
  | "button-widget"
  | "text-editor-widget"
  | "icon-list-widget"
  | "accordion-widget"
  | "tabs-widget"
  | "testimonials-widget"
  | "pricing-widget"
  | "cta-widget"
  | "html-widget"
  | "shortcode-widget"
  | "template-widget"
  | "loop-widget"
  | "form-widget"
  | "map-widget"
  | "video-widget"
  | "spacer-widget"
  | "divider-widget"
  | "nav-menu-widget"
  | "popup-widget"
  // Gutenberg blocks
  | "paragraph-block"
  | "heading-block"
  | "image-block"
  | "gallery-block"
  | "list-block"
  | "columns-block"
  | "buttons-block"
  | "quote-block"
  | "cover-block"
  | "group-block"
  | "table-block"
  | "separator-block"
  | "video-block"
  | "audio-block"
  | "embed-block"
  | "code-block"
  | "preformatted-block"
  | "pullquote-block"
  | "custom-html-block"
  | "shortcode-block"
  | "navigation-block"
  | "template-part-block"
  | "pattern-block"
  // Generic
  | "generic-block"
  | "unknown-block";

export interface DomBlock {
  readonly id: string;
  readonly kind: BlockKind;
  readonly builderType: BuilderType;
  readonly widgetType?: string;
  readonly blockName?: string;
  readonly elements: DomElement[];
  readonly children: DomBlock[];
  readonly parentId?: string;
  readonly selectors: SelectorSet;
  readonly metadata: Record<string, unknown>;
}

// ─── Sections ──────────────────────────────────────────────

export type SectionKind =
  | "hero"
  | "benefits"
  | "services"
  | "products"
  | "features"
  | "testimonials"
  | "faq"
  | "comparison"
  | "cta"
  | "pricing"
  | "contact"
  | "about"
  | "blog"
  | "resources"
  | "related-content"
  | "team"
  | "mission"
  | "vision"
  | "timeline"
  | "statistics"
  | "partners"
  | "clients"
  | "awards"
  | "trust"
  | "newsletter"
  | "footer"
  | "unknown";

export interface DomSection {
  readonly id: string;
  readonly kind: SectionKind;
  readonly blocks: DomBlock[];
  readonly parentId?: string;
  readonly selectors: SelectorSet;
  readonly metadata: Record<string, unknown>;
}

// ─── Regions ───────────────────────────────────────────────

export type RegionKind =
  | "header"
  | "hero"
  | "navigation"
  | "breadcrumb"
  | "main"
  | "sidebar"
  | "footer"
  | "popup"
  | "modal"
  | "sticky"
  | "hidden"
  | "template-part"
  | "unknown";

export interface DomRegion {
  readonly id: string;
  readonly kind: RegionKind;
  readonly sections: DomSection[];
  readonly parentId?: string;
  readonly selectors: SelectorSet;
  readonly metadata: Record<string, unknown>;
}

// ─── Universal Page ────────────────────────────────────────

export interface UniversalPage {
  readonly id: string;
  readonly url?: string;
  readonly title?: string;
  readonly builder: BuilderDetectionResult;
  readonly regions: DomRegion[];
  readonly rawHtml: string;
  readonly createdAt: string;
}

// ─── DOM Diff ──────────────────────────────────────────────

export type DomDiffOperation = "added" | "removed" | "modified" | "moved";

export interface DomDiffEntry {
  readonly operation: DomDiffOperation;
  readonly nodeType: "region" | "section" | "block" | "element" | "text-node" | "attribute";
  readonly nodeId: string;
  readonly path: string[];
  readonly oldValue?: unknown;
  readonly newValue?: unknown;
  readonly attributeChanges?: { name: string; oldValue?: string; newValue?: string }[];
}

export interface DomDiffResult {
  readonly entries: DomDiffEntry[];
  readonly addedCount: number;
  readonly removedCount: number;
  readonly modifiedCount: number;
  readonly movedCount: number;
}

// ─── Rich Text Model ───────────────────────────────────────

export type RichTextNodeKind =
  | "heading"
  | "paragraph"
  | "list"
  | "table"
  | "link"
  | "button"
  | "quote"
  | "callout"
  | "image"
  | "caption"
  | "embed"
  | "video"
  | "icon"
  | "form"
  | "inline-format"
  | "text";

export interface RichTextNode {
  readonly id: string;
  readonly kind: RichTextNodeKind;
  readonly text?: string;
  readonly level?: number;
  readonly items?: string[];
  readonly rows?: string[][];
  readonly href?: string;
  readonly src?: string;
  readonly alt?: string;
  readonly format?: "bold" | "italic" | "underline" | "code";
  readonly children: RichTextNode[];
  readonly metadata: Record<string, unknown>;
}

// ─── Rich Text Patch ───────────────────────────────────────

export type RichTextPatchOperation =
  | "replace-paragraph"
  | "insert-paragraph"
  | "delete-paragraph"
  | "replace-heading"
  | "replace-button-text"
  | "replace-cta"
  | "replace-list"
  | "replace-table"
  | "replace-image-alt"
  | "replace-caption"
  | "replace-widget-text"
  | "replace-html-block"
  | "replace-shortcode-content";

export interface RichTextPatch {
  readonly id: string;
  readonly operation: RichTextPatchOperation;
  readonly targetId: string;
  readonly selector: string;
  readonly newContent: string;
  readonly metadata: Record<string, unknown>;
}

// ─── DOM Validation ────────────────────────────────────────

export type DomValidationSeverity = "error" | "warning";

export interface DomValidationIssue {
  readonly severity: DomValidationSeverity;
  readonly code: string;
  readonly message: string;
  readonly nodeId?: string;
  readonly path?: string[];
}

export interface DomValidationReport {
  readonly valid: boolean;
  readonly issues: DomValidationIssue[];
  readonly errorCount: number;
  readonly warningCount: number;
}