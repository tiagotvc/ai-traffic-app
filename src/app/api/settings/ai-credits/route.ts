import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext } from "@/lib/app-context";
import { getAiCreditsStatus, getRecentCreditUsageLog, upsertTenantAiPolicy } from "@/lib/ai-credits";
import { getAiCreditsFeatureFlags } from "@/lib/ai-credits/feature-flags";

const patchSchema = z.object({
  distributionMode: z.enum(["shared_pool", "per_client_cap"]).optional(),
  alertThresholdPercent: z.number().int().min(0).max(100).optional(),
  reservePercent: z.number().int().min(0).max(100).optional(),
  defaultClientMonthlyCap: z.number().int().min(0).nullable().optional()
});

export async function GET() {
  const { tenant } = await getAppContext();
  const flags = await getAiCreditsFeatureFlags();

  if (!flags.creditsV2Enabled) {
    return NextResponse.json({
      ok: true,
      enabled: false,
      featureFlags: flags
    });
  }

  const [status, log] = await Promise.all([
    getAiCreditsStatus(tenant.id),
    getRecentCreditUsageLog(tenant.id, 30)
  ]);

  return NextResponse.json({
    ok: true,
    enabled: true,
    // A política de distribuição (modo/reserva/teto por cliente) só aparece pra quem tem
    // esse recurso avançado ligado — o saldo e o histórico acima aparecem pra todo mundo.
    policyEnabled: flags.tenantPolicyUiEnabled,
    log,
    ...status,
    policy: flags.tenantPolicyUiEnabled ? status.policy : undefined
  });
}

export async function PATCH(req: Request) {
  const { tenant } = await getAppContext();
  const flags = await getAiCreditsFeatureFlags();

  if (!flags.creditsV2Enabled || !flags.tenantPolicyUiEnabled) {
    return NextResponse.json(
      { ok: false, code: "AI_CREDITS_FEATURE_OFF", error: "Camada de créditos IA não está ativa" },
      { status: 403 }
    );
  }

  try {
    const body = patchSchema.parse(await req.json());
    const policy = await upsertTenantAiPolicy(tenant.id, body);
    const status = await getAiCreditsStatus(tenant.id);
    return NextResponse.json({ ok: true, policy, usage: status.usage });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error" },
      { status: 400 }
    );
  }
}
