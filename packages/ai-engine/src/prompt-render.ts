// @forge/ai-engine
// Provider-neutral prompt rendering.
//
// Callers may pass either a plain string or a registry PromptDefinition plus
// variables. Providers only understand a final string; rendering here means
// every provider (OpenAI, Anthropic, Gemini, OpenRouter, Ollama) honours
// `request.variables` instead of sending the raw `{{placeholder}}` template.

import { renderPromptTemplate } from "@forge/prompt-registry";
import type { GenerateRequest } from "./types.js";

/**
 * Resolve a GenerateRequest to the exact text sent to the provider.
 * Variables are only substituted for PromptDefinition prompts; a raw string is
 * already final and is passed through untouched.
 */
export function resolveRequestPrompt(request: GenerateRequest): GenerateRequest {
  if (typeof request.prompt === "string") {
    return request;
  }
  const template = request.prompt.template;
  if (!request.variables || Object.keys(request.variables).length === 0) {
    return { ...request, prompt: template };
  }
  return { ...request, prompt: renderPromptTemplate(template, request.variables) };
}
