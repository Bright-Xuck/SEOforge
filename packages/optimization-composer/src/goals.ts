import type { OptimizationGoal, ContentPatchRef } from './types.js';

export const COMMON_GOALS: OptimizationGoal[] = [
  {
    id: 'goal-conversions',
    name: 'Increase Conversions',
    description: 'Optimize content to improve conversion rates through clearer CTAs, trust signals, and persuasive copy',
    bundleId: '',
  },
  {
    id: 'goal-local-seo',
    name: 'Improve Local SEO',
    description: 'Enhance local search visibility with location-specific content, schema, and local keywords',
    bundleId: '',
  },
  {
    id: 'goal-topical-authority',
    name: 'Improve Topical Authority',
    description: 'Build subject matter expertise through comprehensive coverage of related topics and entities',
    bundleId: '',
  },
  {
    id: 'goal-readability',
    name: 'Improve Readability',
    description: 'Enhance content clarity, structure, and accessibility for better user experience',
    bundleId: '',
  },
  {
    id: 'goal-technical-seo',
    name: 'Improve Technical SEO',
    description: 'Fix technical SEO issues including meta tags, headings, schema, and canonical URLs',
    bundleId: '',
  },
  {
    id: 'goal-engagement',
    name: 'Increase Engagement',
    description: 'Boost user engagement metrics through compelling content, internal links, and multimedia',
    bundleId: '',
  },
];

export class GoalAssigner {
  private goals: Map<string, OptimizationGoal> = new Map();

  constructor() {
    for (const goal of COMMON_GOALS) {
      this.goals.set(goal.id, goal);
    }
  }

  registerGoal(goal: OptimizationGoal): void {
    this.goals.set(goal.id, goal);
  }

  getGoal(id: string): OptimizationGoal | undefined {
    return this.goals.get(id);
  }

  listGoals(): OptimizationGoal[] {
    return [...this.goals.values()];
  }

  /**
   * Assign a goal to a bundle by setting the goalId on each patch.
   */
  assignToPatches(goalId: string, patches: ContentPatchRef[]): ContentPatchRef[] {
    const goal = this.goals.get(goalId);
    if (!goal) throw new Error(`Goal not found: ${goalId}`);

    return patches.map((patch) => ({
      ...patch,
      goalId,
    }));
  }

  /**
   * Suggest the best goal for a set of patches based on their sections.
   */
  suggestGoal(patches: ContentPatchRef[]): string {
    const sections = patches.map((p) => p.section.toLowerCase());

    if (sections.some((s) => s.includes('cta') || s.includes('pricing') || s.includes('buy'))) {
      return 'goal-conversions';
    }
    if (sections.some((s) => s.includes('location') || s.includes('address') || s.includes('map'))) {
      return 'goal-local-seo';
    }
    if (sections.some((s) => s.includes('meta') || s.includes('canonical') || s.includes('schema'))) {
      return 'goal-technical-seo';
    }
    if (sections.some((s) => s.includes('content') || s.includes('article') || s.includes('blog'))) {
      return 'goal-topical-authority';
    }

    return 'goal-engagement';
  }
}