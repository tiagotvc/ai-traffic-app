export function getAsaasConfig() {
  const env = process.env.ASAAS_ENV === "production" ? "production" : "sandbox";
  const baseUrl =
    env === "production"
      ? "https://api.asaas.com/v3"
      : "https://sandbox.asaas.com/api/v3";
  const apiKey = process.env.ASAAS_API_KEY?.trim() ?? "";
  const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN?.trim() ?? "";
  const nfServiceCode = process.env.ASAAS_NF_SERVICE_CODE?.trim() ?? "";
  return { env, baseUrl, apiKey, webhookToken, nfServiceCode, configured: !!apiKey };
}

export function isAsaasConfigured() {
  return getAsaasConfig().configured;
}

export class AsaasError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message);
    this.name = "AsaasError";
  }
}

export async function asaasFetch<T>(
  path: string,
  init?: RequestInit & { skipAuth?: boolean }
): Promise<T> {
  const { baseUrl, apiKey } = getAsaasConfig();
  if (!apiKey && !init?.skipAuth) {
    throw new AsaasError("ASAAS_API_KEY not configured", 503);
  }
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey,
      ...(init?.headers ?? {})
    }
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const errors =
      typeof body === "object" && body && "errors" in body
        ? (body as { errors: unknown }).errors
        : null;
    const descriptions = Array.isArray(errors)
      ? errors
          .map((e) => (e && typeof e === "object" && "description" in e ? String(e.description) : null))
          .filter((d): d is string => Boolean(d))
      : [];
    const msg = descriptions.length
      ? descriptions.join(" ")
      : errors
        ? JSON.stringify(errors)
        : `Asaas ${res.status}`;
    throw new AsaasError(msg, res.status, body);
  }
  return body as T;
}
