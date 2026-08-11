import { repositories } from "@/db/repositories";
import { getClientBySlugOrId } from "@/lib/app-context";
import { fetchAdImages } from "@/lib/meta-graph";

export type AccountImageOption = { hash: string; label: string; url: string };

export type AccountValidation =
  | { ok: true; clientId: string }
  | { ok: false; error: string; status: number };

/** Confere que a ad account pedida está de fato vinculada ao cliente do tenant atual —
 * evita que um clientId/adAccountId arbitrário vaze imagem de outra conta. */
export async function validateClientAdAccount(
  tenantId: string,
  clientSlugOrId: string,
  adAccountId: string
): Promise<AccountValidation> {
  const client = await getClientBySlugOrId(tenantId, clientSlugOrId);
  if (!client) return { ok: false, error: "Cliente não encontrado", status: 404 };

  const { adAccount: adAccountRepo } = await repositories();
  const linked = await adAccountRepo.findOne({ where: { clientId: client.id, metaAdAccountId: adAccountId } });
  if (!linked) return { ok: false, error: "Conta não vinculada ao cliente", status: 403 };

  return { ok: true, clientId: client.id };
}

/** Lista as imagens já usadas em anúncios reais da conta — a "biblioteca de anúncios"
 * nativa da Meta. Serve como fonte alternativa ao histórico gerado por IA pra começar
 * uma edição a partir de um criativo que já existe de verdade na conta. */
export async function listAccountImages(
  metaAccessToken: string,
  adAccountId: string
): Promise<AccountImageOption[]> {
  const images = await fetchAdImages(metaAccessToken, adAccountId);
  return images
    .filter((img): img is typeof img & { hash: string; url: string } => !!img.hash && !!img.url)
    .map((img) => ({ hash: img.hash, label: img.name?.trim() || img.hash, url: img.url }));
}

/** Baixa uma imagem específica da conta (pelo hash) e devolve em base64 — feito no
 * servidor pra evitar que o canvas fique "tainted" por CORS ao tentar exportar depois
 * de carregar direto da CDN da Meta no navegador. */
export async function fetchAccountImageAsBase64(
  metaAccessToken: string,
  adAccountId: string,
  hash: string
): Promise<{ base64: string; mimeType: string } | null> {
  const images = await fetchAdImages(metaAccessToken, adAccountId);
  const match = images.find((img) => img.hash === hash);
  if (!match?.url) return null;

  const res = await fetch(match.url);
  if (!res.ok) return null;
  const buffer = Buffer.from(await res.arrayBuffer());
  const mimeType = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
  return { base64: buffer.toString("base64"), mimeType };
}
