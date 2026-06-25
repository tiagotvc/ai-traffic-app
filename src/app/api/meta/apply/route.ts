import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";
import { pauseAd, updateCampaignDailyBudget } from "@/lib/meta-graph";
import { sendTransactionalEmail } from "@/lib/email";

const BodySchema = z.object({
  recommendationId: z.string().uuid()
});

export async function POST(req: Request) {
  const { tenant, defaultClient, metaAccessToken, session } = await getAppContext();
  const body = BodySchema.parse(await req.json().catch(() => ({})));

  const { aiRecommendation: recRepo, auditLog: auditRepo } = await repositories();

  const rec = await recRepo.findOne({ where: { id: body.recommendationId, tenantId: tenant.id } });
  if (!rec) return NextResponse.json({ ok: false, error: "Recommendation not found" }, { status: 404 });

  const payload = rec.payload as any;
  const actionType = rec.actionType;
  const targetId = rec.targetId ?? payload?.targetId;

  try {
    if (!metaAccessToken) throw new Error("Missing Meta access token");

    if (actionType === "PAUSE_AD") {
      await pauseAd(metaAccessToken, String(targetId));
    } else if (actionType === "ALTER_BUDGET") {
      const percent = Number(payload?.value ?? payload?.incrementPercent ?? 10);
      const baseBudgetMinor = Number(payload?.currentBudgetMinor ?? 5000);
      const nextBudget = Math.round(baseBudgetMinor * (1 + percent / 100));
      await updateCampaignDailyBudget(metaAccessToken, String(targetId), nextBudget);
      rec.preview = {
        before: `R$ ${(baseBudgetMinor / 100).toFixed(2)}/dia`,
        after: `R$ ${(nextBudget / 100).toFixed(2)}/dia`
      };
    }
    // UPDATE_BID: depende do conjunto/campanha — registrar no log no MVP.

    rec.status = "APPLIED";
    await recRepo.save(rec);

    await auditRepo.save(
      auditRepo.create({
        tenantId: tenant.id,
        clientId: defaultClient.id,
        kind: "META_APPLY",
        success: true,
        request: { actionType, targetId, recommendationId: rec.id }
      })
    );

    const email = session.user?.email;
    if (email) {
      await sendTransactionalEmail({
        to: email,
        subject: "Orion Agency — Alteração aplicada na conta",
        text:
          `Ação aplicada:\n` +
          `- Tipo: ${actionType}\n` +
          `- Alvo: ${String(targetId)}\n` +
          `- Justificativa: ${rec.justification}\n\n` +
          `Tenant: ${tenant.brandName ?? tenant.name}\n`
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    await auditRepo.save(
      auditRepo.create({
        tenantId: tenant.id,
        clientId: defaultClient.id,
        kind: "META_APPLY",
        success: false,
        errorMessage: msg,
        request: { actionType, targetId, recommendationId: rec.id }
      })
    );
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

