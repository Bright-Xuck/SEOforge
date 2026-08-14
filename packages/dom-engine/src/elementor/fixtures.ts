// @forge/dom-engine
// Deterministic Elementor document fixtures (Sprint 25).
// Fixtures A–J per the sprint spec. All are real-world-shaped _elementor_data
// structures (containers, widgets, nested elements, globals, rich text).

/** Fixture A — Hero container: heading + text-editor + button widgets. */
export const FIXTURE_A_HERO = JSON.stringify([
  {
    id: "hero-container",
    elType: "container",
    settings: { flex_direction: "row", content_width: "full", gap: { unit: "px", size: 20 } },
    elements: [
      {
        id: "heading-1",
        elType: "widget",
        widgetType: "heading",
        settings: { title: "Accounting Software for Small Businesses", header_size: "h1" },
        elements: [],
      },
      {
        id: "text-1",
        elType: "widget",
        widgetType: "text-editor",
        settings: { editor: "<p>Premium accounting software for modern businesses.</p>" },
        elements: [],
      },
      {
        id: "button-1",
        elType: "widget",
        widgetType: "button",
        settings: { text: "Get Started", link: { url: "https://example.com/signup", is_external: false } },
        elements: [],
      },
    ],
  },
]);

/** Fixture B — Nested containers (outer → inner containers → widgets). */
export const FIXTURE_B_NESTED = JSON.stringify([
  {
    id: "outer",
    elType: "container",
    settings: { direction: "column" },
    elements: [
      {
        id: "inner-a",
        elType: "container",
        settings: { direction: "row" },
        elements: [
          { id: "a-heading", elType: "widget", widgetType: "heading", settings: { title: "Feature A" }, elements: [] },
        ],
      },
      {
        id: "inner-b",
        elType: "container",
        settings: { direction: "row" },
        elements: [
          { id: "b-heading", elType: "widget", widgetType: "heading", settings: { title: "Feature B" }, elements: [] },
        ],
      },
    ],
  },
]);

/** Fixture C — Multiple widgets of the same type. */
export const FIXTURE_C_MULTIPLE = JSON.stringify([
  {
    id: "container-c",
    elType: "container",
    settings: {},
    elements: [
      { id: "heading-x", elType: "widget", widgetType: "heading", settings: { title: "First Heading" }, elements: [] },
      { id: "heading-y", elType: "widget", widgetType: "heading", settings: { title: "Second Heading" }, elements: [] },
    ],
  },
]);

/** Fixture D — Rich text (text-editor with inline markup + lists + links). */
export const FIXTURE_D_RICH_TEXT = JSON.stringify([
  {
    id: "rich-container",
    elType: "container",
    settings: {},
    elements: [
      {
        id: "rich-1",
        elType: "widget",
        widgetType: "text-editor",
        settings: {
          editor:
            "<h2>Why Forge</h2><p>Forge helps <strong>growing teams</strong> ship better content with <em>deterministic</em> analysis.</p><ul><li>One</li><li>Two</li></ul><p>See <a href=\"https://example.com/docs\">the docs</a>.</p>",
        },
        elements: [],
      },
    ],
  },
]);

/** Fixture E — Unknown settings that must survive a round trip. */
export const FIXTURE_E_UNKNOWN = JSON.stringify([
  {
    id: "unknown-container",
    elType: "container",
    settings: { custom_theme_thing: { alpha: 1, beta: [1, 2, 3] } },
    elements: [
      {
        id: "unknown-heading",
        elType: "widget",
        widgetType: "heading",
        settings: {
          title: "Heading with extras",
          vendor_specific_setting: { enabled: true, preset: "wow" },
          animation: { type: "fadeIn", duration: 0.5 },
        },
        elements: [],
      },
    ],
  },
]);

/** Fixture F — Global style references (`__globals__`) that must be preserved. */
export const FIXTURE_F_GLOBALS = JSON.stringify([
  {
    id: "globals-container",
    elType: "container",
    settings: {},
    elements: [
      {
        id: "globals-heading",
        elType: "widget",
        widgetType: "heading",
        settings: {
          title: "Globals heading",
          __globals__: {
            title_color: "globals/colors?id=primary",
            typography_typography: "globals/typography?id=heading",
          },
          title_color: "var(--e-global-color-primary)",
        },
        elements: [],
      },
    ],
  },
]);

/** Fixture G — (stale patch is constructed in tests against a live doc). */
export const FIXTURE_G_STALE_TARGET = "heading-1";

/** Fixture H — (ambiguous semantic intent is exercised in tests). */
export const FIXTURE_H_AMBIGUOUS = FIXTURE_C_MULTIPLE;

/** Fixture I — Unsupported widget (raw HTML widget). */
export const FIXTURE_I_UNSUPPORTED = JSON.stringify([
  {
    id: "html-container",
    elType: "container",
    settings: {},
    elements: [
      {
        id: "html-1",
        elType: "widget",
        widgetType: "html",
        settings: { html: "<div class=\"custom\">Raw HTML here</div>" },
        elements: [],
      },
    ],
  },
]);

/** Fixture J — (failed remote write is exercised in the bridge tests). */

/** Rendered HTML matching Fixture A (data-id attributes for universal mapping). */
export const FIXTURE_A_RENDERED_HTML = `
<html><body>
  <div class="elementor elementor-5" data-elementor-type="page">
    <div class="elementor-container" data-id="hero-container">
      <div class="elementor-widget elementor-widget-heading" data-id="heading-1" data-element_type="heading.default">
        <h1>Accounting Software for Small Businesses</h1>
      </div>
      <div class="elementor-widget elementor-widget-text-editor" data-id="text-1" data-element_type="text-editor.default">
        <p>Premium accounting software for modern businesses.</p>
      </div>
      <div class="elementor-widget elementor-widget-button" data-id="button-1" data-element_type="button.default">
        <a href="https://example.com/signup">Get Started</a>
      </div>
    </div>
  </div>
</body></html>
`;
