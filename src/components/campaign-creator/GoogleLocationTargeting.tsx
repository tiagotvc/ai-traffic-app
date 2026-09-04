"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { MapPin, Sparkles, Trash2 } from "lucide-react";

import { GeoRadiusMapPicker } from "@/components/campaign-creator/GeoRadiusMapPicker";
import { DsButton } from "@/design-system/components/DsButton";
import type { TargetingItem } from "@/lib/campaign-draft";
import type { GoogleSearchCampaignDraft } from "@/lib/google-campaign-draft";

type GoogleLocation = GoogleSearchCampaignDraft["campaign"]["locations"][number];
type Props = { locations: GoogleLocation[]; onChange: (locations: GoogleLocation[]) => void };

function locationToPin(location: GoogleLocation): TargetingItem | null {
  if (location.type !== "proximity" || location.latitude == null || location.longitude == null) return null;
  return { value: location.id, label: location.name, meta: { type: "custom_location", latitude: location.latitude, longitude: location.longitude, radius: location.radiusKm ?? 5, distanceUnit: "kilometer" } };
}

function pinToLocation(pin: TargetingItem): GoogleLocation | null {
  if (pin.meta?.latitude == null || pin.meta.longitude == null) return null;
  return { id: pin.value, name: pin.label, type: "proximity", latitude: pin.meta.latitude, longitude: pin.meta.longitude, radiusKm: pin.meta.radius ?? 5 };
}

export function GoogleLocationTargeting({ locations, onChange }: Props) {
  const [prompt, setPrompt] = useState("");
  const [defaultRadiusKm, setDefaultRadiusKm] = useState(5);
  const [provider, setProvider] = useState<"gemini" | "claude">("gemini");
  const [providers, setProviders] = useState({ gemini: true, claude: false });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const pins = useMemo(() => locations.flatMap((location) => locationToPin(location) ?? []), [locations]);
  const catalogLocations = locations.filter((location) => location.type !== "proximity");

  useEffect(() => {
    fetch("/api/zones/ai-generate").then((response) => response.json()).then((json: { providers?: { gemini: boolean; claude: boolean } }) => {
      if (!json.providers) return;
      setProviders(json.providers);
      setProvider(json.providers.gemini ? "gemini" : "claude");
    }).catch(() => {});
  }, []);

  function replacePins(nextPins: TargetingItem[]) {
    const keepCatalog = catalogLocations.length === 1 && catalogLocations[0]?.id === "2076" ? [] : catalogLocations;
    onChange([...keepCatalog, ...nextPins.flatMap((pin) => pinToLocation(pin) ?? [])]);
  }

  function generateAreas() {
    if (prompt.trim().length < 3) return;
    setFeedback(null);
    startTransition(async () => {
      try {
        const previewResponse = await fetch("/api/zones/ai-generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phase: "preview", prompt, provider, defaultRadiusKm }) });
        const previewJson = await previewResponse.json();
        if (!previewResponse.ok || !previewJson.ok) throw new Error(previewJson.error || "Não foi possível interpretar as áreas.");
        const geocodeResponse = await fetch("/api/zones/ai-generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phase: "geocode", prompt, provider, defaultRadiusKm, preview: previewJson.preview }) });
        const geocodeJson = await geocodeResponse.json();
        if (!geocodeResponse.ok || !geocodeJson.ok) throw new Error(geocodeJson.error || "Não foi possível localizar as áreas no mapa.");
        const now = Date.now();
        const generatedPins: TargetingItem[] = geocodeJson.result.places.map((place: { label: string; latitude: number; longitude: number }, index: number) => ({ value: `google_proximity_${place.latitude.toFixed(5)}_${place.longitude.toFixed(5)}_${now}_${index}`, label: place.label, meta: { type: "custom_location", latitude: place.latitude, longitude: place.longitude, radius: defaultRadiusKm, distanceUnit: "kilometer" as const } }));
        replacePins([...pins, ...generatedPins]);
        setFeedback(`${generatedPins.length} área${generatedPins.length === 1 ? "" : "s"} adicionada${generatedPins.length === 1 ? "" : "s"}. Revise os raios antes de salvar.`);
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Falha ao gerar as áreas.");
      }
    });
  }

  return <div className="mt-4 space-y-4 rounded-2xl border border-[#4285F4]/25 bg-[#4285F4]/[0.035] p-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-sm font-semibold"><MapPin size={16} className="text-[#4285F4]"/> Segmentação geográfica</div><p className="mt-1 text-xs text-[var(--text-dim)]">Descreva as regiões para a IA ou clique diretamente no mapa. Cada pino usa proximidade do Google.</p></div><span className="rounded-full bg-[#4285F4]/10 px-2.5 py-1 text-[11px] font-semibold text-[#4285F4]">{pins.length} {pins.length === 1 ? "área" : "áreas"}</span></div>
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_8rem_auto] lg:items-end">
      <label className="text-xs font-medium">Áreas desejadas<textarea className="mt-1 min-h-20 w-full rounded-xl border border-[var(--border-color)] bg-[var(--surface-card)] px-3 py-2 text-sm outline-none focus:border-[#4285F4]" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Ex.: Centro, Pioneiros e Nações em Balneário Camboriú, raio de 4 km"/></label>
      <label className="text-xs font-medium">Raio padrão<div className="relative mt-1"><input type="number" min={1} max={70} value={defaultRadiusKm} onChange={(event) => setDefaultRadiusKm(Math.min(70, Math.max(1, Number(event.target.value) || 1)))} className="h-10 w-full rounded-xl border border-[var(--border-color)] bg-[var(--surface-card)] px-3 pr-9 text-sm outline-none focus:border-[#4285F4]"/><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-dim)]">km</span></div></label>
      <DsButton variant="accentOutline" size="md" disabled={pending || prompt.trim().length < 3 || (!providers.gemini && !providers.claude)} onClick={generateAreas} className="h-10 whitespace-nowrap"><Sparkles size={15}/>{pending ? "Criando pinos…" : "Gerar áreas com IA"}</DsButton>
    </div>
    {providers.gemini && providers.claude ? <label className="flex items-center gap-2 text-xs text-[var(--text-dim)]">Modelo<select className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-card)] px-2 py-1" value={provider} onChange={(event) => setProvider(event.target.value as "gemini" | "claude")}><option value="gemini">Gemini</option><option value="claude">Claude</option></select></label> : null}
    {feedback ? <p className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-card)] px-3 py-2 text-xs text-[var(--text-dim)]">{feedback}</p> : null}
    {catalogLocations.length ? <div className="flex flex-wrap gap-2">{catalogLocations.map((location) => <span key={location.id} className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--surface-card)] px-3 py-1.5 text-xs"><MapPin size={13}/>{location.name}<button type="button" aria-label={`Remover ${location.name}`} onClick={() => onChange(locations.filter((item) => item.id !== location.id))}><Trash2 size={13}/></button></span>)}</div> : null}
    <GeoRadiusMapPicker pins={pins} onAdd={(pin) => replacePins([...pins, { ...pin, meta: { ...pin.meta, radius: defaultRadiusKm } }])} onRemove={(value) => replacePins(pins.filter((pin) => pin.value !== value))} onUpdateRadius={(value, radiusKm) => replacePins(pins.map((pin) => pin.value === value ? { ...pin, meta: { ...pin.meta, radius: radiusKm } } : pin))}/>
  </div>;
}
