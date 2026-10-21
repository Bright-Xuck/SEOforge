// @forge/ai-engine — Z.ai provider retry and health tests.

import { afterEach, describe, expect, it, vi } from "vitest";
import { ZAIProvider } from "./zai.js";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("ZAIProvider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("retries transient 429/503 responses and returns the eventual completion", async () => {
    vi.useFakeTimers();
    let calls = 0;
    const fetchMock = vi.fn(async (_input: string | URL | Request, _init?: RequestInit): Promise<Response> => {
      calls += 1;
      if (calls === 1) return jsonResponse(429, { error: { message: "overloaded" } });
      if (calls === 2) return jsonResponse(503, { error: { message: "unavailable" } });
      return jsonResponse(200, { choices: [{ message: { content: "hello from glm" } }] });
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = new ZAIProvider({ apiKey: "test-key", model: "glm-4.5-flash" });
    const pending = provider.generate({ prompt: "Write a headline." });
    await vi.runAllTimersAsync();
    const result = await pending;

    expect(result.output).toBe("hello from glm");
    expect(result.provider).toBe("zai");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.z.ai/api/paas/v4/chat/completions");
  });

  it("reports retry exhaustion when every attempt is rate limited", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(async () => jsonResponse(429, { error: { message: "overloaded" } }));
    vi.stubGlobal("fetch", fetchMock);

    const provider = new ZAIProvider({ apiKey: "test-key", model: "glm-4.5-flash" });
    const pending = provider.generate({ prompt: "Write a headline." });
    const assertion = expect(pending).rejects.toMatchObject({ code: "AI_RETRY_EXHAUSTED" });
    await vi.runAllTimersAsync();
    await assertion;

    // Initial attempt + five retries configured by ZAIProvider.
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it("health uses the verified default model when no model is supplied", async () => {
    const fetchMock = vi.fn(async (_input: string | URL | Request, _init?: RequestInit): Promise<Response> => jsonResponse(200, {}));
    vi.stubGlobal("fetch", fetchMock);

    const provider = new ZAIProvider({ apiKey: "test-key" });
    await expect(provider.health()).resolves.toBe(true);

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as { model?: string };
    expect(body.model).toBe("glm-4.5-flash");
  });

  it("health returns true after a transient 503 and false when retries are exhausted", async () => {
    vi.useFakeTimers();
    let calls = 0;
    const fetchMock = vi.fn(async () => {
      calls += 1;
      return calls === 1 ? jsonResponse(503, {}) : jsonResponse(200, {});
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = new ZAIProvider({ apiKey: "test-key" });
    const healthy = provider.health();
    await vi.runAllTimersAsync();
    await expect(healthy).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    fetchMock.mockImplementation(async () => jsonResponse(503, {}));
    const unhealthy = provider.health();
    await vi.runAllTimersAsync();
    await expect(unhealthy).resolves.toBe(false);
  });
});
