// @forge/preflight-validator/mock-provider
// Mock execution provider for testing purposes.

/**
 * Mock execution provider for testing.
 * Simulates responses without making real API calls.
 */
export class MockExecutionProvider {
  readonly id = "mock-execution";
  readonly name = "Mock Execution Provider";
  readonly version = "0.1.0";
  readonly description = "Mock provider for testing preflight validation";

  // Simulated page data for validation
  private readonly pages = new Map<number, { title: string; metaDescription: string; altText: string }>();

  constructor() {
    // Initialize with some mock data
    this.pages.set(1, { title: "Test Page", metaDescription: "", altText: "" });
    this.pages.set(2, { title: "About Us", metaDescription: "About page description", altText: "Image alt" });
  }

  // Execution methods (no-ops for mock)
  async updateTitle(): Promise<void> {}
  async updateMetaDescription(): Promise<void> {}
  async updateAltText(): Promise<void> {}
  async updateCanonical(): Promise<void> {}
  async updateSchema(): Promise<void> {}

  /**
   * Check if a page exists (for validation rules).
   */
  pageExists(pageId: number): boolean {
    return this.pages.has(pageId);
  }

  /**
   * Get current page title (for validation).
   */
  getPageTitle(pageId: number): string | undefined {
    return this.pages.get(pageId)?.title;
  }

  /**
   * Check if meta description exists (for validation).
   */
  pageHasMetaDescription(pageId: number): boolean {
    const page = this.pages.get(pageId);
    return page !== undefined && page.metaDescription.length > 0;
  }

  /**
   * Check if alt text exists (for validation).
   */
  imageHasAltText(mediaId: number): boolean {
    const page = this.pages.get(mediaId);
    return page !== undefined && page.altText.length > 0;
  }

  /**
   * Get all page IDs.
   */
  getAllPageIds(): number[] {
    return Array.from(this.pages.keys());
  }
}