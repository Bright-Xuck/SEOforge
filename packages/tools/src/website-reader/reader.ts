// @forge/tools/website-reader
// Reads a URL and returns a structured WebsiteSnapshot.
// No AI. No SEO analysis.

import type { AxiosInstance, AxiosResponse } from "axios";
import axios from "axios";
import { z } from "zod";
import type { RawHtml, WebsiteSnapshot } from "@forge/core";
import { WebsiteReadError } from "@forge/core";
import { parseHtml } from "../html-parser/parser.js";

/**
 * HTTP client abstraction for testability.
 */
export interface HttpClient {
  get(url: string): Promise<AxiosResponse<string>>;
}

/**
 * Creates a default Axios-based HTTP client with:
 * - 30s timeout
 * - Redirect following (max 10)
 * - User-Agent header
 * - Response type text
 */
export function createHttpClient(): HttpClient {
  const instance: AxiosInstance = axios.create({
    timeout: 30_000,
    maxRedirects: 10,
    headers: {
      "User-Agent": "Forge/0.2.0 (Website Reader; +https://forge.dev)",
    },
    responseType: "text",
  });

  return {
    get: (url: string) => instance.get<string>(url),
  };
}

const urlSchema = z.string().url();

/**
 * Read a website URL and produce a structured WebsiteSnapshot.
 *
 * @param url - The URL to read.
 * @param httpClient - Optional HTTP client (for test injection).
 * @returns A WebsiteSnapshot on success, or throws WebsiteReadError.
 */
export async function readWebsite(
  url: string,
  httpClient: HttpClient = createHttpClient(),
): Promise<WebsiteSnapshot> {
  const parsedUrl = urlSchema.safeParse(url);

  if (!parsedUrl.success) {
    throw new WebsiteReadError("invalid-url", `Invalid URL: ${url}`);
  }

  let response: AxiosResponse<string>;

  try {
    response = await httpClient.get(parsedUrl.data);
  } catch (error: unknown) {
    throw mapHttpError(error);
  }

  const rawContentType = response.headers["content-type"];
  const contentType =
    typeof rawContentType === "string"
      ? rawContentType
      : Array.isArray(rawContentType)
        ? rawContentType.join(", ")
        : "";

  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
    throw new WebsiteReadError(
      "non-html",
      `Response is not HTML (Content-Type: ${contentType})`,
      undefined,
      response.status,
    );
  }

  const html = response.data;
  const finalUrl = getEffectiveUrl(response, parsedUrl.data);
  const parsed = parseHtml(html, finalUrl);

  return {
    originalUrl: parsedUrl.data,
    finalUrl,
    statusCode: response.status,
    responseHeaders: flattenHeaders(response.headers),
    pageTitle: parsed.pageTitle,
    metaDescription: parsed.metaDescription,
    canonicalUrl: parsed.canonicalUrl,
    language: parsed.language,
    charset: parsed.charset,
    favicon: parsed.favicon,
    robots: parsed.robots,
    headings: parsed.headings,
    images: parsed.images,
    links: parsed.links,
    scripts: parsed.scripts,
    stylesheets: parsed.stylesheets,
    jsonLd: parsed.jsonLd,
    openGraph: parsed.openGraph,
    twitterCard: parsed.twitterCard,
    rawHtml: html as RawHtml,
  };
}

/**
 * Map an Axios error to a typed WebsiteReadError.
 */
function mapHttpError(error: unknown): WebsiteReadError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;

    if (error.code === "ECONNABORTED") {
      return new WebsiteReadError("timeout", "Connection timed out", error);
    }

    if (error.code === "ENOTFOUND" || error.code === "EAI_AGAIN") {
      return new WebsiteReadError("dns", "DNS resolution failed", error);
    }

    if (error.code === "ECONNREFUSED" || error.code === "ERRADDRINUSE") {
      return new WebsiteReadError("network", "Connection refused", error);
    }

    if (status && status >= 400 && status < 600) {
      return new WebsiteReadError(
        "http",
        `HTTP ${status}: ${error.response?.statusText ?? "Unknown"}`,
        error,
        status,
      );
    }

    if (error.message?.includes("redirect")) {
      return new WebsiteReadError("redirect-loop", "Redirect loop detected", error);
    }

    return new WebsiteReadError("network", error.message, error);
  }

  if (error instanceof Error) {
    return new WebsiteReadError("network", error.message, error);
  }

  return new WebsiteReadError("network", "Unknown network error");
}

/**
 * Get the effective URL after redirects.
 */
function getEffectiveUrl(response: AxiosResponse<string>, originalUrl: string): string {
  return response.request?.res?.responseUrl ?? response.request?._currentUrl ?? originalUrl;
}

/**
 * Flatten Axios response headers into a Record<string, string>.
 */
function flattenHeaders(headers: AxiosResponse["headers"]): Record<string, string> {
  const flat: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === "string") {
      flat[key] = value;
    } else if (Array.isArray(value)) {
      flat[key] = value.join(", ");
    }
  }

  return flat;
}
