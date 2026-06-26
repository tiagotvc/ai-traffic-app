"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { CampaignStatusToggle } from "@/components/campaign/CampaignStatusToggle";
import { Link } from "@/i18n/navigation";
import { formatBRL, formatNumber, formatPercent, formatRoas } from "@/lib/format";
import { cn } from "@/lib/cn";

export type AdsetCarouselItem = {
  id: string;
  name?: string;
  status?: string;
  dailyBudget: number | null;
  spend: number;
  conversions: number;
  cpa: number | null;
  roas: number;
  reach: number;
  ctr: number;
};

type CampaignAdsetsCarouselProps = {
  adsets: AdsetCarouselItem[];
  locale: string;
  metaCampaignId: string;
  clientSlug: string;
  embedded?: boolean;
  onViewAdsets?: () => void;
  onStatusChange: (id: string, action: "pause" | "activate") => void;
  statusPendingId?: string | null;
  statusDisabled?: boolean;
  statusLabel: (status: string) => string;
  detailHref?: (adsetId: string) => string;
  className?: string;
};

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[var(--text-dimmer)]">{label}</div>
      <div className="font-semibold text-[var(--text-main)]">{value}</div>
    </div>
  );
}

export function CampaignAdsetsCarousel({
  adsets,
  locale,
  metaCampaignId,
  clientSlug,
  embedded,
  onViewAdsets,
  onStatusChange,
  statusPendingId,
  statusDisabled,
  statusLabel,
  detailHref,
  className
}: CampaignAdsetsCarouselProps) {
  const t = useTranslations("campaignManager");
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, startX: 0, scrollLeft: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const pauseAutoRef = useRef(false);

  const scrollByCard = useCallback((direction: 1 | -1) => {
    const el = trackRef.current;
    if (!el || adsets.length < 2) return;
    const card = el.querySelector<HTMLElement>("[data-carousel-card]");
    const step = card ? card.offsetWidth + 12 : 300;
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 0) return;
    let next = el.scrollLeft + direction * step;
    if (next >= max - 4) next = 0;
    if (next < 0) next = max;
    el.scrollTo({ left: next, behavior: "smooth" });
  }, [adsets.length]);

  useEffect(() => {
    if (adsets.length < 2) return;
    const id = window.setInterval(() => {
      if (pauseAutoRef.current || dragRef.current.active) return;
      scrollByCard(1);
    }, 5000);
    return () => window.clearInterval(id);
  }, [adsets.length, scrollByCard]);

  const onPointerDown = (e: React.PointerEvent) => {
    const el = trackRef.current;
    if (!el) return;
    pauseAutoRef.current = true;
    dragRef.current = { active: true, startX: e.clientX, scrollLeft: el.scrollLeft };
    setIsDragging(true);
    el.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const el = trackRef.current;
    if (!el || !dragRef.current.active) return;
    e.preventDefault();
    const dx = e.clientX - dragRef.current.startX;
    el.scrollLeft = dragRef.current.scrollLeft - dx;
  };

  const endDrag = (e: React.PointerEvent) => {
    const el = trackRef.current;
    if (!el) return;
    dragRef.current.active = false;
    setIsDragging(false);
    try {
      el.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    window.setTimeout(() => {
      pauseAutoRef.current = false;
    }, 2500);
  };

  if (!adsets.length) {
    return <p className="text-xs text-[var(--text-dim)]">{t("noAdsets")}</p>;
  }

  const hrefFor = (id: string) =>
    detailHref?.(id) ??
    `/campaigns/${metaCampaignId}/adsets?client=${encodeURIComponent(clientSlug)}`;

  return (
    <div
      className={cn("ui-adsets-carousel", className)}
      onMouseEnter={() => {
        pauseAutoRef.current = true;
      }}
      onMouseLeave={() => {
        pauseAutoRef.current = false;
      }}
    >
      <div
        ref={trackRef}
        className={cn("ui-adsets-carousel__track", isDragging && "is-dragging")}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {adsets.map((a) => {
          const name = a.name ?? a.id;
          const nameNode = embedded ? (
            <button
              type="button"
              onClick={onViewAdsets}
              className="ui-link text-left font-semibold"
            >
              {name}
            </button>
          ) : (
            <Link href={hrefFor(a.id)} className="ui-link font-semibold">
              {name}
            </Link>
          );

          return (
            <article key={a.id} data-carousel-card className="ui-adsets-carousel__card ui-card shrink-0 p-4 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">{nameNode}</div>
                <CampaignStatusToggle
                  active={a.status === "ACTIVE"}
                  disabled={statusDisabled || statusPendingId === a.id}
                  ariaLabel={statusLabel(a.status ?? "")}
                  onChange={() => onStatusChange(a.id, a.status === "ACTIVE" ? "pause" : "activate")}
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                <Metric label={t("spend7d")} value={formatBRL(a.spend, locale)} />
                <Metric label={t("conversions")} value={String(a.conversions)} />
                <Metric label="CPA" value={a.cpa != null ? formatBRL(a.cpa, locale) : "—"} />
                <Metric label="ROAS" value={formatRoas(a.roas, locale)} />
                <Metric label={t("reach")} value={formatNumber(a.reach, locale)} />
                <Metric label="CTR" value={formatPercent(a.ctr, 2, locale)} />
              </div>
              <div className="mt-2 text-[11px] text-[var(--text-dim)]">
                {t("dailyBudget")}: {a.dailyBudget != null ? formatBRL(a.dailyBudget, locale) : "—"}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
