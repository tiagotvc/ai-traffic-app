import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";
import { FeatureDisabledError } from "@/lib/feature-flags/service";
import { resolveWorkspaceMetaAccessToken } from "@/lib/meta-auth-store";
import { sendClientConversion } from "@/lib/meta-capi-service";
import { isWorkspaceAdmin } from "@/lib/workspace-members";

/**
 * Dispara um evento de **teste** da CAPI (com `test_event_code`) para validar a
 * conexão no Events Manager → "Test Events". Só admin do workspace; gate `meta.capi`.
 * Critério de pronto do P0: este evento aparece no Events Manager com dedupe (event_id).
 */
export async function POST(req: Request) {
  try {
    const { tenant, user } = await getAppContext();
    if (!(await isWorkspaceAdmin(tenant.id, user.id))) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      clientId?: string;
      testEventCode?: string;
      eventName?: string;
      pixelId?: string;
    };
    if (!body.clientId) {
      return NextResponse.json({ ok: false, error: "clientId required" }, { status: 400 });
    }

    // Garante que o cliente pertence ao workspace.
    const { client: clientRepo } = await repositories();
    const client = await clientRepo.findOne({ where: { id: body.clientId, tenantId: tenant.id } });
    if (!client) return NextResponse.json({ ok: false, error: "client_not_found" }, { status: 404 });

    const token = await resolveWorkspaceMetaAccessToken(tenant.id, user.id);
    if (!token) return NextResponse.json({ ok: false, error: "meta_not_connected" }, { status: 400 });

    const result = await sendClientConversion({
      clientId: body.clientId,
      accessToken: token,
      pixelId: body.pixelId,
      testEventCode: body.testEventCode,
      event: {
        eventName: body.eventName || "PageView",
        actionSource: "website",
        eventId: `test-${Date.now()}`,
        userData: { clientUserAgent: req.headers.get("user-agent") ?? undefined }
      }
    });

    return NextResponse.json({ ok: result.ok, result }, { status: result.ok ? 200 : 502 });
  } catch (e) {
    if (e instanceof FeatureDisabledError) {
      return NextResponse.json({ ok: false, error: "capi_disabled" }, { status: 404 });
    }
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "error" },
      { status: 500 }
    );
  }
}
