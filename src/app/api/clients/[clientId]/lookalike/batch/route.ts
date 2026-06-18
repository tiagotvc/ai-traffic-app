import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { checkCustomAudienceTos } from "@/lib/audience-api-helpers";
import { createLookalikeBatch } from "@/lib/meta-audience-create";

const ItemSchema = z.object({
  name: z.string().min(1),
  originAudienceId: z.string().min(1),
  ratio: z.number().min(0.01).max(0.1),
  country: z.string().default("BR")
});

const BodySchema = z.object({
  adAccountId: z.string().min(1),
  items: z.array(ItemSchema).min(1).max(50)
});

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

  const tos = await checkCustomAudienceTos(metaAccessToken, body.adAccountId);
  if (!tos.accepted) {
    return NextResponse.json(
      { ok: false, error: "Aceite os termos de públicos personalizados na Meta", tosUrl: tos.url },
      { status: 403 }
    );
  }

  const { lookalikeJob: repo, clientMetaSettings: settingsRepo } = await repositories();
  const jobs = [];

  for (const item of body.items) {
    const job = await repo.save(
      repo.create({
        clientId: client.id,
        metaAdAccountId: body.adAccountId,
        name: item.name,
        status: "processing",
        seedType: "custom_audience",
        seedId: item.originAudienceId,
        ratio: String(item.ratio),
        country: item.country
      })
    );
    jobs.push(job);
  }

  const results = await createLookalikeBatch(metaAccessToken, body.adAccountId, body.items);

  const createdIds: string[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i]!;
    const job = jobs[i]!;
    if (result.id) {
      job.status = "ready";
      job.metaAudienceId = result.id;
      createdIds.push(result.id);
    } else {
      job.status = "failed";
      job.lastError = result.error ?? "failed";
    }
    await repo.save(job);
  }

  if (createdIds.length) {
    const settings = await settingsRepo.findOne({ where: { clientId: client.id } });
    if (settings) {
      settings.defaultCustomAudienceIds = [
        ...new Set([...(settings.defaultCustomAudienceIds ?? []), ...createdIds])
      ];
      await settingsRepo.save(settings);
    }
  }

  const succeeded = results.filter((r) => r.id).length;
  const failed = results.length - succeeded;

  return NextResponse.json({
    ok: failed === 0,
    results,
    summary: { total: results.length, succeeded, failed }
  });
}
