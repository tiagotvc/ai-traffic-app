"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";
import { Image as ImageIcon, Layers, Megaphone } from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import { GoogleNavSelect, type NavOption } from "@/components/google/GoogleNavSelect";
import { useCampaignDrilldownOptional } from "@/hooks/useCampaignDrilldown";

type AdsetLike = { id: string; name?: string | null };
type AdLike = { id: string; name?: string | null; adsetId?: string | null };

/**
 * Barra de navegação Meta (Campanha › Conjunto › Anúncio), no mesmo padrão do
 * seletor do Google (reusa GoogleNavSelect). Autossuficiente: lê metaCampaignId da
 * rota e client/adset da query. Conjuntos/anúncios vêm do contexto de drilldown (sem
 * novo fetch); a lista de campanhas vem de /api/command-center/campaigns. Como o Meta
 * não tem rota por conjunto/anúncio, escolher um conjunto abre a aba Anúncios filtrada
 * e escolher um anúncio cai na aba Anúncios do conjunto correspondente.
 */
export function MetaNavBar() {
  const t = useTranslations("campaignManager");
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const drill = useCampaignDrilldownOptional();

  const metaCampaignId = String(params?.metaCampaignId ?? "");
  const clientSlug = searchParams.get("client") ?? "";
  const adsetId = searchParams.get("adset") || undefined;
  const client = encodeURIComponent(clientSlug);

  const [campaigns, setCampaigns] = useState<NavOption[]>([]);

  useEffect(() => {
    if (!clientSlug) return;
    fetch(`/api/command-center/campaigns?clientId=${encodeURIComponent(clientSlug)}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setCampaigns(
            (j.rows ?? []).map((c: { metaCampaignId: string; campaignName: string }) => ({
              value: c.metaCampaignId,
              label: c.campaignName
            }))
          );
        }
      })
      .catch(() => {});
  }, [clientSlug]);

  const adsets = (drill?.adsets ?? []) as AdsetLike[];
  const adsAll = (drill?.ads ?? []) as AdLike[];
  const adsScoped = adsetId ? adsAll.filter((a) => a.adsetId === adsetId) : adsAll;

  // Garante que a campanha atual apareça com o nome mesmo antes da lista carregar.
  const hasCurrent = campaigns.some((c) => c.value === metaCampaignId);
  const campaignOptions: NavOption[] = hasCurrent
    ? campaigns
    : [{ value: metaCampaignId, label: drill?.campaign?.name ?? metaCampaignId }, ...campaigns];

  const ALL: NavOption = { value: "", label: t("navAll") };
  const adsetOptions: NavOption[] = [ALL, ...adsets.map((a) => ({ value: a.id, label: a.name || `#${a.id}` }))];
  const adOptions: NavOption[] = [ALL, ...adsScoped.map((a) => ({ value: a.id, label: a.name || `#${a.id}` }))];

  function goCampaign(id: string) {
    if (id && id !== metaCampaignId) router.push(`/campaigns/${id}?client=${client}`);
  }
  function goAdset(id: string) {
    if (!id) {
      router.push(`/campaigns/${metaCampaignId}?client=${client}`); // "Todos" → volta pra campanha
      return;
    }
    router.push(`/campaigns/${metaCampaignId}/ads?client=${client}&adset=${id}`);
  }
  function goAd(id: string) {
    if (!id) return;
    const ad = adsAll.find((a) => a.id === id);
    const suffix = ad?.adsetId ? `&adset=${ad.adsetId}` : "";
    router.push(`/campaigns/${metaCampaignId}/ads?client=${client}${suffix}`);
  }

  // Fora de uma campanha real (ex.: tela de "nova campanha") não faz sentido.
  if (!metaCampaignId || metaCampaignId === "new") return null;

  return (
    <div className="flex flex-wrap items-end gap-2 py-2">
      <GoogleNavSelect
        label={t("navCampaign")}
        value={metaCampaignId}
        options={campaignOptions}
        onSelect={goCampaign}
        icon={<Megaphone size={14} />}
        active={!adsetId}
      />
      <GoogleNavSelect
        label={t("navAdset")}
        value={adsetId ?? ""}
        options={adsetOptions}
        onSelect={goAdset}
        icon={<Layers size={14} />}
        active={!!adsetId}
      />
      <GoogleNavSelect
        label={t("navAd")}
        value=""
        options={adOptions}
        onSelect={goAd}
        icon={<ImageIcon size={14} />}
      />
    </div>
  );
}
