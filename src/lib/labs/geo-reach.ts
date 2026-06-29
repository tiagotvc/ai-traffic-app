import "server-only";

import { listMetaAdAccountOptions } from "@/lib/meta-ad-accounts";
import { fetchDeliveryEstimate } from "@/lib/meta-graph";

/** Alcance estimado (Meta delivery estimate) só por geo — usa a 1ª conta real do tenant. */
export async function estimateGeoReach(
  tenantId: string,
  metaAccessToken: string | undefined,
  locs: Array<{ latitude: number; longitude: number; radius: number }>
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
