"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { MapPin, Plus, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { AiZoneForm } from "@/components/audiences/create/AiZoneForm";
import { ZoneDetailPanel } from "@/components/audiences/ZoneDetailPanel";
import { DsPageHeader } from "@/design-system";
import type { ZoneGeoRules } from "@/db/entities/UserZone";

export type ZoneSummary = {
  id: string;
  name: string;
  description: string | null;
  geoRules: ZoneGeoRules;
  sourcePrompt: string | null;
  updatedAt: string;
};

export function ZonesLibraryClient() {
  const t = useTranslations("audiences");
  const [zones, setZones] = useState<ZoneSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedZone, setSelectedZone] = useState<ZoneSummary | null>(null);
  const [, startTransition] = useTransition();

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/zones")
      .then((r) => r.json())
      .then((j: { ok?: boolean; zones?: ZoneSummary[]; error?: string }) => {
        if (!j.ok) {
          setError(j.error ?? "Erro ao carregar zonas");
          setZones([]);
          return;
        }
        setZones(j.zones ?? []);
        setError(null);
      })
      .catch(() => setError("Erro ao carregar zonas"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-5">
      <DsPageHeader title={t("zonesLibraryTitle")} subtitle={t("zonesLibrarySubtitle")} titleIcon={<MapPin size={16} aria-hidden />} />
      <p className="text-xs font-medium" style={{ color: "var(--ui-accent)" }}>
        {t("zonesLibraryBadge")}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="ui-btn-primary inline-flex items-center gap-2"
          onClick={() => setShowCreate(true)}
        >
          <Plus size={16} />
          {t("newZone")}
        </button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-[var(--text-dim)]">{t("loadingZones")}</p>
      ) : zones.length === 0 ? (
        <div className="ui-card flex flex-col items-center gap-3 p-10 text-center">
          <MapPin size={32} className="text-[var(--text-dimmer)]" />
          <p className="text-sm text-[var(--text-dim)]">{t("noZonesYet")}</p>
          <button type="button" className="ui-btn-brand inline-flex items-center gap-2" onClick={() => setShowCreate(true)}>
            <Sparkles size={16} />
            {t("createFirstZone")}
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {zones.map((z) => {
            const pinCount = z.geoRules.customLocations?.length ?? 0;
            const cityCount = z.geoRules.cities?.length ?? 0;
            const countryCount = z.geoRules.countries?.length ?? 0;
            return (
              <article key={z.id} className="ui-card flex flex-col gap-2 p-4">
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

      {showCreate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="ui-card max-h-[90vh] w-full max-w-lg overflow-y-auto p-5">
            <AiZoneForm
              onClose={() => setShowCreate(false)}
              onSaved={() => {
                setShowCreate(false);
                startTransition(() => load());
              }}
            />
          </div>
        </div>
      ) : null}

      {selectedZone ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="ui-card max-h-[90vh] w-full max-w-4xl overflow-y-auto p-5">
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
      ) : null}
    </div>
  );
}
