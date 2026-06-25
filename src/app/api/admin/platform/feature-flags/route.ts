import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getAiCreditWeights,
  getAiCreditsFeatureFlags,
  updateAiCreditWeights,
  updateAiCreditsFeatureFlags
} from "@/lib/ai-credits/feature-flags";
import { requireBillingAdmin } from "@/lib/billing/admin-auth";

const patchSchema = z.object({
  featureFlags: z
    .object({
      creditsV2Enabled: z.boolean().optional(),
      tenantPolicyUiEnabled: z.boolean().optional(),
      perClientCapsEnabled: z.boolean().optional(),
      agentLayerEnabled: z.boolean().optional()
    })
    .optional(),
  weights: z.record(z.string(), z.number().int().min(0)).optional()
});

export async function GET() {
  const gate = await requireBillingAdmin();
  if (!gate.ok) return gate.response;

  const [featureFlags, weights] = await Promise.all([
    getAiCreditsFeatureFlags(),
    getAiCreditWeights()
  ]);

  return NextResponse.json({ ok: true, featureFlags, weights });
}

export async function PATCH(req: Request) {
  const gate = await requireBillingAdmin();
  if (!gate.ok) return gate.response;

  try {
    const body = patchSchema.parse(await req.json());
    let featureFlags = await getAiCreditsFeatureFlags();
    let weights = await getAiCreditWeights();

    if (body.featureFlags) {
      featureFlags = await updateAiCreditsFeatureFlags(body.featureFlags);
    }
    if (body.weights) {
      weights = await updateAiCreditWeights(
        body.weights as Partial<Record<string, number>>
      );
    }

    return NextResponse.json({ ok: true, featureFlags, weights });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error" },
      { status: 400 }
    );
  }
}
