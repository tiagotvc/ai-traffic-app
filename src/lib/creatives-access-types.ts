/** Types shared between server and client for creatives access warnings. */

export type CreativeAccessWarningCode =
  | "NO_TOKEN"
  | "ACCOUNT_NOT_GRANTED"
  | "TOKEN_EXPIRED"
  | "RATE_LIMIT"
  | "UNKNOWN";

export type CreativeAccessSuggestedAction =
  | "reconnect_meta"
  | "invite_colleague"
  | "retry_later";

export type CreativeAccessWarning = {
  account: string;
  label: string;
  needsReconnect: boolean;
  reason: string | null;
  code: CreativeAccessWarningCode;
  suggestedAction: CreativeAccessSuggestedAction;
  resolvedViaFallback?: boolean;
};
