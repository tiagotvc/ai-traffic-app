import type { GeminiGenerateMeta } from "@/lib/gemini";

export type AiAnalysisErrorCode =
  | "RATE_LIMIT"
  | "SERVICE_UNAVAILABLE"
  | "PARSE_ERROR"
  | "SCHEMA_ERROR"
  | "UNKNOWN";

export type AiAnalysisError = {
  code: AiAnalysisErrorCode;
  message: string;
};

export type AiRunResult<TItem> = {
  created: number;
  items: TItem[];
  rejected: number;
  deduped: number;
  warnings: string[];
  skippedReason?: "no_api_key" | "no_metrics";
  noResultsReason?: "validation" | "dedupe" | "empty_ai";
  error?: AiAnalysisError;
  modelMeta?: GeminiGenerateMeta;
};
