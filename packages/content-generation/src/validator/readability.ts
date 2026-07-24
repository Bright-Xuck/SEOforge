// @forge/content-generation
// Deterministic readability validator.
// No AI, no providers.

export interface ReadabilityValidationReport {
  readonly valid: boolean;
  readonly fleschKincaidGrade: number;
  readonly avgSentenceLength: number;
  readonly avgParagraphLength: number;
  readonly passiveVoicePercentage: number;
  readonly issues: string[];
}

export function validateReadability(content: string): ReadabilityValidationReport {
  const sentences = splitSentences(content);
  const words = content.split(/\s+/).filter(Boolean);
  const syllables = words.reduce((sum, word) => sum + countSyllables(word), 0);

  const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : 0;
  const avgParagraphLength = 0;
  const passiveVoicePercentage = estimatePassiveVoice(content);
  const fleschKincaidGrade = computeFleschKincaidGrade(words.length, sentences.length, syllables);

  const issues: string[] = [];
  if (avgSentenceLength > 25) issues.push("Average sentence length is too high");
  if (fleschKincaidGrade > 12) issues.push("Reading grade level is too high");
  if (passiveVoicePercentage > 20) issues.push("Passive voice usage is high");

  return {
    valid: issues.length === 0,
    fleschKincaidGrade,
    avgSentenceLength,
    avgParagraphLength,
    passiveVoicePercentage,
    issues,
  };
}

function splitSentences(content: string): string[] {
  return content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
}

function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (word.length <= 3) return 1;
  let count = word.match(/[aeiouy]+/g)?.length ?? 1;
  if (word.endsWith("e")) count -= 1;
  if (word.endsWith("le") && word.length > 2) count += 1;
  return Math.max(1, count);
}

function computeFleschKincaidGrade(words: number, sentences: number, syllables: number): number {
  if (words === 0 || sentences === 0) return 0;
  return (0.39 * (words / sentences)) + (11.8 * (syllables / words)) - 15.59;
}

function estimatePassiveVoice(content: string): number {
  const passiveIndicators = content.match(/\b(is|are|was|were|be|been|being)\s+\w+ed\b/gi);
  const sentences = splitSentences(content);
  if (sentences.length === 0) return 0;
  return ((passiveIndicators?.length ?? 0) / sentences.length) * 100;
}
