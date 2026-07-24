// @forge/content-generation
// Deterministic prohibited-words engine.
// No AI, no providers.

export interface ProhibitedWordsResult {
  readonly found: string[];
  readonly suggestions: string[];
}

const COMMON_PROHIBITED = ["spam", "scam", "cheap", "free", "guarantee", "100%", "act now", "click here"];

export function checkProhibitedWords(content: string, prohibited: string[] = []): ProhibitedWordsResult {
  const lower = content.toLowerCase();
  const allProhibited = [...COMMON_PROHIBITED, ...prohibited];
  const found = allProhibited.filter((word) => lower.includes(word.toLowerCase()));
  const suggestions = found.map((word) => `Replace "${word}" with brand-appropriate language`);
  return { found, suggestions };
}
