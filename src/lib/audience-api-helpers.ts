import { repositories } from "@/db/repositories";
import { getClientBySlugOrId } from "@/lib/app-context";
import { classifyLlmError } from "@/lib/llm/generate-json";
import type { LlmProviderId } from "@/lib/llm/types";
import { isMetaPermissionError, isMetaTokenInvalidError } from "@/lib/meta-auth-store";
import { fetchCustomAudiences, type MetaCustomAudience } from "@/lib/meta-graph";
import { formatMetaGraphError } from "@/lib/meta-error";
import { PersonaTargetingInvalidError } from "@/lib/meta-targeting-prune";

export async function validateClientAdAccount(
  tenantId: string,
  clientSlug: string,
  adAccountId: string
): Promise<{ ok: true; clientId: string } | { ok: false; error: string; status: number }> {
  const client = await getClientBySlugOrId(tenantId, clientSlug);
  if (!client) return { ok: false, error: "Cliente não encontrado", status: 404 };

  const { adAccount: adAccountRepo } = await repositories();
  const linked = await adAccountRepo.findOne({
    where: { clientId: client.id, metaAdAccountId: adAccountId }
  });
  if (!linked) {
    return { ok: false, error: "Conta não vinculada ao cliente", status: 403 };
  }
  return { ok: true, clientId: client.id };
}

export async function checkCustomAudienceTos(
  metaAccessToken: string,
  adAccountId?: string
): Promise<{ accepted: boolean; url: string }> {
  const url = "https://www.facebook.com/ads/manage/customaudiences/tos/";
  try {
    if (adAccountId) {
      const act = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
      const res = await fetch(
        `https://graph.facebook.com/v20.0/${encodeURIComponent(act)}?fields=${encodeURIComponent("tos_accepted")}&access_token=${encodeURIComponent(metaAccessToken)}`
      );
      const json = (await res.json()) as {
        tos_accepted?: { web_custom_audience_tos?: number; custom_audience_tos?: number };
        error?: { message?: string };
      };
      if (json.error) return { accepted: false, url };
      const tos = json.tos_accepted;
      const accepted =
        tos?.web_custom_audience_tos === 1 || tos?.custom_audience_tos === 1;
      return { accepted, url };
    }

    const res = await fetch(
      `https://graph.facebook.com/v20.0/me/adaccounts?fields=id,tos_accepted&limit=100&access_token=${encodeURIComponent(metaAccessToken)}`
    );
    const json = (await res.json()) as {
      data?: Array<{
        tos_accepted?: { web_custom_audience_tos?: number; custom_audience_tos?: number };
      }>;
    };
    const accepted = (json.data ?? []).some((row) => {
      const tos = row.tos_accepted;
      return tos?.web_custom_audience_tos === 1 || tos?.custom_audience_tos === 1;
    });
    return { accepted, url };
  } catch {
    return { accepted: false, url };
  }
}

export function isMetaGraphApiError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("Meta Graph error") ||
    isMetaPermissionError(msg) ||
    isMetaTokenInvalidError(msg)
  );
}

export function classifyAudienceAiError(
  err: unknown,
  provider: LlmProviderId
): { message: string; status: number; code?: string } {
  if (err instanceof PersonaTargetingInvalidError) {
    return { message: err.message, status: 400, code: "TARGETING_INVALID" };
  }
  if (isMetaGraphApiError(err)) {
    return { message: formatMetaGraphError(err), status: 403, code: "META_PERMISSION" };
  }
  const classified = classifyLlmError(err, provider);
  return { message: classified.message, status: 502, code: classified.code };
}

export async function fetchCustomAudiencesOptional(
  accessToken: string,
  adAccountId: string
): Promise<MetaCustomAudience[]> {
  try {
    return await fetchCustomAudiences(accessToken, adAccountId);
  } catch (e) {
    if (isMetaGraphApiError(e)) return [];
    throw e;
  }
}
