// @forge/content-generation
// Deterministic SEO validator — no AI, no providers.

/**
 * SEO validation report for generated content.
 */
export interface SEOValidationReport {
  readonly keywordCoverage: number;
  readonly headingQuality: number;
  readonly wordCount: number;
  readonly hasTargetKeyword: boolean;
  readonly keywordInHeadings: boolean;
  readonly issues: string[];
  readonly score: number;
}

/**
 * Validate generated content for SEO best practices.
 */
export function validateSEO(
  content: string,
  primaryKeyword: string,
  secondaryKeywords: string[],
): SEOValidationReport {
  const issues: string[] = [];
  const lower = content.toLowerCase();
  const hasTargetKeyword = primaryKeyword ? lower.includes(primaryKeyword.toLowerCase()) : true;
  const keywordInHeadings = checkKeywordInHeadings(content, primaryKeyword);
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const keywordCoverage = computeKeywordCoverage(lower, [primaryKeyword, ...secondaryKeywords]);

  if (!hasTargetKeyword) issues.push("Target keyword not found in content");
  if (!keywordInHeadings) issues.push("Target keyword not found in headings");
  if (wordCount < 100) issues.push("Content too short (under 100 words)");

  const score = computeSEOScore(wordCount, hasTargetKeyword, keywordInHeadings, issues.length);

  return {
    keywordCoverage,
    headingQuality: score > 70 ? 1 : 0.5,
    wordCount,
    hasTargetKeyword,
    keywordInHeadings,
    issues,
    score,
  };
}

function checkKeywordInHeadings(content: string, keyword: string): boolean {
  if (!keyword) return true;
  const headingLines = content.split("\n").filter((line) => line.trim().startsWith("#"));
  return headingLines.some((line) => line.toLowerCase().includes(keyword.toLowerCase()));
}

function computeKeywordCoverage(content: string, keywords: string[]): number {
  if (keywords.length === 0) return 1;
  const found = keywords.filter((kw) => kw && content.includes(kw.toLowerCase())).length;
  return found / keywords.length;
}

function computeSEOScore(
  wordCount: number,
  hasKeyword: boolean,
  keywordInHeadings: boolean,
  issueCount: number,
): number {
  let score = 50;
  if (wordCount >= 300) score += 20;
  else if (wordCount >= 150) score += 10;
  if (hasKeyword) score += 15;
  if (keywordInHeadings) score += 10;
  score -= issueCount * 5;
  return Math.max(0, Math.min(100, score));
}