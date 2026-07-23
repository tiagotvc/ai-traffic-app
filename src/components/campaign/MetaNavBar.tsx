"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";
import { Image as ImageIcon, Layers, Megaphone, Users } from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import { GoogleNavSelect, type NavOption } from "@/components/google/GoogleNavSelect";
import { useCampaignDrilldownOptional } from "@/hooks/useCampaignDrilldown";

type AdsetLike = { id: string; name?: string | null };
type AdLike = { id: string; name?: string | null; adsetId?: string | null };

/**
 * Barra de navegação Meta em cascata: Cliente › Campanha › Conjunto › Anúncio
 * (reusa GoogleNavSelect). Começa pelo CLIENTE — só depois de escolher o cliente
 * lista as campanhas dele (evita despejar tudo). Conjuntos/anúncios vêm do contexto
 * de drilldown da campanha carregada. Autossuficiente: lê metaCampaignId da rota e
 * client/adset da query. Como o Meta não tem rota por conjunto/anúncio, escolher um
 * conjunto abre a aba Anúncios filtrada e escolher um anúncio cai na aba do conjunto.
 */
export function MetaNavBar() {
  const t = useTranslations("campaignManager");
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const drill = useCampaignDrilldownOptional();

  const metaCampaignId = String(params?.metaCampaignId ?? "");
  const adsetId = searchParams.get("adset") || undefined;
  const currentClient = searchParams.get("client") || drill?.campaign?.clientSlug || "";

  const [clients, setClients] = useState<NavOption[]>([]);
  const [selectedClient, setSelectedClient] = useState(currentClient);
  const [campaigns, setCampaigns] = useState<NavOption[]>([]);

  // Lista de clientes (para a caixa Cliente).
  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((j) => {
        setClients(
          (j.clients ?? []).map((c: { slug: string; name: string }) => ({ value: c.slug, label: c.name }))
        );
      })
      .catch(() => {});
  }, []);

  // Sincroniza o cliente selecionado com o da campanha atual (ao navegar).
  useEffect(() => {
    if (currentClient) setSelectedClient(currentClient);
  }, [currentClient]);

  // Campanhas do cliente selecionado (só carrega após ter um cliente).
  useEffect(() => {
    if (!selectedClient) {
      setCampaigns([]);
      return;
    }
    fetch(`/api/command-center/campaigns?clientId=${encodeURIComponent(selectedClient)}`)
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
  }, [selectedClient]);

  const client = encodeURIComponent(selectedClient);
  // Lista de campanhas (sem campanha na rota) mostra a caixa Cliente; dentro de uma
  // campanha o cliente já é fixo, então some.
  const isList = !metaCampaignId;
  const onCurrentClient = !!metaCampaignId && selectedClient === currentClient;
  const adsets = (drill?.adsets ?? []) as AdsetLike[];
  const adsAll = (drill?.ads ?? []) as AdLike[];
  const adsScoped = adsetId ? adsAll.filter((a) => a.adsetId === adsetId) : adsAll;

  // Valor da caixa Campanha: a campanha atual só quando estamos no cliente dela.
  const campaignValue = onCurrentClient ? metaCampaignId : "";
  const hasCurrent = campaigns.some((c) => c.value === metaCampaignId);
  const campaignOptions: NavOption[] =
    onCurrentClient && !hasCurrent
      ? [{ value: metaCampaignId, label: drill?.campaign?.name ?? metaCampaignId }, ...campaigns]
      : campaigns;

  const ALL: NavOption = { value: "", label: t("navAll") };
  const adsetOptions: NavOption[] = [ALL, ...adsets.map((a) => ({ value: a.id, label: a.name || `#${a.id}` }))];
  const adOptions: NavOption[] = [ALL, ...adsScoped.map((a) => ({ value: a.id, label: a.name || `#${a.id}` }))];

  function goCampaign(id: string) {
    if (id && (id !== metaCampaignId || !onCurrentClient)) {
      router.push(`/campaigns/${id}?client=${client}`);
    }
  }
  function goAdset(id: string) {
    if (!metaCampaignId) return; // sem campanha (na lista) o nível conjunto é inerte
    if (!id) {
      router.push(`/campaigns/${metaCampaignId}?client=${client}`); // "Todos" → volta pra campanha
      return;
    }
    router.push(`/campaigns/${metaCampaignId}/ads?client=${client}&adset=${id}`);
  }
  function goAd(id: string) {
    if (!metaCampaignId || !id) return;
    const ad = adsAll.find((a) => a.id === id);
    const suffix = ad?.adsetId ? `&adset=${ad.adsetId}` : "";
    router.push(`/campaigns/${metaCampaignId}/ads?client=${client}${suffix}`);
  }

  // Tela de "nova campanha" não faz sentido.
  if (metaCampaignId === "new") return null;

  return (
    <div className="flex flex-wrap items-end gap-2 py-2">
      {isList ? (
        <GoogleNavSelect
          label={t("navClient")}
          value={selectedClient}
          options={clients}
          onSelect={setSelectedClient}
          icon={<Users size={14} />}
        />
      ) : null}
      <GoogleNavSelect
        label={t("navCampaign")}
        value={campaignValue}
        options={campaignOptions}
        onSelect={goCampaign}
        icon={<Megaphone size={14} />}
        active={onCurrentClient && !adsetId}
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
