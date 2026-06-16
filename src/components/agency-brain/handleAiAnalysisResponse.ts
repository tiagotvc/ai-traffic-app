import type { FeedbackMessage } from "@/components/agency-brain/FeedbackBanner";

export type AiAnalysisJson = {
  ok?: boolean;
  code?: string;
  error?: string;
  message?: string;
  created?: number;
  rejected?: number;
  deduped?: number;
  warnings?: string[];
  partial?: boolean;
};

type AiMessageKeys = {
  aiLimit: string;
  aiNoKey: string;
  aiRateLimit: string;
  aiServiceError: string;
  aiParseError: string;
  aiSchemaError: string;
  aiNoResults: string;
  aiNoMetrics: string;
  aiGenericError: string;
  aiSuccess: (count: number) => string;
};

function codeToMessage(code: string | undefined, json: AiAnalysisJson, keys: AiMessageKeys): string {
  switch (code) {
    case "NO_AI_KEY":
      return keys.aiNoKey;
    case "PLAN_LIMIT":
      return keys.aiLimit;
    case "RATE_LIMIT":
      return json.error ?? keys.aiRateLimit;
    case "SERVICE_UNAVAILABLE":
      return json.error ?? keys.aiServiceError;
    case "PARSE_ERROR":
      return json.error ?? keys.aiParseError;
    case "SCHEMA_ERROR":
      return json.error ?? keys.aiSchemaError;
    case "NO_METRICS":
      return json.message ?? keys.aiNoMetrics;
    case "NO_RESULTS":
      return json.message ?? keys.aiNoResults;
    default:
      return json.error ?? keys.aiGenericError;
  }
}

export function parseAiAnalysisResponse(
  res: Response,
  json: AiAnalysisJson,
  keys: AiMessageKeys
): { message: FeedbackMessage; shouldRefreshAiStatus: boolean; shouldReload: boolean } | null {
  if (res.status === 402 || json.code === "PLAN_LIMIT") {
    return { message: { type: "err", text: keys.aiLimit }, shouldRefreshAiStatus: false, shouldReload: false };
  }

  if (json.code === "NO_AI_KEY") {
    return { message: { type: "err", text: keys.aiNoKey }, shouldRefreshAiStatus: false, shouldReload: false };
  }

  if (json.code === "RATE_LIMIT" || json.code === "SERVICE_UNAVAILABLE" || res.status === 503) {
    return {
      message: { type: "err", text: codeToMessage(json.code, json, keys) },
      shouldRefreshAiStatus: false,
      shouldReload: false
    };
  }

  if (json.code === "PARSE_ERROR" || json.code === "SCHEMA_ERROR") {
    return {
      message: { type: "err", text: codeToMessage(json.code, json, keys) },
      shouldRefreshAiStatus: false,
      shouldReload: false
    };
  }

  if (json.code === "NO_METRICS") {
    return {
      message: { type: "warn", text: codeToMessage("NO_METRICS", json, keys) },
      shouldRefreshAiStatus: false,
      shouldReload: false
    };
  }

  if (!json.ok) {
    if (json.code === "NO_RESULTS" || json.partial) {
      const detail =
        json.rejected || json.deduped
          ? ` (${json.rejected ?? 0} rejeitados, ${json.deduped ?? 0} duplicados)`
          : "";
      return {
        message: {
          type: "warn",
          text: `${codeToMessage("NO_RESULTS", json, keys)}${detail}`
        },
        shouldRefreshAiStatus: true,
        shouldReload: false
      };
    }
    return {
      message: { type: "err", text: codeToMessage(json.code, json, keys) },
      shouldRefreshAiStatus: false,
      shouldReload: false
    };
  }

  const count = json.created ?? 0;
  let text = keys.aiSuccess(count);
  if (json.warnings?.length) {
    text += ` (${json.warnings.length} avisos)`;
  }
  return {
    message: { type: "ok", text },
    shouldRefreshAiStatus: true,
    shouldReload: true
  };
}
