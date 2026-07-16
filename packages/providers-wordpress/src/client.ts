// @forge/providers-wordpress/client
// WordPress REST API client.

import type {
  PaginatedResponse,
  WordPressRequestOptions,
  ProviderError,
} from "@forge/core";

/**
 * WordPress API error types.
 */
type WPErrorKind =
  | "http"
  | "unauthorized"
  | "forbidden"
  | "not-found"
  | "rate-limit"
  | "server"
  | "invalid-response";

/**
 * WordPress REST client for making authenticated requests.
 */
export class WordPressClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;
  private readonly timeout: number;

  constructor(config: {
    siteUrl: string;
    username: string;
    applicationPassword: string;
  }) {
    // Normalize URL - remove trailing slash
    this.baseUrl = config.siteUrl.replace(/\/+$/, "");
    this.authHeader = "Basic " + btoa(`${config.username}:${config.applicationPassword}`);
    this.timeout = 30000; // 30 seconds
  }

  /**
   * Make a GET request to the WordPress REST API.
   */
  async get<T>(endpoint: string, options?: WordPressRequestOptions): Promise<PaginatedResponse<T>> {
    return this.request(endpoint, "GET", options);
  }

  /**
   * Make a POST request to the WordPress REST API.
   */
  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    const result = await this.request<T>(endpoint, "POST", undefined, data);
    const firstItem = result.data[0];
    if (firstItem === undefined) {
      throw new Error("NO_DATA_RETURNED");
    }
    return firstItem;
  }

  /**
   * Make a PUT request to the WordPress REST API.
   */
  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    const result = await this.request<T>(endpoint, "PUT", undefined, data);
    const firstItem = result.data[0];
    if (firstItem === undefined) {
      throw new Error("NO_DATA_RETURNED");
    }
    return firstItem;
  }

  /**
   * Make a DELETE request to the WordPress REST API.
   */
  async delete(endpoint: string): Promise<void> {
    await this.request<void>(endpoint, "DELETE");
  }

  /**
   * Core request method with retry, timeout, and error handling.
   */
  private async request<T>(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE",
    queryOptions?: WordPressRequestOptions,
    body?: unknown,
  ): Promise<PaginatedResponse<T>> {
    const url = this.buildUrl(endpoint, queryOptions);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: this.authHeader,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw this.mapError(response.status);
      }

      const rawData = (await response.json()) as unknown;

      // Handle single object responses (non-paginated)
      if (!Array.isArray(rawData)) {
        return {
          data: [rawData as T],
          totalItems: 1,
          totalPages: 1,
          currentPage: 1,
        };
      }

      // Handle paginated responses (array)
      const dataArray = rawData as T[];
      const totalItems = parseInt(response.headers.get("X-WP-Total") ?? dataArray.length.toString(), 10);
      const totalPages = parseInt(response.headers.get("X-WP-TotalPages") ?? "1", 10);
      const currentPage = parseInt(response.headers.get("X-WP-Page") ?? "1", 10);

      return {
        data: dataArray,
        totalItems,
        totalPages,
        currentPage,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("REQUEST_TIMEOUT");
      }
      throw error;
    }
  }

  /**
   * Build full URL with query parameters.
   */
  private buildUrl(endpoint: string, options?: WordPressRequestOptions): string {
    let url = `${this.baseUrl}/wp-json/wp/v2/${endpoint.replace(/^\/+|\/+$/g, "")}`;

    if (options) {
      const params = new URLSearchParams();
      if (options.page) params.set("page", options.page.toString());
      if (options.perPage) params.set("per_page", options.perPage.toString());
      if (options.search) params.set("search", options.search);
      if (options.status) params.set("status", options.status);

      const queryString = params.toString();
      if (queryString) {
        url += "?" + queryString;
      }
    }

    return url;
  }

  /**
   * Map HTTP status codes to error types.
   */
  private mapError(status: number): ProviderError {
    const errorMap: Record<number, WPErrorKind> = {
      400: "invalid-response",
      401: "unauthorized",
      403: "forbidden",
      404: "not-found",
      429: "rate-limit",
    };

    const kind = status >= 500 ? "server" : errorMap[status] ?? "http";

    return {
      code: `WP_${kind.toUpperCase()}`,
      message: this.getErrorMessage(kind, status),
      name: "ProviderError",
      kind,
      statusCode: status,
    } as ProviderError;
  }

  private getErrorMessage(kind: WPErrorKind, status: number): string {
    switch (kind) {
      case "unauthorized":
        return "Invalid credentials";
      case "forbidden":
        return "Access denied";
      case "not-found":
        return "Resource not found";
      case "rate-limit":
        return "Rate limit exceeded";
      case "server":
        return `Server error (${status})`;
      default:
        return `HTTP error (${status})`;
    }
  }
}