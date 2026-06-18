import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { checkCustomAudienceTos } from "@/lib/audience-api-helpers";

type TermItem = {
  id: string;
  title: string;
  description: string;
  status: "accepted" | "not_accepted";
  url: string;
};

/** Verifica termos Meta pendentes (Custom Audiences, Business Tools). */
export async function GET(req: Request) {
  const { metaAccessToken } = await getAppContext();
  if (!metaAccessToken) {
    return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
  }

  const adAccountId = new URL(req.url).searchParams.get("adAccountId")?.trim() || undefined;

  const terms: TermItem[] = [
    {
      id: "custom_audience",
      title: "Customer List Custom Audiences Terms",
      description:
        "Permite criar públicos personalizados com seus dados de clientes na Meta.",
      status: "not_accepted",
      url: "https://www.facebook.com/ads/manage/customaudiences/tos/"
    },
    {
      id: "business_tools",
      title: "Meta Business Tools Terms",
      description:
        "Define como a Meta recebe, usa e protege dados enviados pelas ferramentas de anúncios.",
      status: "not_accepted",
      url: "https://www.facebook.com/legal/terms/businesstools"
    }
  ];

  const tosCheck = await checkCustomAudienceTos(metaAccessToken, adAccountId);
  if (tosCheck.accepted) {
    terms[0].status = "accepted";
  }
  terms[0].url = tosCheck.url;

  const allAccepted = terms.every((t) => t.status === "accepted");

  return NextResponse.json({ ok: true, terms, allAccepted, adAccountId: adAccountId ?? null });
}
