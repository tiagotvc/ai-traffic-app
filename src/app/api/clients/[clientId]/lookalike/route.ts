import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import {
  buildAudienceDescription,
  createWithDescriptionFallback
} from "@/lib/audience-provenance";
import { createLookalikeAudience } from "@/lib/meta-graph";

const BodySchema = z.object({
  name: z.string().min(1),
  adAccountId: z.string().min(1),
  originAudienceId: z.string().min(1),
  ratio: z.number().min(0.01).max(0.1),
  country: z.string().default("BR")
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;
  const { tenant } = await getAppContext();
  const client = await getClientBySlugOrId(tenant.id, clientId);
  if (!client) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const { lookalikeJob: repo } = await repositories();
  const jobs = await repo.find({
    where: { clientId: client.id },
    order: { createdAt: "DESC" },
    take: 20
  });
  return NextResponse.json({ ok: true, jobs });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;
  const { tenant, metaAccessToken } = await getAppContext();
  if (!metaAccessToken) {
    return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
  }

  const client = await getClientBySlugOrId(tenant.id, clientId);
  if (!client) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const body = BodySchema.parse(await req.json().catch(() => ({})));
  const { lookalikeJob: repo } = await repositories();

  const job = await repo.save(
    repo.create({
      clientId: client.id,
      metaAdAccountId: body.adAccountId,
      name: body.name,
      status: "processing",
      seedType: "custom_audience",
      seedId: body.originAudienceId,
      ratio: String(body.ratio),
      country: body.country
    })
  );

  const description = buildAudienceDescription({
    clientName: client.name,
    kind: "lookalike",
    detail: [
      `Semelhança: ${Math.round(body.ratio * 100)}%`,
      `País: ${body.country}`,
      `Origem: ${body.originAudienceId}`
    ]
  });

  try {
    const created = await createWithDescriptionFallback(
      (desc) =>
        createLookalikeAudience(metaAccessToken, body.adAccountId, {
          name: body.name,
          originAudienceId: body.originAudienceId,
          ratio: body.ratio,
          country: body.country,
          description: desc
        }),
      description
    );
    job.status = "ready";
    job.metaAudienceId = created.id;
    await repo.save(job);

    const { clientMetaSettings: settingsRepo } = await repositories();
    const settings = await settingsRepo.findOne({ where: { clientId: client.id } });
    if (settings) {
      const ids = [...(settings.defaultCustomAudienceIds ?? []), created.id];
      settings.defaultCustomAudienceIds = [...new Set(ids)];
      await settingsRepo.save(settings);
    }

    return NextResponse.json({ ok: true, job, audienceId: created.id });
  } catch (e) {
    job.status = "failed";
    job.lastError = e instanceof Error ? e.message : "failed";
    await repo.save(job);
    return NextResponse.json({ ok: false, error: job.lastError }, { status: 500 });
  }
}
