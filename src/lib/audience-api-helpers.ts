import { repositories } from "@/db/repositories";
import { getClientBySlugOrId } from "@/lib/app-context";

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
  metaAccessToken: string
): Promise<{ accepted: boolean; url: string }> {
  const url = "https://www.facebook.com/ads/manage/customaudiences/tos/";
  try {
    const res = await fetch(
      `https://graph.facebook.com/v20.0/me/adaccounts?fields=id,tos_accepted&limit=1&access_token=${encodeURIComponent(metaAccessToken)}`
    );
    const json = (await res.json()) as {
      data?: Array<{ tos_accepted?: { web_custom_audience_tos?: number } }>;
    };
    const tos = json.data?.[0]?.tos_accepted;
    return { accepted: tos?.web_custom_audience_tos === 1, url };
  } catch {
    return { accepted: false, url };
  }
}
