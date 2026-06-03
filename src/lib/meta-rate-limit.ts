import "server-only";

const META_DELAY_MS = Number(process.env.META_API_DELAY_MS ?? "350");
const MAX_RETRIES = 5;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function isMetaRateLimitPayload(json: unknown): boolean {
  if (!json || typeof json !== "object") return false;
  const err = json as {
    error?: { code?: number; error_subcode?: number; is_transient?: boolean };
  };
  const code = err.error?.code;
  const sub = err.error?.error_subcode;
  if (code === 4 || code === 17 || code === 32 || code === 613) return true;
  if (code === 80000 || code === 80001 || code === 80003 || code === 80004) return true;
  if (sub === 1504022 || sub === 2446079) return true;
  if (err.error?.is_transient === true && code != null) return true;
  return false;
}

export function isMetaRateLimitMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("request limit") ||
    lower.includes("rate limit") ||
    lower.includes("limite de requisi") ||
    lower.includes("solicitações excessivas") ||
    lower.includes("(#4)") ||
    lower.includes("código 4)") ||
    lower.includes("code 4)") ||
    lower.includes("1504022")
  );
}

export function parseInsightsThrottle(headers: Headers): {
  appUtilPct: number;
  accUtilPct: number;
} {
  const raw =
    headers.get("x-fb-ads-insights-throttle") ??
    headers.get("X-FB-Ads-Insights-Throttle") ??
    "";
  if (!raw) return { appUtilPct: 0, accUtilPct: 0 };
  try {
    const j = JSON.parse(raw) as { app_id_util_pct?: number; acc_id_util_pct?: number };
    return {
      appUtilPct: Number(j.app_id_util_pct ?? 0),
      accUtilPct: Number(j.acc_id_util_pct ?? 0)
    };
  } catch {
    return { appUtilPct: 0, accUtilPct: 0 };
  }
}

function rateLimitBackoffMs(attempt: number, json: unknown): number {
  const code =
    json && typeof json === "object"
      ? (json as { error?: { code?: number } }).error?.code
      : undefined;
  const base = code === 4 ? 4000 : 1500;
  return base * 2 ** attempt;
}

export async function metaFetchWithRateLimit<T>(
  url: string,
  init?: RequestInit
): Promise<{ data: T; headers: Headers }> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) await sleep(rateLimitBackoffMs(attempt - 1, lastError));

    const res = await fetch(url, { ...init, cache: "no-store" });
    const json = (await res.json()) as unknown;

    const throttle = parseInsightsThrottle(res.headers);
    if (throttle.accUtilPct > 80 || throttle.appUtilPct > 80) {
      await sleep(3000);
    }

    if (res.ok) {
      await sleep(META_DELAY_MS);
      return { data: json as T, headers: res.headers };
    }

    if (isMetaRateLimitPayload(json) && attempt < MAX_RETRIES - 1) {
      lastError = json;
      continue;
    }

    throw new Error(`Meta Graph error: ${res.status} ${JSON.stringify(json)}`);
  }
  throw new Error(`Meta Graph rate limit: ${JSON.stringify(lastError)}`);
}
