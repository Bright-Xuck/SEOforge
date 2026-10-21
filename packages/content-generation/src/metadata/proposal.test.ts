// @forge/content-generation
// Tests for deterministic SEO metadata proposals and patch translation.

import { describe, expect, it } from "vitest";
import type { BrandProfile } from "@forge/core";
import {
  buildMetadataProposal,
  metadataProposalToPatches,
  METADATA_FIELD_KEYS,
} from "./proposal.js";

const brand = {
  id: "brand-1",
  projectId: "project-1",
  companyName: "Acme",
  industry: "accounting software",
  products: ["Acme Books"],
  services: ["Bookkeeping"],
  audiences: ["small businesses"],
} as unknown as BrandProfile;

function proposal(overrides: Partial<Parameters<typeof buildMetadataProposal>[0]> = {}) {
  return buildMetadataProposal({
    project: "project-1",
    pageId: 6,
    pageUrl: "https://example.com/accounting",
    pageTitle: "Accounting for Small Businesses",
    primaryKeyword: "accounting software",
    brand,
    audience: "small businesses",
    ...overrides,
  });
}

describe("buildMetadataProposal", () => {
  it("adds the focus keyword and brand without inventing claims", () => {
    const result = proposal();

    expect(result.source).toBe("deterministic");
    expect(result.title.toLowerCase()).toContain("accounting software");
    expect(result.title).toContain("Acme");
    expect(result.description.toLowerCase()).toContain("accounting software");
    expect(result.description).toContain("Acme");
    expect(result.title.length).toBeLessThanOrEqual(60);
    expect(result.description.length).toBeLessThanOrEqual(155);
  });

  it("keeps the title and description within configured limits", () => {
    const result = proposal({
      currentTitle:
        "A very long existing SEO title that will definitely exceed a narrow configured limit",
      maxTitleLength: 40,
      maxDescriptionLength: 80,
    });

    expect(result.title.length).toBeLessThanOrEqual(40);
    expect(result.description.length).toBeLessThanOrEqual(80);
  });

  it("raises confidence only when the keyword is present in both fields", () => {
    const result = proposal({ primaryKeyword: "" });
    expect(result.confidence).toBeGreaterThanOrEqual(0.4);
    expect(result.confidence).toBeLessThanOrEqual(0.95);
    expect(result.rationale.every((line) => typeof line === "string")).toBe(true);
  });
});

describe("metadataProposalToPatches", () => {
  it("creates one Rank Math patch per changed field", () => {
    const result = proposal();
    const patches = metadataProposalToPatches(result, {
      title: "Old title",
      description: "Old description",
    });

    expect(patches).toHaveLength(2);
    const titlePatch = patches.find((patch) => patch.sectionId === "metadata-title");
    const descriptionPatch = patches.find((patch) => patch.sectionId === "metadata-description");

    expect(titlePatch?.target).toEqual({
      format: "rank-math",
      pageId: 6,
      field: METADATA_FIELD_KEYS.title,
      label: "title",
    });
    expect(descriptionPatch?.target).toEqual({
      format: "rank-math",
      pageId: 6,
      field: METADATA_FIELD_KEYS.description,
      label: "description",
    });
    expect(titlePatch?.proposedContent).toBe(result.title);
    expect(titlePatch?.currentContent).toBe("Old title");
    expect(patches.every((patch) => patch.validation.valid)).toBe(true);
  });

  it("skips unchanged fields so a run never writes a no-op", () => {
    const result = proposal();
    const patches = metadataProposalToPatches(result, {
      title: result.title,
      description: result.description,
    });

    expect(patches).toHaveLength(0);
  });

  it("creates only the missing field when one side already matches", () => {
    const result = proposal();
    const patches = metadataProposalToPatches(result, {
      title: result.title,
      description: "Different description",
    });

    expect(patches).toHaveLength(1);
    expect(patches[0].sectionId).toBe("metadata-description");
  });
});
