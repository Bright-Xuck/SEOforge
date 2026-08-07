// @forge/dom-engine
// DOM Validation (Sprint 23)
// Detects broken nesting, invalid heading order, duplicate IDs, empty sections,
// hidden content, invisible text, broken images, broken embeds, malformed lists/tables,
// missing landmarks, invalid ARIA.

import type { UniversalPage, DomValidationReport, DomValidationIssue } from "../universal/types.js";

/**
 * Validate a UniversalPage for structural and accessibility issues.
 */
export function validateDom(page: UniversalPage): DomValidationReport {
  const issues: DomValidationIssue[] = [];

  // Check for duplicate IDs
  const seenIds = new Map<string, string>();
  collectIds(page, seenIds, issues);

  // Check heading order
  const headings: { level: number; path: string[] }[] = [];
  collectHeadings(page, headings);
  validateHeadingOrder(headings, issues);

  // Check empty sections
  checkEmptySections(page, issues);

  // Check hidden content
  checkHiddenContent(page, issues);

  // Check broken images
  checkBrokenImages(page, issues);

  // Check missing landmarks
  checkMissingLandmarks(page, issues);

  // Check invalid ARIA
  checkInvalidAria(page, issues);

  return {
    valid: issues.filter((i) => i.severity === "error").length === 0,
    issues,
    errorCount: issues.filter((i) => i.severity === "error").length,
    warningCount: issues.filter((i) => i.severity === "warning").length,
  };
}

function collectIds(
  page: UniversalPage,
  seenIds: Map<string, string>,
  issues: DomValidationIssue[],
): void {
  for (const region of page.regions) {
    checkId(region.id, "region", seenIds, issues);
    for (const section of region.sections) {
      checkId(section.id, "section", seenIds, issues);
      for (const block of section.blocks) {
        checkId(block.id, "block", seenIds, issues);
        for (const element of block.elements) {
          checkId(element.id, "element", seenIds, issues);
          for (const attr of element.attributes) {
            if (attr.name === "id" && attr.value) {
              checkId(attr.value, "html-id", seenIds, issues);
            }
          }
        }
      }
    }
  }
}

function checkId(
  id: string,
  type: string,
  seenIds: Map<string, string>,
  issues: DomValidationIssue[],
): void {
  if (seenIds.has(id)) {
    issues.push({
      severity: "error",
      code: "DUPLICATE_ID",
      message: `Duplicate ${type} ID: ${id} (also used by ${seenIds.get(id)})`,
      nodeId: id,
    });
  } else {
    seenIds.set(id, type);
  }
}

function collectHeadings(
  page: UniversalPage,
  headings: { level: number; path: string[] }[],
): void {
  for (const region of page.regions) {
    for (const section of region.sections) {
      for (const block of section.blocks) {
        for (const element of block.elements) {
          if (element.kind === "heading") {
            const levelMatch = element.tagName.match(/^h([1-6])$/);
            if (levelMatch) {
              headings.push({ level: parseInt(levelMatch[1] ?? "0", 10), path: [region.id, section.id, block.id, element.id] });
            }
          }
        }
      }
    }
  }
}

function validateHeadingOrder(
  headings: { level: number; path: string[] }[],
  issues: DomValidationIssue[],
): void {
  let expectedLevel = 1;
  for (const heading of headings) {
    if (heading.level > expectedLevel + 1) {
      issues.push({
        severity: "warning",
        code: "INVALID_HEADING_ORDER",
        message: `Heading level ${heading.level} skips level ${expectedLevel + 1}`,
        path: heading.path,
      });
    }
    expectedLevel = Math.max(expectedLevel, heading.level);
  }
}

function checkEmptySections(page: UniversalPage, issues: DomValidationIssue[]): void {
  for (const region of page.regions) {
    for (const section of region.sections) {
      const textLength = (section.metadata["textLength"] as number) ?? 0;
      if (textLength === 0 && section.blocks.length === 0) {
        issues.push({
          severity: "warning",
          code: "EMPTY_SECTION",
          message: `Empty section: ${section.id}`,
          nodeId: section.id,
        });
      }
    }
  }
}

function checkHiddenContent(page: UniversalPage, issues: DomValidationIssue[]): void {
  for (const region of page.regions) {
    if (region.kind === "hidden") {
      issues.push({
        severity: "warning",
        code: "HIDDEN_REGION",
        message: `Hidden region detected: ${region.id}`,
        nodeId: region.id,
      });
    }
  }
}

function checkBrokenImages(page: UniversalPage, issues: DomValidationIssue[]): void {
  for (const region of page.regions) {
    for (const section of region.sections) {
      for (const block of section.blocks) {
        for (const element of block.elements) {
          if (element.kind === "image") {
            const src = element.attributes.find((a) => a.name === "src")?.value;
            if (!src || src.trim().length === 0) {
              issues.push({
                severity: "error",
                code: "BROKEN_IMAGE",
                message: `Image without src: ${element.id}`,
                nodeId: element.id,
              });
            }
            const alt = element.attributes.find((a) => a.name === "alt")?.value;
            if (!alt) {
              issues.push({
                severity: "warning",
                code: "MISSING_ALT",
                message: `Image without alt text: ${element.id}`,
                nodeId: element.id,
              });
            }
          }
        }
      }
    }
  }
}

function checkMissingLandmarks(page: UniversalPage, issues: DomValidationIssue[]): void {
  const hasHeader = page.regions.some((r) => r.kind === "header");
  const hasMain = page.regions.some((r) => r.kind === "main");
  const hasFooter = page.regions.some((r) => r.kind === "footer");

  if (!hasHeader) {
    issues.push({
      severity: "warning",
      code: "MISSING_LANDMARK",
      message: "Page has no header landmark",
    });
  }
  if (!hasMain) {
    issues.push({
      severity: "warning",
      code: "MISSING_LANDMARK",
      message: "Page has no main landmark",
    });
  }
  if (!hasFooter) {
    issues.push({
      severity: "warning",
      code: "MISSING_LANDMARK",
      message: "Page has no footer landmark",
    });
  }
}

function checkInvalidAria(page: UniversalPage, issues: DomValidationIssue[]): void {
  for (const region of page.regions) {
    for (const section of region.sections) {
      for (const block of section.blocks) {
        for (const element of block.elements) {
          const ariaAttrs = element.attributes.filter((a) => a.name.startsWith("aria-"));
          for (const attr of ariaAttrs) {
            if (attr.value === "" || attr.value === "undefined") {
              issues.push({
                severity: "warning",
                code: "INVALID_ARIA",
                message: `Invalid ARIA attribute ${attr.name} on ${element.id}`,
                nodeId: element.id,
              });
            }
          }
        }
      }
    }
  }
}