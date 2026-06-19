import type { z } from "zod";

export type LlmProviderId = "gemini" | "claude";

export type LlmGenerateMeta = {
  provider: LlmProviderId;
  modelRequested: string;
  modelUsed: string;
  fallbackFrom?: string;
};

export type LlmGenerateJsonResult<T> = LlmGenerateMeta & { data: T };

export type LlmGenerateJsonArgs<T> = {
  provider: LlmProviderId;
  prompt: string;
  schema: z.ZodType<T>;
  temperature?: number;
  modelId?: string;
};

export type LlmErrorCode =
  | "NO_API_KEY"
  | "RATE_LIMIT"
  | "SERVICE_UNAVAILABLE"
  | "SCHEMA_ERROR"
  | "PARSE_ERROR"
  | "UNKNOWN";

export type LlmError = { code: LlmErrorCode; message: string };
