// @forge/content-generation
// Section diffs for review (Sprint 17). Feeds Sprint 18 visual review.

/**
 * A diff between the current and generated section content.
 */
export interface SectionDiff {
  readonly sectionId: string;
  readonly current: string;
  readonly generated: string;
  readonly changedSentences: string[];
  readonly addedEntities: string[];
  readonly removedEntities: string[];
  readonly seoScoreDelta: number;
}
