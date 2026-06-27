import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";
import { FeatureDisabledError } from "@/lib/feature-flags/service";
import type { CapiActionSource } from "@/lib/meta-capi";
import { sendClientConversion } from "@/lib/meta-capi-service";
import { resolveWorkspaceMetaAccessToken } from "@/lib/meta-auth-store";
import { isWorkspaceAdmin } from "@/lib/workspace-members";

/**
 * Envio de evento de conversão em **produção** via CAPI (P0.3). Admin do
 * workspace; gate `meta.capi`. Recebe os dados do evento + PII (que é hasheada
 * no envio) e registra no log de observabilidade.
 */
export async function POST(req: Request) {
  try {
    const { tenant, user } = await getAppContext();
    if (!(await isWorkspaceAdmin(tenant.id, user.id))) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      clientId?: string;
      eventName?: string;
      actionSource?: CapiActionSource;
      eventId?: string;
      eventSourceUrl?: string;
      userData?: Record<string, string>;
      customData?: Record<string, unknown>;
      pixelId?: string;
    };
    if (!body.clientId || !body.eventName) {
      return NextResponse.json({ ok: false, error: "clientId and eventName required" }, { status: 400 });
    }

    const { client: clientRepo } = await repositories();
    const client = await clientRepo.findOne({ where: { id: body.clientId, tenantId: tenant.id } });
    if (!client) return NextResponse.json({ ok: false, error: "client_not_found" }, { status: 404 });

    const token = await resolveWorkspaceMetaAccessToken(tenant.id, user.id);
    if (!token) return NextResponse.json({ ok: false, error: "meta_not_connected" }, { status: 400 });

    const result = await sendClientConversion({
      tenantId: tenant.id,
      clientId: body.clientId,
      accessToken: token,
      pixelId: body.pixelId,
      event: {
        eventName: body.eventName,
        actionSource: body.actionSource ?? "website",
        eventId: body.eventId,
        eventSourceUrl: body.eventSourceUrl,
        userData: {
          ...(body.userData ?? {}),
          clientUserAgent:
            body.userData?.clientUserAgent ?? req.headers.get("user-agent") ?? undefined
        },
        customData: body.customData
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
