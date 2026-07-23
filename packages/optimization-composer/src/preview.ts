import type { ContentPatchRef, OptimizationPreview, PatchConflict } from './types.js';

export class PreviewGenerator {
  /**
   * Generate a deterministic optimization preview from a set of patches.
   * No AI used - pure deterministic estimation.
   */
  generate(patches: ContentPatchRef[], conflicts: PatchConflict[]): OptimizationPreview {
    const sections = [...new Set(patches.map((p) => p.section))];

    return {
      title: this.generateTitle(patches),
      estimatedSEOImpact: this.estimateSEOImpact(patches),
      estimatedUXImpact: this.estimateUXImpact(patches),
      estimatedContentQuality: this.estimateContentQuality(patches),
      expectedRankingImprovement: this.estimateRankingImprovement(patches),
      affectedSections: sections,
      warningCount: conflicts.length + this.countWarnings(patches),
      patchCount: patches.length,
      deterministic: true,
    };
  }

  private generateTitle(patches: ContentPatchRef[]): string {
    const sections = [...new Set(patches.map((p) => p.section))];
    if (sections.length === 1) return `${sections[0]} Optimization`;
    if (sections.length <= 3) return `${sections.join(', ')} Optimization`;
    return `${sections[0]} +${sections.length - 1} more sections Optimization`;
  }

  private estimateSEOImpact(patches: ContentPatchRef[]): "high" | "medium" | "low" | "none" {
    const technicalCount = patches.filter(
      (p) => p.section.toLowerCase().includes('meta') || p.section.toLowerCase().includes('schema') || p.section.toLowerCase().includes('canonical'),
    ).length;
    const contentCount = patches.filter(
      (p) => p.section.toLowerCase().includes('hero') || p.section.toLowerCase().includes('content') || p.section.toLowerCase().includes('intro'),
    ).length;

    if (technicalCount >= 3 || (technicalCount >= 1 && contentCount >= 2)) return "high";
    if (technicalCount >= 1 || contentCount >= 1) return "medium";
    return "low";
  }

  private estimateUXImpact(patches: ContentPatchRef[]): "high" | "medium" | "low" | "none" {
    const ctaCount = patches.filter(
      (p) => p.section.toLowerCase().includes('cta') || p.section.toLowerCase().includes('nav') || p.section.toLowerCase().includes('header'),
    ).length;
    const layoutCount = patches.filter(
      (p) => p.section.toLowerCase().includes('hero') || p.section.toLowerCase().includes('footer') || p.section.toLowerCase().includes('sidebar'),
    ).length;

    if (ctaCount >= 2 || layoutCount >= 3) return "high";
    if (ctaCount >= 1 || layoutCount >= 1) return "medium";
    return "low";
  }

  private estimateContentQuality(patches: ContentPatchRef[]): "high" | "medium" | "low" | "none" {
    const contentPatches = patches.filter(
      (p) => !p.section.toLowerCase().includes('schema') && !p.section.toLowerCase().includes('meta') && !p.section.toLowerCase().includes('canonical'),
    );
    if (contentPatches.length >= 5) return "high";
    if (contentPatches.length >= 2) return "medium";
    return contentPatches.length >= 1 ? "low" : "none";
  }

  private estimateRankingImprovement(patches: ContentPatchRef[]): string {
    const impact = this.estimateSEOImpact(patches);
    switch (impact) {
      case "high": return "+15-30% estimated ranking improvement";
      case "medium": return "+5-15% estimated ranking improvement";
      case "low": return "+1-5% estimated ranking improvement";
      case "none": return "Minimal ranking impact expected";
    }
  }

  private countWarnings(patches: ContentPatchRef[]): number {
    let warnings = 0;
    for (const patch of patches) {
      if (patch.priority === "critical" && patch.section.toLowerCase().includes('schema')) warnings++;
    }
    return warnings;
  }
}