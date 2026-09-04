"use client";

import { useEffect, useState } from "react";
import { Facebook, PenLine, Search, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  CreationModeChoiceCard,
  CreationModeChoiceGrid,
  creationModeModalMaxWidthClass
} from "@/components/campaign-creator/CreationModeChoiceCard";
import { CreatorModalShell } from "@/components/campaign-creator/CreatorModalShell";
import { useRouter } from "@/i18n/navigation";
import { usePlatformFeature } from "@/hooks/usePlatformFeature";
import { triggerNavigationLoading } from "@/components/ui/NavigationLoadingOverlay";
import { commitCreationMode } from "@/lib/campaign-creator/creation-flow-session";
import { cn } from "@/lib/cn";

type CreationMode = "manual" | "ai" | "google-manual" | "google-ai";
type AdPlatform = "meta" | "google";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Called when the user confirms a mode (before navigation). Use to close overlay hosts. */
  onStarted?: () => void;
  clientSlug?: string;
};

function buildHref(mode: CreationMode, clientSlug?: string) {
  const params = new URLSearchParams();
  if (clientSlug) params.set("client", clientSlug);
  const google = mode === "google-manual" || mode === "google-ai";
  params.set("mode", google ? (mode === "google-ai" ? "google-ai" : "manual") : mode);
  if (google) params.set("platform", "google");
  const qs = params.toString();
  return `/campaigns/new${qs ? `?${qs}` : ""}`;
}

export function CampaignCreationModePicker({ open, onClose, onStarted, clientSlug }: Props) {
  const t = useTranslations("campaignCreator.ai");
  const tc = useTranslations("campaignCreator");
  const router = useRouter();
  const aiGenerateEnabled = usePlatformFeature("campaigns.ai-generate");
  const [selected, setSelected] = useState<CreationMode | null>(null);
  const [platform, setPlatform] = useState<AdPlatform | null>(null);
  const [available, setAvailable] = useState({ meta: true, google: true });
  const optionCount = aiGenerateEnabled ? 2 : 1;

  useEffect(() => {
    if (!open) { setSelected(null); setPlatform(null); }
  }, [open]);

  useEffect(() => {
    if (!open || !clientSlug) return;
    fetch("/api/clients?minimal=1").then((response) => response.json()).then((json) => {
      const client = (json.clients ?? []).find((item: { slug: string }) => item.slug === clientSlug);
      if (!client) return;
      const next = { meta: Boolean(client.metaConnected), google: Boolean(client.googleConnected) };
      setAvailable(next);
      if (next.google && !next.meta) setPlatform("google");
      if (next.meta && !next.google) setPlatform("meta");
    }).catch(() => {});
  }, [clientSlug, open]);

  function handleCreate() {
    if (!selected) return;
    const href = buildHref(selected, clientSlug);
    commitCreationMode(selected);
    onStarted?.();
    triggerNavigationLoading(href);
    router.push(href);
  }

  return (
    <CreatorModalShell
      open={open}
      onClose={onClose}
      title={t("modePickerTitle")}
      subtitle={t("modePickerHint")}
      width="md"
      className={creationModeModalMaxWidthClass(platform ? optionCount : 2)}
      contentClassName="pb-8"
      onCancel={onClose}
      cancelLabel={tc("modalCancel")}
      onPrimary={handleCreate}
      primaryLabel={t("modePickerStart")}
      primaryDisabled={selected === null}
      showPrimaryCheck={false}
    >
      {!platform ? <><p className="mb-3 text-sm font-medium">Onde esta campanha será criada?</p><CreationModeChoiceGrid ariaLabel="Selecionar plataforma">
        {available.meta ? <CreationModeChoiceCard selected={false} label="Meta Ads" description="Campanhas para Facebook, Instagram, Messenger e Audience Network." icon={Facebook} onSelect={() => { setPlatform("meta"); setSelected(null); }} /> : null}
        {available.google ? <CreationModeChoiceCard selected={false} label="Google Ads" description="Campanhas de Pesquisa com grupos, palavras-chave e anúncios responsivos." icon={Search} onSelect={() => { setPlatform("google"); setSelected(null); }} /> : null}
      </CreationModeChoiceGrid></> : <><button type="button" className="mb-3 text-xs font-medium text-[var(--violet)]" onClick={() => { setPlatform(null); setSelected(null); }}>← Trocar plataforma</button><p className="mb-3 text-sm font-medium">Como deseja montar a campanha em {platform === "google" ? "Google Ads" : "Meta Ads"}?</p><CreationModeChoiceGrid ariaLabel={t("modePickerTitle")} className={cn(!aiGenerateEnabled && "max-w-sm")}>
        <CreationModeChoiceCard selected={selected === (platform === "google" ? "google-manual" : "manual")} label={t("modeManualTitle")} description={platform === "google" ? "Preencha campanha, grupos, listas de palavras-chave, negativas e anúncios." : t("modeManualHint")} icon={PenLine} onSelect={() => setSelected(platform === "google" ? "google-manual" : "manual")} />
        {aiGenerateEnabled ? <CreationModeChoiceCard selected={selected === (platform === "google" ? "google-ai" : "ai")} label={t("modeAiTitle")} description={platform === "google" ? "Escreva o briefing e receba uma campanha de Pesquisa completa e editável." : t("modeAiHint")} icon={Sparkles} onSelect={() => setSelected(platform === "google" ? "google-ai" : "ai")} aiCredits={{ kind: "campaign_generate", calls: 1 }} /> : null}
      </CreationModeChoiceGrid></>}
    </CreatorModalShell>
  );
}
