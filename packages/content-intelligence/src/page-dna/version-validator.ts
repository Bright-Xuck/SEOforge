// @forge/content-intelligence
// Page DNA schema versioning and compatibility checks.
// NO AI. Deterministic.

import type { PageDNA, PageDNAVersion, PageDNAWarning } from "../types.js";

export const SCHEMA_COMPATIBILITY: Record<PageDNAVersion, PageDNAVersion[]> = {
  "1.0": ["1.0"],
};

const CURRENT_VERSION: PageDNAVersion = "1.0";
const GENERATOR_VERSION = "0.16.0";

export function createPageDNAWithVersion(
  data: Omit<PageDNA, "schemaVersion" | "dnaVersion" | "generatorVersion" | "analyzedAt">,
): PageDNA {
  return {
    ...data,
    schemaVersion: CURRENT_VERSION,
    dnaVersion: CURRENT_VERSION,
    generatorVersion: GENERATOR_VERSION,
    analyzedAt: new Date().toISOString(),
  };
}

export function validatePageDNAVersion(version: PageDNAVersion): boolean {
  return version in SCHEMA_COMPATIBILITY;
}

export function isPageDNACompatible(version: PageDNAVersion, target: PageDNAVersion = CURRENT_VERSION): boolean {
  const compatible = SCHEMA_COMPATIBILITY[target];
  return compatible ? compatible.includes(version) : false;
}

export function getPageDNAWarnings(dna: PageDNA): PageDNAWarning[] {
  const warnings: PageDNAWarning[] = [];
  if (!isPageDNACompatible(dna.schemaVersion as PageDNAVersion)) {
    warnings.push({ code: "UNSUPPORTED_VERSION", message: `Schema version ${dna.schemaVersion} is not compatible.` });
  }
  if (!dna.pageType || dna.pageType.kind === "generic") {
    warnings.push({ code: "GENERIC_PAGE_TYPE", message: "Page type could not be confidently determined." });
  }
  if (dna.sectionInventory.sections.filter((section) => section.present).length === 0) {
    warnings.push({ code: "NO_SECTIONS", message: "No recognizable content sections were detected." });
  }
  if (dna.topics.length === 0) {
    warnings.push({ code: "NO_TOPICS", message: "No dominant topics were extracted." });
  }
  return warnings;
}
