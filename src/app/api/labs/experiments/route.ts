import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { inngest } from "@/lib/inngest/client";
import {
  createLabsExperiment,
  listLabsExperiments
} from "@/lib/labs/experiment-service";
import { isLabsEnabledForUser } from "@/lib/labs/feature-flag";
import { assertLabsAccess, labsUnavailableResponse } from "@/lib/labs/access";
import { isLabsMockMode, runLabsMockPipeline } from "@/lib/labs/mock-runner";
import { MVP_SCIENTIST_IDS, estimateCredits } from "@/lib/labs/types";

const CreateSchema = z.object({
  name: z.string().min(1).max(200),
  product: z.string().min(1).max(500),
  clientId: z.string().uuid().optional(),
  niche: z.string().max(200).optional(),
  market: z.string().max(100).optional(),
  country: z.string().max(10).optional(),
  language: z.string().max(20).optional(),
  objective: z.string().max(2000).optional(),
  competitors: z.array(z.string()).optional(),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  selectedScientists: z.array(z.string()).min(1).optional(),
  maxCredits: z.number().int().positive().optional(),
  maxDurationMinutes: z.number().int().positive().optional()
});

export async function GET(req: Request) {
  try {
    const ctx = await getAppContext();
    if (!isLabsEnabledForUser(ctx.platformAdmin)) {
      return labsUnavailableResponse();
    }

    const billingBlock = await assertLabsAccess(ctx);
    if (billingBlock) return billingBlock;

    const { tenant } = ctx;
    const url = new URL(req.url);
    const clientSlug = url.searchParams.get("clientId");
    let clientId: string | undefined;
    if (clientSlug) {
      const client = await getClientBySlugOrId(tenant.id, clientSlug);
      if (!client) {
        return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
      }
      clientId = client.id;
    }

    const items = await listLabsExperiments(tenant.id, clientId);
    return NextResponse.json({ ok: true, items });
  } catch (err) {
    console.error("[labs/experiments GET]", err);
    return NextResponse.json({ ok: false, error: "Erro ao listar Labs" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getAppContext();
    if (!isLabsEnabledForUser(ctx.platformAdmin)) {
      return labsUnavailableResponse();
    }

    const { tenant, user } = ctx;
    if (!user) {
      return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });
    }

    const billingBlock = await assertLabsAccess(ctx);
    if (billingBlock) return billingBlock;

    const body = CreateSchema.parse(await req.json());
    const selectedScientists = body.selectedScientists ?? [...MVP_SCIENTIST_IDS];
    const estimated = estimateCredits(selectedScientists);

    if (body.maxCredits && estimated > body.maxCredits) {
      return NextResponse.json(
        { ok: false, error: `Créditos estimados (${estimated}) excedem o máximo` },
        { status: 400 }
      );
    }

    let clientId = body.clientId;
    if (!clientId && body.websiteUrl === undefined) {
      const url = new URL(req.url);
      const clientSlug = url.searchParams.get("clientId");
      if (clientSlug) {
        const client = await getClientBySlugOrId(tenant.id, clientSlug);
        clientId = client?.id;
      }
    }

    const experiment = await createLabsExperiment(tenant.id, user.id, {
      ...body,
      clientId: clientId ?? null,
      websiteUrl: body.websiteUrl || null,
      selectedScientists
    });

    if (isLabsMockMode()) {
      void runLabsMockPipeline(experiment.id, selectedScientists).catch((mockErr) => {
        console.error("[labs mock pipeline]", mockErr);
      });
    } else {
      await inngest.send({
        name: "labs/experiment.created",
        data: {
          experimentId: experiment.id,
          tenantId: tenant.id,
          userId: user.id,
          selectedScientists
        }
      });
    }

    return NextResponse.json({
      ok: true,
      experiment,
      estimatedCredits: estimated,
      mock: isLabsMockMode()
    });
  } catch (err) {
    console.error("[labs/experiments POST]", err);
    const message =
      err instanceof Error ? err.message : "Erro ao criar experimento Labs";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
