import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext } from "@/lib/app-context";
import { validateClientAdAccount } from "@/lib/audience-api-helpers";
import {
  createSavedAudience,
  createSavedAudienceFromTemplate,
  fetchSavedAudiences
} from "@/lib/meta-audience-create";

const BodySchema = z
  .object({
    clientId: z.string().min(1),
    adAccountId: z.string().min(1),
    name: z.string().min(1),
    templateAudienceId: z.string().optional(),
    targeting: z.record(z.string(), z.unknown()).optional()
  })
  .refine((b) => b.templateAudienceId || b.targeting, {
    message: "Informe templateAudienceId ou targeting"
  });

export async function GET(req: Request) {
  const { tenant, metaAccessToken } = await getAppContext();
  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId")?.trim();
  const adAccountId = url.searchParams.get("adAccountId")?.trim();

  if (!clientId || !adAccountId) {
    return NextResponse.json(
      { ok: false, error: "clientId e adAccountId são obrigatórios" },
      { status: 400 }
    );
  }

  const validation = await validateClientAdAccount(tenant.id, clientId, adAccountId);
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: validation.status });
  }

  if (!metaAccessToken) {
    return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
  }

  try {
    const audiences = await fetchSavedAudiences(metaAccessToken, adAccountId);
    return NextResponse.json({
      ok: true,
      audiences: audiences.map((a) => ({
        id: a.id,
        name: a.name ?? a.id,
        targeting: a.targeting ?? {},
        timeCreated: a.time_created,
        timeUpdated: a.time_updated
      }))
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Falha ao listar públicos salvos" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const { tenant, metaAccessToken } = await getAppContext();
  if (!metaAccessToken) {
    return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
  }

  const body = BodySchema.parse(await req.json().catch(() => ({})));
  const validation = await validateClientAdAccount(tenant.id, body.clientId, body.adAccountId);
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: validation.status });
  }

  try {
    const created = body.templateAudienceId
      ? await createSavedAudienceFromTemplate(metaAccessToken, body.adAccountId, {
          name: body.name,
          templateAudienceId: body.templateAudienceId
        })
      : await createSavedAudience(metaAccessToken, body.adAccountId, {
          name: body.name,
          targeting: body.targeting!
        });
    return NextResponse.json({ ok: true, savedAudienceId: created.id });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Falha ao criar público salvo" },
      { status: 500 }
    );
  }
}
