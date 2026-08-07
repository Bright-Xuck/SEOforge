// @forge/dom-engine
// Builder detection (Sprint 23)
// Detects Elementor, Gutenberg, Classic Editor, Bricks from rendered HTML.

import type { BuilderDetectionResult, BuilderType } from "../universal/types.js";

/**
 * Detect the page builder from rendered HTML.
 *
 * Detection order:
 * 1. Elementor: `elementor` CSS classes, `data-elementor-type`, `elementor-widget-*`
 * 2. Bricks: `brxe-` CSS classes
 * 3. Gutenberg: `wp-block-*` CSS classes, `wp-block` class
 * 4. Classic: fallback
 */
export function detectBuilder(html: string): BuilderDetectionResult {
  if (!html || html.trim().length === 0) {
    return {
      builderType: "unknown",
      containerHierarchy: [],
      confidence: 0,
      metadata: { source: "empty" },
    };
  }

  // Elementor detection
  const elementorMatch = detectElementor(html);
  if (elementorMatch) {
    return elementorMatch;
  }

  // Bricks detection
  const bricksMatch = detectBricks(html);
  if (bricksMatch) {
    return bricksMatch;
  }

  // Gutenberg detection
  const gutenbergMatch = detectGutenberg(html);
  if (gutenbergMatch) {
    return gutenbergMatch;
  }

  // Classic Editor fallback
  return {
    builderType: "classic",
    containerHierarchy: ["body"],
    confidence: 0.6,
    metadata: { source: "fallback" },
  };
}

function detectElementor(html: string): BuilderDetectionResult | null {
  const hasElementorClass = /class="[^"]*elementor[^"]*"/.test(html);
  const hasElementorType = /data-elementor-type="[^"]*"/.test(html);
  const hasElementorWidget = /elementor-widget-[a-z-]+/.test(html);
  const hasElementorSection = /elementor-section/.test(html);
  const hasElementorContainer = /elementor-container/.test(html);

  if (!hasElementorClass && !hasElementorType && !hasElementorWidget) {
    return null;
  }

  const containerHierarchy: string[] = [];
  if (hasElementorContainer) containerHierarchy.push("container");
  if (hasElementorSection) containerHierarchy.push("section");
  if (hasElementorWidget) containerHierarchy.push("widget");

  // Detect layout type
  const layoutType = hasElementorContainer
    ? "container"
    : hasElementorSection
      ? "section"
      : "widget";

  // Try to detect version
  const versionMatch = html.match(/elementor-(\d+\.\d+\.\d+)/);
  const builderVersion = versionMatch?.[1];

  return {
    builderType: "elementor",
    builderVersion,
    layoutType,
    containerHierarchy,
    confidence: hasElementorType ? 0.98 : hasElementorWidget ? 0.95 : 0.85,
    metadata: {
      source: "rendered-html",
      hasElementorClass,
      hasElementorType,
      hasElementorWidget,
      hasElementorSection,
      hasElementorContainer,
    },
  };
}

function detectBricks(html: string): BuilderDetectionResult | null {
  const hasBricksClass = /class="[^"]*brxe-[^"]*"/.test(html);
  const hasBricksRoot = /data-bricks/.test(html);

  if (!hasBricksClass && !hasBricksRoot) {
    return null;
  }

  return {
    builderType: "bricks",
    containerHierarchy: ["section", "container", "block"],
    confidence: hasBricksRoot ? 0.95 : 0.85,
    metadata: {
      source: "rendered-html",
      hasBricksClass,
      hasBricksRoot,
    },
  };
}

function detectGutenberg(html: string): BuilderDetectionResult | null {
  const hasWpBlock = /class="[^"]*wp-block[^"]*"/.test(html);
  const hasWpBlockPrefix = /wp-block-[a-z-]+/.test(html);
  const hasWpBlockComment = /<!--\s*wp:[\s\S]*?-->/g.test(html);

  if (!hasWpBlock && !hasWpBlockPrefix && !hasWpBlockComment) {
    return null;
  }

  return {
    builderType: "gutenberg",
    containerHierarchy: ["block", "group", "columns"],
    confidence: hasWpBlockComment ? 0.95 : hasWpBlockPrefix ? 0.9 : 0.8,
    metadata: {
      source: "rendered-html",
      hasWpBlock,
      hasWpBlockPrefix,
      hasWpBlockComment,
    },
  };
}

/**
 * Detect builder type from raw HTML (shorthand).
 */
export function detectBuilderType(html: string): BuilderType {
  return detectBuilder(html).builderType;
}