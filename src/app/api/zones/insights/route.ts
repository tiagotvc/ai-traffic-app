import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext } from "@/lib/app-context";
import { isPlatformFeatureEnabled } from "@/lib/feature-flags/service";
import { runScientistSkill } from "@/lib/labs/skills";
import { listMetaAdAccountOptions } from "@/lib/meta-ad-accounts";
import { fetchDeliveryEstimate } from "@/lib/meta-graph";

const FLAG = "campaigns.commander.scientists.geo";

/** GET → estado da flag (UI decide se mostra o Geo Scientist). */
export async function GET() {
  return NextResponse.json({ ok: true, enabled: await isPlatformFeatureEnabled(FLAG) });
}

const BodySchema = z.object({
  briefing: z.string().max(2000).optional(),
  region: z.string().max(200).optional(),
  places: z.array(z.string().max(160)).max(40).optional(),
  geoLocations: z
    .array(
      z.object({
        label: z.string().max(160).optional(),
        latitude: z.number(),
        longitude: z.number(),
        radius: z.number()
      })
    )
    .max(50)
    .optional()
});

/** Alcance estimado (Meta delivery estimate) só com geo — usa a primeira conta real do tenant. */
async function estimateReach(
  tenantId: string,
  metaAccessToken: string | undefined,
  locs: NonNullable<z.infer<typeof BodySchema>["geoLocations"]>
): Promise<{ lower: number | null; upper: number | null } | null> {
  if (!metaAccessToken || !locs.length) return null;
  try {
    const accounts = await listMetaAdAccountOptions({ tenantId, metaAccessToken });
    const acct = accounts.find((a) => !a.isDemo) ?? accounts[0];
    if (!acct) return null;
    const spec = {
      geo_locations: {
        custom_locations: locs.map((l) => ({
          latitude: l.latitude,
          longitude: l.longitude,
          radius: l.radius,
          distance_unit: "kilometer"
        }))
      }
    };
    const est = await fetchDeliveryEstimate(metaAccessToken, acct.metaAdAccountId, spec);
    if (!est.estimateReady) return null;
    return { lower: est.usersLowerBound, upper: est.usersUpperBound };
  } catch {
    return null;
  }
}

/** Geo Scientist sobre o briefing + lugares da zona (read-only). */
export async function POST(req: Request) {
  const { tenant, metaAccessToken } = await getAppContext(); // exige sessão
  const body = BodySchema.parse(await req.json().catch(() => ({})));

  const [run, reach] = await Promise.all([
    runScientistSkill("geo", {
      briefing: body.briefing ?? null,
      region: body.region ?? null,
      places: body.places ?? [],
      geoLocations: body.geoLocations ?? []
    }),
    estimateReach(tenant.id, metaAccessToken, body.geoLocations ?? [])
  ]);

  if (!run.ran && !reach) {
    return NextResponse.json({ ok: false, reason: run.reason ?? "not_ran" });
  }

  return NextResponse.json({
    ok: true,
    geo: {
      itemsAnalyzed: run.itemsAnalyzed ?? 0,
      summary: run.summary ?? null,
      confidence: run.confidence ?? null,
      findings: run.findings.slice(0, 8),
      reach
    }
  });
}
