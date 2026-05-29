import "server-only";

const META_DELAY_MS = Number(process.env.META_API_DELAY_MS ?? "250");
const MAX_RETRIES = 4;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isRateLimitError(json: unknown): boolean {
  if (!json || typeof json !== "object") return false;
  const err = json as { error?: { code?: number; error_subcode?: number } };
  const code = err.error?.code;
  return code === 17 || code === 613 || code === 80000 || code === 80001;
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

export async function metaFetchWithRateLimit<T>(
  url: string,
  init?: RequestInit
): Promise<{ data: T; headers: Headers }> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) await sleep(META_DELAY_MS * 2 ** attempt);

    const res = await fetch(url, { ...init, cache: "no-store" });
    const json = (await res.json()) as unknown;

    const throttle = parseInsightsThrottle(res.headers);
    if (throttle.accUtilPct > 85 || throttle.appUtilPct > 85) {
      await sleep(2000);
    }

    if (res.ok) {
      await sleep(META_DELAY_MS);
      return { data: json as T, headers: res.headers };
    }

    if (isRateLimitError(json) && attempt < MAX_RETRIES - 1) {
      lastError = json;
      continue;
    }

    throw new Error(`Meta Graph error: ${res.status} ${JSON.stringify(json)}`);
  }
  throw new Error(`Meta Graph rate limit: ${JSON.stringify(lastError)}`);
}
