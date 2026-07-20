// @forge/content-generation
// Validates generated section content before it becomes a patch.

import type { GeneratedSection, ValidationReport } from "../types.js";

const MIN_LENGTH = 20;
const MAX_LENGTH = 4000;
const MAX_HEADINGS = 12;
const UNSAFE_PLACEHOLDER = /\{\{[^}]+\}\}|\{\{|\}\}/;

interface ValidationIssue {
  readonly code: string;
  readonly message: string;
  readonly severity: "error" | "warning";
}

/**
 * Validate a generated section. Returns a structured ValidationReport.
 * Pure, deterministic — no AI, no network.
 */
export function validateGeneratedSection(section: GeneratedSection): ValidationReport {
  const issues: ValidationIssue[] = [];
  const content = section.generatedSection;

  if (content.trim().length === 0) {
    issues.push({ code: "EMPTY_OUTPUT", message: "Generated content is empty.", severity: "error" });
  }
  if (content.length < MIN_LENGTH) {
    issues.push({ code: "TOO_SHORT", message: `Content is shorter than ${MIN_LENGTH} characters.`, severity: "error" });
  }
  if (content.length > MAX_LENGTH) {
    issues.push({ code: "TOO_LONG", message: `Content exceeds ${MAX_LENGTH} characters.`, severity: "error" });
  }

  const headingCount = (content.match(/^#{1,6}\s/gm) ?? []).length;
  if (headingCount > MAX_HEADINGS) {
    issues.push({ code: "TOO_MANY_HEADINGS", message: `Too many headings (${headingCount}).`, severity: "warning" });
  }

  if (UNSAFE_PLACEHOLDER.test(content)) {
    issues.push({ code: "UNSAFE_PLACEHOLDER", message: "Content contains unresolved placeholders.", severity: "error" });
  }

  const hasError = issues.some((issue) => issue.severity === "error");
  return {
    valid: !hasError,
    errors: issues.filter((i) => i.severity === "error").map((i) => i.message),
    warnings: issues.filter((i) => i.severity === "warning").map((i) => i.message),
  };
}
