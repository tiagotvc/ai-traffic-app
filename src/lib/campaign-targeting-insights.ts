import { isMapPinLocation, type DraftTargeting } from "@/lib/campaign-draft";

export type TargetingBreadth = "narrow" | "balanced" | "broad";

export function countDraftTargetingSegments(targeting: DraftTargeting): number {
  const detailed = targeting.detailedGroups.flatMap((g) => g.items);
  return targeting.interests.length + detailed.length;
}

export function summarizeDraftLocations(targeting: DraftTargeting): string | null {
  if (targeting.locations.length === 0) return null;
  const first = targeting.locations[0]!.label;
  if (targeting.locations.length === 1) return first;
  return `${first} +${targeting.locations.length - 1}`;
}

export function maxDraftGeoRadiusKm(targeting: DraftTargeting): number {
  return targeting.locations.reduce((max, loc) => {
    const radius = loc.meta?.radius;
    if (radius == null || radius <= 0) return max;
    return Math.max(max, radius);
  }, 0);
}

export function computeTargetingBreadth(
  ageMin: number,
  ageMax: number,
  segmentCount: number,
  targeting?: DraftTargeting
): TargetingBreadth {
  const ageSpan = Math.max(0, ageMax - ageMin);
  const maxRadius = targeting ? maxDraftGeoRadiusKm(targeting) : 0;
  const locationCount = targeting?.locations.length ?? 0;

  if (ageSpan >= 30 || segmentCount <= 2 || maxRadius >= 35 || locationCount === 0) {
    if (maxRadius >= 35 || ageSpan >= 40 || (segmentCount <= 1 && locationCount === 0)) {
      return "broad";
    }
  }

  if (ageSpan <= 14 && segmentCount >= 5 && maxRadius > 0 && maxRadius <= 15) {
    return "narrow";
  }

  if (ageSpan >= 30 || segmentCount <= 2 || maxRadius >= 25) return "broad";
  if (ageSpan <= 14 && segmentCount >= 5) return "narrow";
  return "balanced";
}

export type TargetingInsightAlertLabels = {
  ageWide: string;
  radiusWide: (values: { radius: number; location: string }) => string;
  noLocation: string;
  noInterests: string;
};

export function computeDraftTargetingAlerts(
  targeting: DraftTargeting,
  labels: TargetingInsightAlertLabels
): string[] {
  const alerts: string[] = [];
  const ageSpan = targeting.ageMax - targeting.ageMin;

  if (ageSpan >= 40) {
    alerts.push(labels.ageWide);
  }

  for (const loc of targeting.locations) {
    const radius = loc.meta?.radius;
    if (radius != null && radius > 25 && (isMapPinLocation(loc) || loc.meta?.type === "city" || loc.meta?.type === "region")) {
      alerts.push(labels.radiusWide({ radius: Math.round(radius), location: loc.label }));
    }
  }

  if (targeting.locations.length === 0) {
    alerts.push(labels.noLocation);
  }

  if (countDraftTargetingSegments(targeting) === 0) {
    alerts.push(labels.noInterests);
  }

  return alerts;
}
