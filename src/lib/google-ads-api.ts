import "server-only";

import { getGoogleAdsDeveloperToken, getGoogleAdsLoginCustomerId } from "@/lib/google-env";

/** Versão da Google Ads REST API. Bump aqui quando migrarmos de versão. */
export const GOOGLE_ADS_API_VERSION = "v18";

const GOOGLE_ADS_BASE = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;

export type GoogleAdsCustomer = {
  /** ID numérico (só dígitos, sem hífens). */
  id: string;
  descriptiveName: string | null;
  currencyCode: string | null;
  timeZone: string | null;
  /** true = conta Manager (MCC), não veicula anúncios diretamente. */
  manager: boolean;
};

export class GoogleAdsApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "GoogleAdsApiError";
    this.status = status;
  }
}

function baseHeaders(accessToken: string, loginCustomerId?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": getGoogleAdsDeveloperToken(),
    "content-type": "application/json"
  };
  const login = loginCustomerId?.replace(/\D/g, "") || getGoogleAdsLoginCustomerId();
  if (login) headers["login-customer-id"] = login;
  return headers;
}

async function parseError(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as {
    error?: { message?: string; details?: unknown };
  } | null;
  return body?.error?.message ?? `Google Ads API error (${res.status})`;
}

/**
 * Lista os customer IDs que o token consegue acessar (contas próprias + via MCC).
 * Não exige login-customer-id. Retorna só os IDs numéricos.
 */
export async function listAccessibleCustomers(accessToken: string): Promise<string[]> {
  const res = await fetch(`${GOOGLE_ADS_BASE}/customers:listAccessibleCustomers`, {
    method: "GET",
    headers: baseHeaders(accessToken)
  });

  if (!res.ok) throw new GoogleAdsApiError(await parseError(res), res.status);

  const json = (await res.json()) as { resourceNames?: string[] };
  return (json.resourceNames ?? []).map((rn) => rn.replace("customers/", "").replace(/\D/g, ""));
}

/**
 * Detalhes de uma conta via GAQL (googleAds:search). Usa login-customer-id do MCC
 * quando configurado — necessário para acessar contas cliente sob a hierarquia.
 */
export async function getCustomerDetails(
  accessToken: string,
  customerId: string,
  loginCustomerId?: string
): Promise<GoogleAdsCustomer | null> {
  const cid = customerId.replace(/\D/g, "");
  const query =
    "SELECT customer.id, customer.descriptive_name, customer.currency_code, " +
    "customer.time_zone, customer.manager FROM customer LIMIT 1";

  const res = await fetch(`${GOOGLE_ADS_BASE}/customers/${cid}/googleAds:search`, {
    method: "POST",
    headers: baseHeaders(accessToken, loginCustomerId),
    body: JSON.stringify({ query })
  });

  if (!res.ok) throw new GoogleAdsApiError(await parseError(res), res.status);

  const json = (await res.json()) as {
    results?: Array<{
      customer?: {
        id?: string;
        descriptiveName?: string;
        currencyCode?: string;
        timeZone?: string;
        manager?: boolean;
      };
    }>;
  };

  const c = json.results?.[0]?.customer;
  if (!c?.id) return null;

  return {
    id: String(c.id).replace(/\D/g, ""),
    descriptiveName: c.descriptiveName ?? null,
    currencyCode: c.currencyCode ?? null,
    timeZone: c.timeZone ?? null,
    manager: !!c.manager
  };
}

/**
 * Lista as contas acessíveis já com detalhes (nome, moeda, timezone). Best-effort:
 * contas que falharem individualmente (sem permissão de leitura via o login atual)
 * caem no fallback com só o ID.
 */
export async function listAccessibleCustomerDetails(
  accessToken: string
): Promise<GoogleAdsCustomer[]> {
  const ids = await listAccessibleCustomers(accessToken);

  const out = await Promise.all(
    ids.map(async (id) => {
      try {
        const details = await getCustomerDetails(accessToken, id);
        if (details) return details;
      } catch {
        /* sem permissão de leitura via o login atual — devolve ID cru */
      }
      return {
        id,
        descriptiveName: null,
        currencyCode: null,
        timeZone: null,
        manager: false
      } satisfies GoogleAdsCustomer;
    })
  );

  return out;
}
