import { NextResponse } from "next/server";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { GoogleSearchCampaignDraftSchema, validateGoogleCampaignDraft } from "@/lib/google-campaign-draft";
import { buildGoogleSearchCampaignOperations, mutateGoogleSearchCampaign } from "@/lib/google-campaign-publisher";
import { getWorkspaceGoogleAccessToken } from "@/lib/google-auth-store";

export async function POST(req: Request) {
  const { tenant } = await getAppContext();
  const parsed = GoogleSearchCampaignDraftSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Rascunho inválido", issues: parsed.error.issues }, { status: 400 });
  const client = await getClientBySlugOrId(tenant.id, parsed.data.clientSlug);
  if (!client || client.googleAdsCustomerId !== parsed.data.customerId) return NextResponse.json({ ok: false, error: "Conta Google não corresponde ao cliente" }, { status: 403 });
  const issues = validateGoogleCampaignDraft(parsed.data);
  if (issues.length) return NextResponse.json({ ok: false, error: "Corrija o rascunho", issues }, { status: 422 });
  const operationCount = buildGoogleSearchCampaignOperations(parsed.data).length;
  if (process.env.GOOGLE_ADS_CREATION_VALIDATE !== "1") return NextResponse.json({ ok: true, localOnly: true, operationCount, message: "Estrutura local válida. Dry-run Google aguardando liberação." });
  const token = await getWorkspaceGoogleAccessToken(tenant.id);
  if (!token) return NextResponse.json({ ok: false, error: "Google Ads não conectado" }, { status: 409 });
  try {
    const result = await mutateGoogleSearchCampaign({ accessToken: token, draft: parsed.data, validateOnly: true, loginCustomerId: client.googleAdsLoginCustomerId ?? undefined });
    return NextResponse.json({ ok: true, localOnly: false, operationCount, result });
  } catch (error) { return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha no dry-run Google" }, { status: 502 }); }
}
