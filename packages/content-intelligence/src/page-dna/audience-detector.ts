// @forge/content-intelligence
// Heuristic audience profiling.
// NO AI.

import type { AudienceLevel, AudienceProfile, SearchIntent, WebsiteSnapshot } from "../types.js";

const BEGINNER_SIGNALS = ["beginner", "getting started", "introduction", "basics", "easy", "step by step", "for dummies"];
const EXPERT_SIGNALS = ["advanced", "in-depth", "technical", "api", "configuration", "architecture", "benchmark"];
const ENTERPRISE_SIGNALS = ["enterprise", "scale", "team", "organization", "compliance", "sso", "security"];
const INTERMEDIATE_SIGNALS = ["guide", "how to", "tips", "best practices", "tutorial"];

export function detectAudience(snapshot: WebsiteSnapshot, intent: SearchIntent): AudienceProfile {
  const text = `${snapshot.pageTitle} ${snapshot.metaDescription} ${snapshot.rawHtml}`.toLowerCase();
  const signals: string[] = [];

  let beginner = 0;
  let expert = 0;
  let enterprise = 0;
  let intermediate = 0;

  for (const signal of BEGINNER_SIGNALS) {
    if (text.includes(signal)) {
      beginner += 1;
      signals.push(`beginner: ${signal}`);
    }
  }
  for (const signal of EXPERT_SIGNALS) {
    if (text.includes(signal)) {
      expert += 1;
      signals.push(`expert: ${signal}`);
    }
  }
  for (const signal of ENTERPRISE_SIGNALS) {
    if (text.includes(signal)) {
      enterprise += 1;
      signals.push(`enterprise: ${signal}`);
    }
  }
  for (const signal of INTERMEDIATE_SIGNALS) {
    if (text.includes(signal)) {
      intermediate += 1;
      signals.push(`intermediate: ${signal}`);
    }
  }

  if (intent.primary === "transactional") {
    enterprise += 0.5;
  }

  const scores: Record<AudienceLevel, number> = {
    beginner,
    expert,
    enterprise,
    intermediate,
    general: 0,
  };

  let level: AudienceLevel = "general";
  let best = 0;
  for (const candidate of Object.keys(scores) as AudienceLevel[]) {
    if (scores[candidate] > best) {
      best = scores[candidate];
      level = candidate;
    }
  }

  const confidence = best === 0 ? 0.5 : Math.min(1, 0.5 + best * 0.15);

  if (best === 0) {
    signals.push("no strong audience signals; defaulting to general");
  }

  return { level, confidence, signals };
}
