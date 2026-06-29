"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { MapPin, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { ZoneCreateModeSheet } from "@/components/audiences/ZoneCreateModeSheet";
import { ZoneDetailPanel } from "@/components/audiences/ZoneDetailPanel";
import { PageTitleBlock } from "@/design-system/components/PageTitleBlock";
import { DsInfoBanner } from "@/design-system";
import { useRouter } from "@/i18n/navigation";

export type ZoneSummary = {
  id: string;
  name: string;
  description: string | null;
  geoRules: import("@/db/entities/UserZone").ZoneGeoRules;
  sourcePrompt: string | null;
  updatedAt: string;
};

export function ZonesLibraryClient() {
  const t = useTranslations("audiences");
  const tm = useTranslations("audiencesMisc");
  const router = useRouter();
  const [zones, setZones] = useState<ZoneSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateMode, setShowCreateMode] = useState(false);
  const [selectedZone, setSelectedZone] = useState<ZoneSummary | null>(null);
  const [, startTransition] = useTransition();

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/zones")
      .then((r) => r.json())
      .then((j: { ok?: boolean; zones?: ZoneSummary[]; error?: string }) => {
        if (!j.ok) {
          setError(j.error ?? tm("errorLoadingZones"));
          setZones([]);
          return;
        }
        setZones(j.zones ?? []);
        setError(null);
      })
      .catch(() => setError(tm("errorLoadingZones")))
      .finally(() => setLoading(false));
  }, [tm]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageTitleBlock
          title={t("zonesLibraryTitle")}
          subtitle={t("zonesLibrarySubtitle")}
          titleIcon={<MapPin size={16} aria-hidden />}
          badge={
            <span
              className="rounded-full px-2 py-0.5 font-heading text-[10px] font-semibold uppercase tracking-wide"
              style={{
                background: "var(--ui-accent-muted)",
                color: "var(--ui-accent)",
                border: "1px solid var(--ui-accent-border)"
              }}
            >
              {t("zonesLibraryBadge")}
            </span>
          }
        />
        <button
          type="button"
          className="ui-btn-accent inline-flex items-center gap-2 px-5 py-2.5 font-heading text-sm font-semibold"
          onClick={() => setShowCreateMode(true)}
        >
          <Plus size={16} />
          {t("newZone")}
        </button>
      </div>

      <DsInfoBanner className="px-4 py-2.5 text-sm">{t("zonesLibraryAureumAlert")}</DsInfoBanner>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {loading ? (
        <div className="dashboard-kpi-card flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center !min-h-0">
          <p className="text-sm text-[var(--text-dim)]">{t("loadingZones")}</p>
        </div>
      ) : zones.length === 0 ? (
        <div className="dashboard-kpi-card flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center !min-h-0">
          <MapPin size={32} className="text-[var(--text-dimmer)]" aria-hidden />
          <p className="text-sm text-[var(--text-dim)]">{t("noZonesYet")}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {zones.map((z) => {
            const pinCount = z.geoRules.customLocations?.length ?? 0;
            const cityCount = z.geoRules.cities?.length ?? 0;
            const countryCount = z.geoRules.countries?.length ?? 0;
            return (
              <article key={z.id} className="campaign-creator-card flex flex-col gap-2 p-4">
                <h3 className="font-heading text-[var(--text-main)]">{z.name}</h3>
                {z.description ? (
                  <p className="line-clamp-2 text-sm text-[var(--text-dim)]">{z.description}</p>
                ) : null}
                <p className="text-xs text-[var(--text-dimmer)]">
                  {pinCount > 0
                    ? t("zonePinCount", { count: pinCount })
                    : cityCount > 0
                      ? t("zoneCityCount", { count: cityCount })
                      : t("zoneCountryCount", { count: countryCount })}
                </p>
                <button
                  type="button"
                  className="ui-btn-secondary mt-auto w-full text-xs"
                  onClick={() => setSelectedZone(z)}
                >
                  {t("viewZone")}
                </button>
              </article>
            );
          })}
        </div>
      )}

      <ZoneCreateModeSheet
        open={showCreateMode}
        onClose={() => setShowCreateMode(false)}
        onSelectManual={() => router.push("/audiences/zones/create?mode=manual")}
        onSelectAi={() => router.push("/audiences/zones/create?mode=ai")}
      />

      {selectedZone ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="campaign-creator-card max-h-[90vh] w-full max-w-4xl overflow-hidden p-0">
            <div className="max-h-[90vh] overflow-y-auto p-5">
              <ZoneDetailPanel
                zone={selectedZone}
                onClose={() => setSelectedZone(null)}
                onSaved={(updated) => {
                  setSelectedZone(updated);
                  startTransition(() => load());
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
