import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getAiCreditWeights,
  getAiCreditsFeatureFlags,
  updateAiCreditWeights,
  updateAiCreditsFeatureFlags
} from "@/lib/ai-credits/feature-flags";
import { requireBillingAdmin } from "@/lib/billing/admin-auth";
import {
  getPlatformFeatureFlags,
  updatePlatformFeatureFlags
} from "@/lib/feature-flags/service";
import { FEATURE_REGISTRY } from "@/lib/feature-flags/registry";

const rolloutModeSchema = z.enum(["off", "admin_only", "global", "specific_users"]);

const featureEntrySchema = z.object({
  mode: rolloutModeSchema,
  allowedUserIds: z.array(z.string().uuid()).optional()
});

const patchSchema = z.object({
  featureFlags: z
    .object({
      creditsV2Enabled: z.boolean().optional(),
      tenantPolicyUiEnabled: z.boolean().optional(),
      perClientCapsEnabled: z.boolean().optional(),
      agentLayerEnabled: z.boolean().optional()
    })
    .optional(),
  weights: z.record(z.string(), z.number().int().min(0)).optional(),
  /** Overrides do sistema genérico de Módulos & Funcionalidades. */
  platformFeatures: z.record(z.string(), featureEntrySchema).optional()
});

export async function GET() {
  const gate = await requireBillingAdmin();
  if (!gate.ok) return gate.response;

  const [featureFlags, weights, platformFeatures] = await Promise.all([
    getAiCreditsFeatureFlags(),
    getAiCreditWeights(),
    getPlatformFeatureFlags()
  ]);

  return NextResponse.json({
    ok: true,
    featureFlags,
    weights,
    platformFeatures,
    featureRegistry: FEATURE_REGISTRY
  });
}

export async function PATCH(req: Request) {
  const gate = await requireBillingAdmin();
  if (!gate.ok) return gate.response;

  try {
    const body = patchSchema.parse(await req.json());
    let featureFlags = await getAiCreditsFeatureFlags();
    let weights = await getAiCreditWeights();
    let platformFeatures = await getPlatformFeatureFlags();

    if (body.featureFlags) {
      featureFlags = await updateAiCreditsFeatureFlags(body.featureFlags);
    }
    if (body.weights) {
      weights = await updateAiCreditWeights(
        body.weights as Partial<Record<string, number>>
      );
    }
    if (body.platformFeatures) {
      platformFeatures = await updatePlatformFeatureFlags(body.platformFeatures);
    }

    return NextResponse.json({
      ok: true,
      featureFlags,
      weights,
      platformFeatures,
      featureRegistry: FEATURE_REGISTRY
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error" },
      { status: 400 }
    );
  }
}
