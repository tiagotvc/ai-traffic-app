"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Image as ImageIcon, Layers, Megaphone } from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import { GoogleNavSelect, type NavOption } from "@/components/google/GoogleNavSelect";
import { lastNDaysRange } from "@/components/GoogleDateRangePicker";

/**
 * Barra de navegação Google (padrão do Google Ads): Campanha › Grupo › Anúncio,
 * sempre visível para agilizar o drill. Cada nível abre um menu dos irmãos; sem
 * seleção o nível mostra "Todos". Trocar de campanha/grupo navega para a tela
 * correspondente; escolher um anúncio dispara `onSelectAd` (ex.: abrir o preview).
 */
export function GoogleNavBar({
  clientId,
  campaignId,
  adGroupId,
  adId,
  onSelectAd
}: {
  clientId: string;
  campaignId: string;
  adGroupId?: string;
  adId?: string;
  onSelectAd?: (adId: string) => void;
}) {
  const t = useTranslations("client");
  const router = useRouter();
  const base = `/api/clients/${encodeURIComponent(clientId)}/google-ads`;
  const r = lastNDaysRange(30); // os nomes não dependem do período

  const [campaigns, setCampaigns] = useState<NavOption[]>([]);
  const [adGroups, setAdGroups] = useState<NavOption[]>([]);
  const [ads, setAds] = useState<NavOption[]>([]);

  useEffect(() => {
    fetch(`${base}/metrics?since=${r.since}&until=${r.until}`)
      .then((x) => x.json())
      .then((j) => {
        if (j.ok) {
          setCampaigns(
            (j.campaigns ?? []).map((c: { campaignId: string; name: string }) => ({
              value: c.campaignId,
              label: c.name
            }))
          );
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base]);

  useEffect(() => {
    if (!campaignId) {
      setAdGroups([]);
      return;
    }
    fetch(`${base}/adgroups?campaignId=${campaignId}&since=${r.since}&until=${r.until}`)
      .then((x) => x.json())
      .then((j) => {
        if (j.ok) {
          setAdGroups((j.rows ?? []).map((g: { id: string; name: string }) => ({ value: g.id, label: g.name })));
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, campaignId]);

  useEffect(() => {
    if (!adGroupId) {
      setAds([]);
      return;
    }
    fetch(`${base}/ads?adGroupId=${adGroupId}&since=${r.since}&until=${r.until}`)
      .then((x) => x.json())
      .then((j) => {
        if (j.ok) {
          setAds(
            (j.rows ?? []).map((a: { id: string; name: string }) => ({
              value: a.id,
              label: a.name || `#${a.id}`
            }))
          );
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, adGroupId]);

  const ALL = { value: "", label: t("googleNavAll") };

  function goCampaign(id: string) {
    if (id && id !== campaignId) router.push(`/clients/${clientId}/google/campaigns/${id}`);
  }
  function goAdGroup(id: string) {
    if (!id) {
      router.push(`/clients/${clientId}/google/campaigns/${campaignId}`); // "Todos" → volta pra campanha
      return;
    }
    if (id !== adGroupId) {
      router.push(`/clients/${clientId}/google/campaigns/${campaignId}/adgroups/${id}`);
    }
  }
  function goAd(id: string) {
    if (id) onSelectAd?.(id); // "Todos" já exibe todos os anúncios
  }

  return (
    <div className="flex flex-wrap items-end gap-2 py-2">
      <GoogleNavSelect
        label={t("googleAdsColCampaign")}
        value={campaignId}
        options={campaigns}
        onSelect={goCampaign}
        icon={<Megaphone size={14} />}
        active={!adGroupId}
      />
      <GoogleNavSelect
        label={t("googleColAdGroup")}
        value={adGroupId ?? ""}
        options={[ALL, ...adGroups]}
        onSelect={goAdGroup}
        icon={<Layers size={14} />}
        active={!!adGroupId && !adId}
      />
      <GoogleNavSelect
        label={t("googleAdsTitle")}
        value={adId ?? ""}
        options={[ALL, ...ads]}
        onSelect={goAd}
        icon={<ImageIcon size={14} />}
        active={!!adId}
      />
    </div>
  );
}
