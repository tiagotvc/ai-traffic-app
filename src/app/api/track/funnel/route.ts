import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { repositories } from "@/db/repositories";
import { getOrSetVisitorId } from "@/lib/funnel/visitor-id";
import { recordFunnelEvent } from "@/lib/funnel/record-event";

const BodySchema = z.object({
  eventType: z.enum(["viewed_pricing", "started_checkout", "completed_checkout"]),
  planSlug: z.string().max(80).optional(),
  email: z.string().email().max(200).optional()
});

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

    await recordFunnelEvent({
      visitorId,
      userId,
      tenantId,
      eventType: body.eventType,
      planSlug: body.planSlug ?? null,
      email: body.email ?? session?.user?.email ?? null
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[track/funnel]", err);
    // Telemetria nunca deve virar erro visível pro visitante — sempre 200.
    return NextResponse.json({ ok: false });
  }
}
