import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";

type TermItem = {
  id: string;
  title: string;
  description: string;
  status: "accepted" | "not_accepted";
  url: string;
};

/** Verifica termos Meta pendentes (Custom Audiences, Business Tools). */
export async function GET() {
  const { metaAccessToken } = await getAppContext();
  if (!metaAccessToken) {
    return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
  }

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

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,tos_accepted&limit=1&access_token=${encodeURIComponent(metaAccessToken)}`
    );
    const json = (await res.json()) as {
      data?: Array<{ tos_accepted?: { web_custom_audience_tos?: number } }>;
    };
    const tos = json.data?.[0]?.tos_accepted;
    if (tos?.web_custom_audience_tos === 1) {
      terms[0].status = "accepted";
    }
  } catch {
    /* keep defaults */
  }

  const allAccepted = terms.every((t) => t.status === "accepted");

  return NextResponse.json({ ok: true, terms, allAccepted });
}
