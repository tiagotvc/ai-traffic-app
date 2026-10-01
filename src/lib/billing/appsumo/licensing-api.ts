import "server-only";

const BASE_URL = "https://api.licensing.appsumo.com/v2";

export type AppsumoApiLicenseStatus = "active" | "inactive" | "deactivated";

export type AppsumoApiLicense = {
  license_key: string;
  status: AppsumoApiLicenseStatus;
  tier: number;
  created_at: string;
  updated_at: string;
  redemption_url?: string;
  change_plan_url?: string;
  [key: string]: unknown;
};

export type AppsumoApiLicenseEvent = {
  event: string;
  event_timestamp: number;
  license_key: string;
  webhook_responses?: unknown[];
  [key: string]: unknown;
};

export type AppsumoApiWebhookResponse = {
  request: unknown;
  response: unknown;
  [key: string]: unknown;
};

export type AppsumoApiContact = {
  id: number;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
};

export type AppsumoApiProfile = {
  id: number;
  webhook_url: string;
  redirect_url: string;
  contacts: AppsumoApiContact[];
  [key: string]: unknown;
};

export type AppsumoApiPage<T> = {
  results: T[];
  [key: string]: unknown;
};

export type AppsumoListParams = {
  status?: AppsumoApiLicenseStatus;
  page?: number;
  limit?: number;
};

function requireApiKey(): string {
  const key = process.env.APPSUMO_API_KEY?.trim();
  if (!key) throw new Error("APPSUMO_API_KEY not configured");
  return key;
}

/**
 * Thin wrapper around the Licensing API (`api.licensing.appsumo.com/v2`). This is the
 * optional audit/support path — webhooks + OAuth (see webhook-handler.ts, client.ts) are the
 * real-time integration. Rate limit is 20 req/min per the AppSumo docs; callers doing bulk
 * sync (e.g. a monthly reconciliation job) are responsible for their own pacing.
 */
async function appsumoApiRequest<T>(
  method: "GET" | "PUT" | "POST" | "DELETE",
  path: string,
  options: { params?: Record<string, string | number | undefined>; body?: unknown } = {}
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(options.params ?? {})) {
    if (value != null) url.searchParams.set(key, String(value));
  }

  const res = await fetch(url.toString(), {
    method,
    headers: {
      "X-AppSumo-Licensing-Key": requireApiKey(),
      ...(options.body ? { "Content-Type": "application/json" } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!res.ok) {
    throw new Error(`AppSumo Licensing API ${method} ${path} failed: ${res.status} ${await res.text()}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

/** GET /licenses — paginated, optionally filtered by status. For audits and monthly syncs. */
export async function listAppsumoLicenses(
  params: AppsumoListParams = {}
): Promise<AppsumoApiPage<AppsumoApiLicense>> {
  return appsumoApiRequest("GET", "/licenses", { params });
}

/** GET /licenses/:license_key — look up one license, e.g. before granting access or for support. */
export async function getAppsumoLicense(licenseKey: string): Promise<AppsumoApiLicense> {
  return appsumoApiRequest("GET", `/licenses/${encodeURIComponent(licenseKey)}`);
}

/** GET /licenses/events — all events across licenses, each with up to 10 webhook responses inlined. */
export async function listAppsumoLicenseEvents(
  params: AppsumoListParams = {}
): Promise<AppsumoApiPage<AppsumoApiLicenseEvent>> {
  return appsumoApiRequest("GET", "/licenses/events", { params });
}

/** GET /licenses/:license_key/events — event history for one license. */
export async function getAppsumoLicenseEvents(
  licenseKey: string
): Promise<AppsumoApiPage<AppsumoApiLicenseEvent>> {
  return appsumoApiRequest("GET", `/licenses/${encodeURIComponent(licenseKey)}/events`);
}

/** GET /licenses/:license_key/webhook-responses — debug missed/failed webhook deliveries for one license. */
export async function getAppsumoLicenseWebhookResponses(
  licenseKey: string
): Promise<AppsumoApiPage<AppsumoApiWebhookResponse>> {
  return appsumoApiRequest("GET", `/licenses/${encodeURIComponent(licenseKey)}/webhook-responses`);
}

/** GET /profile — partner profile: registered webhook/redirect URLs and backup contacts. */
export async function getAppsumoProfile(): Promise<AppsumoApiProfile> {
  return appsumoApiRequest("GET", "/profile");
}

/** PUT /profile — update the registered webhook/redirect URLs. */
export async function updateAppsumoProfile(
  update: { webhook_url?: string; redirect_url?: string }
): Promise<AppsumoApiProfile> {
  return appsumoApiRequest("PUT", "/profile", { body: update });
}

/** POST /profile/contact — add a backup contact AppSumo can reach if direct app requests fail. */
export async function addAppsumoContact(contact: { email: string; name: string }): Promise<AppsumoApiContact> {
  return appsumoApiRequest("POST", "/profile/contact", { body: contact });
}

/** DELETE /profile/contact/:contact_id — remove a backup contact (id from getAppsumoProfile().contacts). */
export async function removeAppsumoContact(contactId: number): Promise<void> {
  await appsumoApiRequest("DELETE", `/profile/contact/${contactId}`);
}
