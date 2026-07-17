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
  | "invalid-url"
  | "dns"
  | "timeout"
  | "http"
  | "redirect-loop"
  | "non-html"
  | "network";

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
 * Discriminated error kinds for provider operations.
 */
export type ProviderErrorKind =
  | "authentication"
  | "connection"
  | "unauthorized"
  | "not-found"
  | "rate-limit"
  | "server"
  | "invalid-response";

/**
 * Typed error for provider operations.
 */
export class ProviderError extends ForgeError {
  public readonly kind: ProviderErrorKind;
  public readonly statusCode?: number;

  constructor(kind: ProviderErrorKind, message: string, cause?: unknown, statusCode?: number) {
    super(`PROVIDER_${kind.toUpperCase().replace("-", "_")}`, message, cause);
    this.name = "ProviderError";
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
 * Branded type for stable finding identifiers.
 * Format: category.finding_name (e.g., "seo.missing_title", "metadata.missing_og")
 */
export type FindingId = string & { readonly __brand: "FindingId" };

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
 * Metadata for a rule or capability.
 */
export interface RuleMetadata {
  readonly id: FindingId;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly category: Category;
  readonly defaultSeverity: Severity;
  readonly author?: string;
  readonly documentationUrl?: string;
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
 * The id field is a stable, deterministic identifier (e.g., "seo.missing_title").
 */
export interface Finding {
  readonly id: FindingId;
  readonly title: string;
  readonly description: string;
  readonly severity: Severity;
  readonly category: Category;
  readonly evidence: Evidence[];
  readonly location?: string;
  readonly confidence: number;
  readonly fixable: boolean;
  readonly ruleMetadata?: RuleMetadata;
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
  readonly metadata: RuleMetadata;
  analyze(snapshot: WebsiteSnapshot): Finding[];
}

/**
 * Capability manifest for plugins.
 */
export interface CapabilityManifest {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly supportedPlatforms: string[];
  readonly requiredTools: string[];
  readonly supportedInputs: string[];
  readonly supportedOutputs: string[];
}

/**
 * Base plugin interface.
 */
export interface Plugin {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly manifest: CapabilityManifest;
  readonly supportedPlatforms: string[];
  readonly requiredTools: string[];
  readonly supportedInputs: string[];
  readonly supportedOutputs: string[];
  readonly supportedActions?: string[];
}

// =============================================================================
// PROVIDER INTERFACES
// =============================================================================

/**
 * Connection configuration for WordPress authentication.
 */
export interface WordPressConnectionConfig {
  readonly siteUrl: string;
  readonly username: string;
  readonly applicationPassword: string;
  readonly apiVersion?: string;
  readonly providerVersion?: string;
  readonly connectionStatus?: "connected" | "disconnected" | "error";
}

/**
 * WordPress post model.
 */
export interface WordPressPost {
  readonly id: number;
  readonly title: string;
  readonly content: string;
  readonly excerpt: string;
  readonly slug: string;
  readonly status: string;
  readonly type: string;
  readonly link: string;
  readonly date: string;
  readonly modified: string;
  readonly featuredMedia: number;
}

/**
 * WordPress page model.
 */
export interface WordPressPage {
  readonly id: number;
  readonly title: string;
  readonly content: string;
  readonly excerpt: string;
  readonly slug: string;
  readonly status: string;
  readonly type: string;
  readonly link: string;
  readonly date: string;
  readonly modified: string;
  readonly featuredMedia: number;
}

/**
 * WordPress media model.
 */
export interface WordPressMedia {
  readonly id: number;
  readonly title: string;
  readonly caption: string;
  readonly altText: string;
  readonly url: string;
  readonly sourceUrl: string;
  readonly mimeType: string;
  readonly mediaType: string;
  readonly width: number;
  readonly height: number;
}

/**
 * WordPress category model.
 */
export interface WordPressCategory {
  readonly id: number;
  readonly name: string;
  readonly slug: string;
  readonly description: string;
  readonly count: number;
}

/**
 * WordPress tag model.
 */
export interface WordPressTag {
  readonly id: number;
  readonly name: string;
  readonly slug: string;
  readonly description: string;
  readonly count: number;
}

/**
 * WordPress site settings model.
 */
export interface WordPressSettings {
  readonly title: string;
  readonly description: string;
  readonly url: string;
  readonly email: string;
  readonly timezone: string;
  readonly dateFormat: string;
  readonly timeFormat: string;
  readonly language: string;
}

/**
 * WordPress site info model.
 */
export interface WordPressSiteInfo {
  readonly name: string;
  readonly description: string;
  readonly url: string;
  readonly home: string;
  readonly wpVersion: string;
  readonly theme: WordPressThemeInfo;
  readonly plugins: WordPressPluginInfo[];
}

/**
 * WordPress theme information.
 */
export interface WordPressThemeInfo {
  readonly name: string;
  readonly version: string;
  readonly stylesheet: string;
}

/**
 * WordPress plugin information.
 */
export interface WordPressPluginInfo {
  readonly name: string;
  readonly version: string;
  readonly status: string;
}

/**
 * Capability descriptor for WordPress.
 */
export interface CapabilityDescriptor {
  readonly supportsMedia: boolean;
  readonly supportsMenus: boolean;
  readonly supportsPlugins: boolean;
  readonly supportsCustomPostTypes: boolean;
  readonly supportsTaxonomies: boolean;
  readonly supportsFeaturedImages: boolean;
  readonly supportsApplicationPasswords: boolean;
}

/**
 * Paginated response wrapper.
 */
export interface PaginatedResponse<T> {
  readonly data: T[];
  readonly totalItems: number;
  readonly totalPages: number;
  readonly currentPage: number;
}

/**
 * Request options for WordPress API.
 */
export interface WordPressRequestOptions {
  readonly page?: number;
  readonly perPage?: number;
  readonly search?: string;
  readonly status?: string;
}

/**
 * Base provider interface.
 * All providers must implement this to be registered.
 */
export interface IProvider {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
}

/**
 * Authentication provider interface.
 */
export interface IAuthenticationProvider extends IProvider {
  /**
   * Test connection credentials.
   * Returns true if credentials are valid.
   */
  testConnection(): Promise<boolean>;
}

/**
 * Website provider interface.
 * Read-access to website structure and information.
 */
export interface IWebsiteProvider extends IProvider {
  /**
   * Get general site information.
   */
  getSiteInfo(): Promise<WordPressSiteInfo>;
}

/**
 * Content provider interface.
 * Read-access to posts and pages.
 */
export interface IContentProvider extends IProvider {
  /**
   * Get all posts.
   */
  getPosts(options?: WordPressRequestOptions): Promise<PaginatedResponse<WordPressPost>>;

  /**
   * Get a single post by ID.
   */
  getPost(id: number): Promise<WordPressPost | null>;

  /**
   * Get all pages.
   */
  getPages(options?: WordPressRequestOptions): Promise<PaginatedResponse<WordPressPage>>;

  /**
   * Get a single page by ID.
   */
  getPage(id: number): Promise<WordPressPage | null>;
}

/**
 * Media provider interface.
 * Read-access to media library.
 */
export interface IMediaProvider extends IProvider {
  /**
   * Get all media items.
   */
  getMedia(options?: WordPressRequestOptions): Promise<PaginatedResponse<WordPressMedia>>;

  /**
   * Get a single media item by ID.
   */
  getMediaItem(id: number): Promise<WordPressMedia | null>;
}

/**
 * Metadata provider interface.
 */
export interface IMetadataProvider extends IProvider {
  /**
   * Get site settings.
   */
  getSettings(): Promise<WordPressSettings>;
}

/**
 * Taxonomy provider interface.
 * Read-access to categories and tags.
 */
export interface ITaxonomyProvider extends IProvider {
  /**
   * Get all categories.
   */
  getCategories(): Promise<WordPressCategory[]>;

  /**
   * Get all tags.
   */
  getTags(): Promise<WordPressTag[]>;
}

/**
 * Full WordPress provider interface.
 * Combines all capability interfaces.
 */
export interface IWordPressProvider
  extends IWebsiteProvider,
    IContentProvider,
    IMediaProvider,
    IMetadataProvider,
    ITaxonomyProvider,
    IAuthenticationProvider {
  /**
   * Detect capabilities of the WordPress site.
   */
  detectCapabilities(): Promise<CapabilityDescriptor>;
}

// =============================================================================
// EXECUTION PROVIDER INTERFACE
// =============================================================================

/**
 * Payload for updating page title.
 */
export interface UpdateTitlePayload {
  readonly pageId: number;
  readonly newTitle: string;
}

/**
 * Payload for updating meta description.
 */
export interface UpdateMetaDescriptionPayload {
  readonly pageId: number;
  readonly newDescription: string;
}

/**
 * Payload for updating image alt text.
 */
export interface UpdateAltTextPayload {
  readonly mediaId: number;
  readonly newAlt: string;
}

/**
 * Payload for updating canonical URL.
 */
export interface UpdateCanonicalPayload {
  readonly pageId: number;
  readonly newCanonical: string;
}

/**
 * Payload for updating schema (JSON-LD).
 */
export interface UpdateSchemaPayload {
  readonly pageId: number;
  readonly schema: Record<string, unknown>;
}

/**
 * Execution provider interface.
 * Allows execution of actions on a website.
 */
export interface ExecutionProvider extends IProvider {
  /**
   * Update page title.
   */
  updateTitle(payload: UpdateTitlePayload): Promise<Result<void>>;

  /**
   * Update meta description.
   */
  updateMetaDescription(payload: UpdateMetaDescriptionPayload): Promise<Result<void>>;

  /**
   * Update image alt text.
   */
  updateAltText(payload: UpdateAltTextPayload): Promise<Result<void>>;

  /**
   * Update canonical URL.
   */
  updateCanonical(payload: UpdateCanonicalPayload): Promise<Result<void>>;

  /**
   * Update schema (JSON-LD).
   */
  updateSchema(payload: UpdateSchemaPayload): Promise<Result<void>>;
}