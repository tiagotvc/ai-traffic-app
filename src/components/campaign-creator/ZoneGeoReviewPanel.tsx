"use client";

import { MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import type { ZoneSummary } from "@/components/audiences/ZonesLibraryClient";
import { ZoneDetailPanel } from "@/components/audiences/ZoneDetailPanel";
import { UxModalPortal } from "@/uxpilot-ui/adapters/UxModalPortal";
import type { ZoneGeoRules } from "@/db/entities/UserZone";
import { normalizeZoneGeoRules, zoneGeoRulesToMapPins } from "@/lib/zone-geo-shared";

type ApiZone = {
  id: string;
  name: string;
  description: string | null;
  geoRules: ZoneGeoRules;
  sourcePrompt: string | null;
  updatedAt: string;
};

function toZoneSummary(zone: ApiZone): ZoneSummary {
  return {
    id: zone.id,
    name: zone.name,
    description: zone.description,
    geoRules: zone.geoRules,
    sourcePrompt: zone.sourcePrompt,
    updatedAt: zone.updatedAt
  };
}

type Props = {
  zoneId: string | null;
  className?: string;
};

export function ZoneGeoReviewPanel({ zoneId, className = "" }: Props) {
  const t = useTranslations("campaignCreator");
  const [zone, setZone] = useState<ZoneSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  const load = useCallback(() => {
    if (!zoneId) {
      setZone(null);
      return;
    }
    setLoading(true);
    fetch(`/api/zones/${encodeURIComponent(zoneId)}`)
      .then((r) => r.json())
      .then((j: { ok?: boolean; zone?: ApiZone }) => {
        if (j.ok && j.zone) setZone(toZoneSummary(j.zone));
        else setZone(null);
      })
      .catch(() => setZone(null))
      .finally(() => setLoading(false));
  }, [zoneId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!zoneId) return null;

  const pinCount = zone ? zoneGeoRulesToMapPins(normalizeZoneGeoRules(zone.geoRules)).length : 0;

  return (
    <>
      <div className={`rounded-xl border border-[var(--border-color)] bg-[var(--surface-bg)] p-3 ${className}`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[var(--text-main)]">{t("zoneReviewTitle")}</p>
            {loading ? (
              <p className="mt-1 text-xs text-[var(--text-dim)]">{t("zoneReviewLoading")}</p>
            ) : zone ? (
              <>
                <p className="mt-1 truncate text-sm text-[var(--text-main)]">{zone.name}</p>
                <p className="mt-0.5 text-[11px] text-[var(--text-dimmer)]">
                  {t("zoneReviewPinCount", { count: pinCount })}
                </p>
              </>
            ) : (
              <p className="mt-1 text-xs text-[var(--text-dim)]">{t("zoneReviewUnavailable")}</p>
            )}
          </div>
          <button
            type="button"
            className="ui-btn-secondary inline-flex shrink-0 items-center gap-1.5 text-xs"
            disabled={!zone || loading}
            onClick={() => setMapOpen(true)}
          >
            <MapPin size={14} />
            {t("zoneReviewOpenMap")}
          </button>
        </div>
      </div>

      <UxModalPortal open={mapOpen && zone != null} onClose={() => setMapOpen(false)}>
        <div className="ui-card max-h-[min(90vh,900px)] w-full max-w-4xl overflow-y-auto p-5 shadow-xl">
          {zone ? (
            <ZoneDetailPanel
              zone={zone}
              onClose={() => setMapOpen(false)}
              onSaved={(updated) => {
                setZone(updated);
                setMapOpen(false);
              }}
            />
          ) : null}
        </div>
      </UxModalPortal>
    </>
  );
}

type DraftZoneProps = {
  zone: ZoneSummary;
  onConfirm: (geoRules: ZoneGeoRules) => void;
  onClose: () => void;
};

export function ZoneGeoDraftReviewModal({ zone, onConfirm, onClose }: DraftZoneProps) {
  return (
    <UxModalPortal open onClose={onClose}>
      <div className="ui-card max-h-[min(90vh,900px)] w-full max-w-4xl overflow-y-auto p-5 shadow-xl">
        <ZoneDetailPanel
          zone={zone}
          draftOnly
          onDraftConfirm={onConfirm}
          onClose={onClose}
          onSaved={() => {}}
        />
      </div>
    </UxModalPortal>
  );
}

export function buildDraftZoneSummary(args: {
  geoRules: ZoneGeoRules;
  name: string;
  description?: string | null;
  sourcePrompt?: string | null;
}): ZoneSummary {
  return {
    id: "wizard-draft-zone",
    name: args.name,
    description: args.description ?? null,
    geoRules: args.geoRules,
    sourcePrompt: args.sourcePrompt ?? null,
    updatedAt: new Date().toISOString()
  };
}
