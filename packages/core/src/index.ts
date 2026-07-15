// @forge/core
// Core domain models, interfaces, and base contracts.
// Platform-independent. No runtime dependencies.

/**
 * A discriminated result type for operations that may fail.
 * Either contains a success value or an error.
 */
export type Result<T, E = ForgeError> = Success<T> | Failure<E>;

export interface Success<T> {
  readonly ok: true;
  readonly value: T;
}

export interface Failure<E = ForgeError> {
  readonly ok: false;
  readonly error: E;
}

/**
 * Creates a successful result.
 */
export function success<T>(value: T): Success<T> {
  return { ok: true, value };
}

/**
 * Creates a failed result.
 */
export function failure<E>(error: E): Failure<E> {
  return { ok: false, error };
}

/**
 * Base error type for Forge.
 * Wraps low-level errors with context for higher layers.
 */
export class ForgeError extends Error {
  public readonly code: string;
  public readonly cause?: unknown;

  constructor(code: string, message: string, cause?: unknown) {
    super(message);
    this.name = "ForgeError";
    this.code = code;
    this.cause = cause;
  }
}

/**
 * Discriminated error kinds for website reading operations.
 */
export type WebsiteReadErrorKind =
  "invalid-url" | "dns" | "timeout" | "http" | "redirect-loop" | "non-html" | "network";

/**
 * Typed error for website reading failures.
 */
export class WebsiteReadError extends ForgeError {
  public readonly kind: WebsiteReadErrorKind;
  public readonly statusCode?: number;

  constructor(kind: WebsiteReadErrorKind, message: string, cause?: unknown, statusCode?: number) {
    super(`WEBSITE_READ_${kind.toUpperCase().replace("-", "_")}`, message, cause);
    this.name = "WebsiteReadError";
    this.kind = kind;
    this.statusCode = statusCode;
  }
}

/**
 * A single heading element from a page.
 */
export interface Heading {
  readonly level: 1 | 2 | 3 | 4 | 5 | 6;
  readonly text: string;
}

/**
 * A link element from a page.
 */
export interface Link {
  readonly href: string;
  readonly text: string;
  readonly isInternal: boolean;
}

/**
 * An image element from a page.
 */
export interface Image {
  readonly src: string;
  readonly alt: string;
}

/**
 * A script reference from a page.
 */
export interface ScriptRef {
  readonly src?: string;
  readonly type?: string;
  readonly inline?: boolean;
}

/**
 * A stylesheet reference from a page.
 */
export interface StylesheetRef {
  readonly href?: string;
  readonly inline?: boolean;
}

/**
 * Open Graph metadata from a page.
 */
export interface OpenGraph {
  readonly title?: string;
  readonly description?: string;
  readonly image?: string;
  readonly url?: string;
  readonly type?: string;
  readonly siteName?: string;
}

/**
 * Twitter Card metadata from a page.
 */
export interface TwitterCard {
  readonly card?: string;
  readonly title?: string;
  readonly description?: string;
  readonly image?: string;
  readonly site?: string;
}

/**
 * Robots directives parsed from meta tags and headers.
 */
export interface RobotsDirectives {
  readonly noindex: boolean;
  readonly nofollow: boolean;
  readonly noarchive: boolean;
  readonly nosnippet: boolean;
}

/**
 * Branded type for raw HTML — indicates this data is for internal use only.
 */
export type RawHtml = string & { readonly __brand: "RawHtml" };

/**
 * Structured snapshot of a single page read.
 */
export interface WebsiteSnapshot {
  readonly originalUrl: string;
  readonly finalUrl: string;
  readonly statusCode: number;
  readonly responseHeaders: Record<string, string>;
  readonly pageTitle: string;
  readonly metaDescription: string;
  readonly canonicalUrl: string;
  readonly language: string;
  readonly charset: string;
  readonly favicon: string;
  readonly robots: RobotsDirectives;
  readonly headings: Heading[];
  readonly images: Image[];
  readonly links: Link[];
  readonly scripts: ScriptRef[];
  readonly stylesheets: StylesheetRef[];
  readonly jsonLd: Record<string, unknown>[];
  readonly openGraph: OpenGraph;
  readonly twitterCard: TwitterCard;
  /** Internal only — consumers should use structured fields above. */
  readonly rawHtml: RawHtml;
}

/**
 * Log levels supported by Forge.
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * A structured log entry.
 */
export interface LogEntry {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly component: string;
  readonly message: string;
  readonly executionId?: string;
  readonly websiteId?: string;
  readonly taskId?: string;
}

/**
 * Finding severity levels for analysis findings.
 */
export type Severity = "info" | "low" | "medium" | "high" | "critical";

/**
 * Finding categories for analysis findings.
 */
export type Category =
  | "seo"
  | "accessibility"
  | "performance"
  | "content"
  | "metadata"
  | "links"
  | "images"
  | "technical";

/**
 * Branded type for stable finding codes.
 */
export type FindingCode = string & { readonly __brand: "FindingCode" };

/**
 * Evidence supporting a finding.
 */
export interface Evidence {
  readonly source: string;
  readonly detail: string;
  readonly value?: string;
}

/**
 * Difficulty levels for recommendations.
 */
export type Difficulty = "easy" | "medium" | "hard";

/**
 * Impact levels for recommendations.
 */
export type Impact = "high" | "medium" | "low";

/**
 * Priority levels for recommendations.
 */
export type Priority = "critical" | "high" | "medium" | "low";

/**
 * A single recommendation step.
 */
export interface RecommendationStep {
  readonly order: number;
  readonly description: string;
}

/**
 * A single recommendation generated from a finding.
 */
export interface Recommendation {
  readonly id: string;
  readonly findingId: string;
  readonly title: string;
  readonly description: string;
  readonly reason: string;
  readonly priority: Priority;
  readonly difficulty: Difficulty;
  readonly estimatedTime: string;
  readonly expectedImpact: Impact;
  readonly implementationSteps: RecommendationStep[];
  readonly references: string[];
  readonly automatable: boolean;
  readonly manualReviewRequired: boolean;
}

/**
 * Summary of recommendations by priority.
 */
export interface RecommendationSummary {
  readonly total: number;
  readonly byPriority: Record<Priority, number>;
}

/**
 * Recommendation report generated from analysis findings.
 */
export interface RecommendationReport {
  readonly url: string;
  readonly generatedAt: string;
  readonly recommendations: Recommendation[];
  readonly summary: RecommendationSummary;
  readonly estimatedEffort: string;
  readonly priorityBreakdown: Record<Priority, number>;
}

/**
 * A single analysis finding.
 */
export interface Finding {
  readonly id: string;
  readonly code: FindingCode;
  readonly title: string;
  readonly description: string;
  readonly severity: Severity;
  readonly category: Category;
  readonly evidence: Evidence[];
  readonly location?: string;
  readonly confidence: number;
  readonly fixable: boolean;
}

/**
 * Summary of findings by severity.
 */
export interface FindingsSummary {
  readonly total: number;
  readonly bySeverity: Record<Severity, number>;
}

/**
 * Complete analysis report for a website snapshot.
 */
export interface AnalysisReport {
  readonly url: string;
  readonly analyzedAt: string;
  readonly findings: Finding[];
  readonly summary: FindingsSummary;
}

/**
 * Interface for analysis rules.
 * Each rule analyzes a WebsiteSnapshot and returns zero or more findings.
 */
export interface AnalysisRule {
  readonly code: FindingCode;
  analyze(snapshot: WebsiteSnapshot): Finding[];
}
