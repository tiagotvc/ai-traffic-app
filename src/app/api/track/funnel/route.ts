import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { repositories } from "@/db/repositories";
import { hasAttribution, pickAttribution } from "@/lib/analytics/attribution";
import { getOrSetVisitorId } from "@/lib/funnel/visitor-id";
import { recordFunnelEvent } from "@/lib/funnel/record-event";

const BodySchema = z.object({
  eventType: z.enum([
    "viewed_landing",
    "clicked_cta",
    "started_signup",
    "viewed_pricing",
    "started_checkout",
    "completed_checkout"
  ]),
  /** Qual botão/bloco disparou, pra comparar CTA do hero com o do rodapé. */
  cta: z.string().max(80).optional(),
  /** Qual página foi vista, pra separar landing de anúncio da home institucional. */
  page: z.string().max(80).optional(),
  planSlug: z.string().max(80).optional(),
  email: z.string().email().max(200).optional(),
  /** URL da página no momento do evento; só serve pra extrair as utm_*. */
  pageUrl: z.string().max(500).optional()
});

/** Origem da campanha lida da própria URL da página, não de um campo solto do corpo. */
function attributionFromUrl(pageUrl: string | undefined): Record<string, string> | null {
  if (!pageUrl) return null;
  try {
    const attribution = pickAttribution(new URL(pageUrl).searchParams);
    return hasAttribution(attribution) ? attribution : null;
  } catch {
    return null;
  }
}

/** Rota pública — qualquer visitante do site (logado ou não) chama isso. */
export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json().catch(() => ({})));
    const visitorId = await getOrSetVisitorId();

    const session = await auth();
    let userId: string | null = null;
    let tenantId: string | null = null;
    if (session?.user?.email) {
      const { user: userRepo } = await repositories();
      const user = await userRepo.findOne({ where: { email: session.user.email.toLowerCase().trim() } });
      if (user) {
        userId = user.id;
        tenantId = user.tenantId;
      }
    }

    const attribution = attributionFromUrl(body.pageUrl);
    const meta: Record<string, unknown> = {
      ...(body.cta ? { cta: body.cta } : {}),
      ...(body.page ? { page: body.page } : {}),
      ...(attribution ? { attribution } : {})
    };

    await recordFunnelEvent({
      visitorId,
      userId,
      tenantId,
      eventType: body.eventType,
      planSlug: body.planSlug ?? null,
      email: body.email ?? session?.user?.email ?? null,
      meta: Object.keys(meta).length ? meta : null
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[track/funnel]", err);
    // Telemetria nunca deve virar erro visível pro visitante — sempre 200.
    return NextResponse.json({ ok: false });
  }
}
