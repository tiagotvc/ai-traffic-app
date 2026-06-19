import "server-only";

import type { LlmProviderId } from "@/lib/llm/types";

export function getGeminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY?.trim() || undefined;
}

export function getAnthropicApiKey(): string | undefined {
  return process.env.ANTHROPIC_API_KEY?.trim() || undefined;
}

export function getAnthropicModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-20250514";
}

export function getApiKeyForProvider(provider: LlmProviderId): string | undefined {
  return provider === "claude" ? getAnthropicApiKey() : getGeminiApiKey();
}

export function getLlmProvidersStatus() {
  return {
    gemini: Boolean(getGeminiApiKey()),
    claude: Boolean(getAnthropicApiKey())
  };
}
