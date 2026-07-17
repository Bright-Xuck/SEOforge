// @forge/preflight-validator/execution-provider
// ExecutionProvider interface for performing actual website modifications.
// Execution Engine depends on this interface, not on WordPress directly.

/**
 * ExecutionProvider defines the contract for executing actions on a website.
 * Each CMS/platform provider (WordPress, Shopify, etc.) implements this interface.
 * 
 * The Execution Engine only calls ExecutionProvider methods — it never knows
 * about WordPress, Shopify, or any other platform details.
 */
export interface ExecutionProvider {
  readonly providerId: string;
  readonly name: string;

  /**
   * Test whether the provider is connected and operational.
   */
  testConnection(): Promise<boolean>;

  // ---- Title operations ----

  /**
   * Update the title of a page.
   */
  updateTitle(pageId: number, newTitle: string): Promise<{ success: boolean; error?: string }>;

  // ---- Meta description operations ----

  /**
   * Update the meta description of a page.
   */
  updateMetaDescription(pageId: number, newDescription: string): Promise<{ success: boolean; error?: string }>;

  // ---- Alt text operations ----

  /**
   * Update the alt text of a media item.
   */
  updateAltText(mediaId: number, newAlt: string): Promise<{ success: boolean; error?: string }>;

  // ---- Canonical operations ----

  /**
   * Update the canonical URL of a page.
   */
  updateCanonical(pageId: number, newCanonical: string): Promise<{ success: boolean; error?: string }>;

  // ---- Schema operations ----

  /**
   * Add or update JSON-LD schema on a page.
   */
  updateSchema(pageId: number, schema: Record<string, unknown>): Promise<{ success: boolean; error?: string }>;

  // ---- Rollback operations ----

  /**
   * Revert a previous action using the stored original value.
   */
  rollback(actionType: string, pageId: number | string, originalValue: Record<string, unknown>): Promise<{ success: boolean; error?: string }>;
}

/**
 * Mock execution provider for testing and dry-run mode.
 * All operations succeed without making real changes.
 */
export function createMockExecutionProvider(): ExecutionProvider {
  return {
    providerId: "mock-execution",
    name: "Mock Execution Provider",

    async testConnection(): Promise<boolean> {
      return true;
    },

    async updateTitle(_pageId: number, _newTitle: string): Promise<{ success: boolean; error?: string }> {
      return { success: true };
    },

    async updateMetaDescription(_pageId: number, _newDescription: string): Promise<{ success: boolean; error?: string }> {
      return { success: true };
    },

    async updateAltText(_mediaId: number, _newAlt: string): Promise<{ success: boolean; error?: string }> {
      return { success: true };
    },

    async updateCanonical(_pageId: number, _newCanonical: string): Promise<{ success: boolean; error?: string }> {
      return { success: true };
    },

    async updateSchema(_pageId: number, _schema: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
      return { success: true };
    },

    async rollback(_actionType: string, _pageId: number | string, _originalValue: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
      return { success: true };
    },
  };
}