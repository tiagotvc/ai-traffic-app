import { NextResponse } from "next/server";

import { apiErrorResponse, requireAppShellContext } from "@/lib/api-auth";
import { getEntitlements } from "@/lib/billing/entitlements";
import { getPlatformFeatureFlags } from "@/lib/feature-flags/service";
import { resolveAllFeaturesForUser } from "@/lib/feature-flags/registry";
import type { ResolvedFeatureMap } from "@/lib/feature-flags/types";
import { redisGetJson, redisSetJson } from "@/lib/redis-cache";

const CACHE_TTL_SEC = 60;

export async function GET(req: Request) {
  try {
    const { tenant, user, platformAdmin } = await requireAppShellContext();
    const cacheKey = `entitlements:${tenant.id}:${user.id}${platformAdmin ? ":platform_admin" : ""}`;
    const skipCache = new URL(req.url).searchParams.has("fresh");

    if (!skipCache) {
      const cached = await redisGetJson<{
        entitlements: Awaited<ReturnType<typeof getEntitlements>>;
        isPlatformAdmin: boolean;
        platformFeatures: ResolvedFeatureMap;
      }>(cacheKey);

      if (cached) {
        return NextResponse.json(
          { ok: true, ...cached },
          { headers: { "Cache-Control": "no-store" } }
        );
      }
    }

    const [entitlements, rawFlags] = await Promise.all([
      getEntitlements(tenant.id, { platformAdmin, userId: user.id }),
      getPlatformFeatureFlags()
    ]);
    const platformFeatures = resolveAllFeaturesForUser(rawFlags, {
      userId: user.id,
      isPlatformAdmin: platformAdmin
    });

    // Preferência do usuário (não é feature flag): sobrepõe o Commander/Scientists que ele
    // desligou por conta própria. "commander" desligado cascateia pra todo "commander.*".
    const userDisabled = new Set(tenant.commanderDisabledCapabilities ?? []);
    if (userDisabled.size) {
      const commanderOff = userDisabled.has("commander");
      for (const id of Object.keys(platformFeatures)) {
        if (id === "commander" || id.startsWith("commander.")) {
          if (commanderOff || userDisabled.has(id)) platformFeatures[id] = false;
        }
      }
    }

    const payload = { entitlements, isPlatformAdmin: platformAdmin, platformFeatures };
    void redisSetJson(cacheKey, payload, CACHE_TTL_SEC);

    return NextResponse.json(
      { ok: true, ...payload },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return apiErrorResponse(err, "api/me/entitlements");
  }
}
