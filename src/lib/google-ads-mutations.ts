import "server-only";

import {
  GOOGLE_ADS_BASE,
  GoogleAdsApiError,
  baseHeaders,
  parseError
} from "@/lib/google-ads-api";
import { getGoogleAdsLoginCustomerId } from "@/lib/google-env";

/**
 * Camada de ESCRITA do Google Ads (endpoints `:mutate` REST v24). Espelha o padrão
 * de leitura (baseHeaders + fallback login-customer-id MCC→self). Todas as funções
 * aceitam `validateOnly` (dry-run: o Google valida a operação e responde se aceitaria,
 * SEM aplicar). Silo Google — nunca toca no Meta.
 *
 * IMPORTANTE: enquanto o developer token estiver com uso permitido = somente leitura,
 * o Google recusa qualquer mutate real (403 PERMISSION_DENIED). `validateOnly` e conta
 * de teste sob a MCC continuam funcionando.
 */

export type GoogleEntityStatus = "ENABLED" | "PAUSED" | "REMOVED";
export type GoogleMatchType = "EXACT" | "PHRASE" | "BROAD";

type Operation = Record<string, unknown>;
export type MutateResponse = {
  results?: Array<{ resourceName?: string }>;
  partialFailureError?: unknown;
};

const digits = (v: string) => v.replace(/\D/g, "");
const resName = (cid: string, path: string) => `customers/${cid}/${path}`;

/**
 * POST genérico a `customers/{cid}/{resource}:mutate` com fallback de login-customer-id.
 * 401/403 podem ser contexto de login errado → tenta o próximo; erro de validação (4xx
 * restante) para de imediato. Lança GoogleAdsApiError preservando o status HTTP.
 */
async function postMutate(
  accessToken: string,
  customerId: string,
  resource: string,
  operations: Operation[],
  validateOnly: boolean
): Promise<MutateResponse> {
  const cid = digits(customerId);
  const mcc = getGoogleAdsLoginCustomerId();
  const logins = [...new Set([mcc, cid].filter(Boolean))] as string[];
  const body = JSON.stringify({ operations, validateOnly, partialFailure: false });

  let lastErr: GoogleAdsApiError | null = null;
  for (const login of logins.length ? logins : [cid]) {
    const res = await fetch(`${GOOGLE_ADS_BASE}/customers/${cid}/${resource}:mutate`, {
      method: "POST",
      headers: baseHeaders(accessToken, login),
      body
    });
    if (res.ok) return (await res.json()) as MutateResponse;
    lastErr = new GoogleAdsApiError(await parseError(res), res.status);
    if (res.status !== 401 && res.status !== 403) break; // erro de validação: não adianta trocar login
  }
  throw lastErr ?? new GoogleAdsApiError("Falha desconhecida no mutate", 500);
}

/** Atualiza o status (ENABLED/PAUSED/REMOVED) de uma campanha. */
export function setCampaignStatus(
  accessToken: string,
  customerId: string,
  campaignId: string,
  status: GoogleEntityStatus,
  validateOnly = false
): Promise<MutateResponse> {
  const cid = digits(customerId);
  return postMutate(
    accessToken,
    cid,
    "campaigns",
    [{ update: { resourceName: resName(cid, `campaigns/${digits(campaignId)}`), status }, updateMask: "status" }],
    validateOnly
  );
}

/** Atualiza o status de um grupo de anúncios. */
export function setAdGroupStatus(
  accessToken: string,
  customerId: string,
  adGroupId: string,
  status: GoogleEntityStatus,
  validateOnly = false
): Promise<MutateResponse> {
  const cid = digits(customerId);
  return postMutate(
    accessToken,
    cid,
    "adGroups",
    [{ update: { resourceName: resName(cid, `adGroups/${digits(adGroupId)}`), status }, updateMask: "status" }],
    validateOnly
  );
}

/** Atualiza o status de um anúncio (adGroupAd = par grupo~anúncio). */
export function setAdStatus(
  accessToken: string,
  customerId: string,
  adGroupId: string,
  adId: string,
  status: GoogleEntityStatus,
  validateOnly = false
): Promise<MutateResponse> {
  const cid = digits(customerId);
  const rn = resName(cid, `adGroupAds/${digits(adGroupId)}~${digits(adId)}`);
  return postMutate(
    accessToken,
    cid,
    "adGroupAds",
    [{ update: { resourceName: rn, status }, updateMask: "status" }],
    validateOnly
  );
}

/** Atualiza o status de uma palavra-chave (adGroupCriterion = par grupo~critério). */
export function setKeywordStatus(
  accessToken: string,
  customerId: string,
  adGroupId: string,
  criterionId: string,
  status: GoogleEntityStatus,
  validateOnly = false
): Promise<MutateResponse> {
  const cid = digits(customerId);
  const rn = resName(cid, `adGroupCriteria/${digits(adGroupId)}~${digits(criterionId)}`);
  return postMutate(
    accessToken,
    cid,
    "adGroupCriteria",
    [{ update: { resourceName: rn, status }, updateMask: "status" }],
    validateOnly
  );
}

/**
 * Cria uma palavra-chave (positiva ou NEGATIVA) num grupo de anúncios.
 * Negativa = critério de exclusão (não tem status próprio).
 */
export function addKeyword(
  accessToken: string,
  customerId: string,
  adGroupId: string,
  text: string,
  matchType: GoogleMatchType,
  negative: boolean,
  validateOnly = false
): Promise<MutateResponse> {
  const cid = digits(customerId);
  const create: Record<string, unknown> = {
    adGroup: resName(cid, `adGroups/${digits(adGroupId)}`),
    keyword: { text, matchType },
    negative
  };
  if (!negative) create.status = "ENABLED";
  return postMutate(accessToken, cid, "adGroupCriteria", [{ create }], validateOnly);
}
