"use client";

import { useEffect, useState } from "react";
import { ImageOff, Loader2 } from "lucide-react";

import { DsModal } from "@/design-system";

type AdAccountOption = { metaAdAccountId: string; label: string };
type AccountImage = { hash: string; label: string; url: string };

/**
 * Picker de imagens já usadas em anúncios reais da conta Meta do cliente — pra começar
 * uma edição/vídeo a partir de um criativo de produção, não só do histórico gerado
 * pelo Estúdio Criativo. A imagem escolhida é baixada pelo servidor (evita CORS ao
 * exportar do canvas depois) e devolvida já em base64.
 */
export function AccountImagePickerModal({
  open,
  clientId,
  onClose,
  onPick
}: {
  open: boolean;
  clientId: string;
  onClose: () => void;
  onPick: (img: { base64: string; mimeType: string; label: string }) => void;
}) {
  const [adAccounts, setAdAccounts] = useState<AdAccountOption[]>([]);
  const [adAccountId, setAdAccountId] = useState("");
  const [images, setImages] = useState<AccountImage[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingImages, setLoadingImages] = useState(false);
  const [pickingHash, setPickingHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !clientId) return;
    setLoadingAccounts(true);
    setError(null);
    setImages([]);
    setAdAccountId("");
    fetch(`/api/clients/${encodeURIComponent(clientId)}/ad-accounts`)
      .then((r) => r.json())
      .then((j: { ok?: boolean; linked?: Array<{ metaAdAccountId: string; label: string }> }) => {
        const linked = j.linked ?? [];
        setAdAccounts(linked);
        if (linked.length > 0) setAdAccountId(linked[0]!.metaAdAccountId);
        else setError("Esse cliente não tem conta de anúncios vinculada.");
      })
      .catch(() => setError("Não foi possível carregar as contas do cliente."))
      .finally(() => setLoadingAccounts(false));
  }, [open, clientId]);

  useEffect(() => {
    if (!adAccountId) return;
    setLoadingImages(true);
    setError(null);
    fetch(`/api/creative-studio/account-images?clientId=${encodeURIComponent(clientId)}&adAccountId=${encodeURIComponent(adAccountId)}`)
      .then((r) => r.json())
      .then((j: { ok?: boolean; images?: AccountImage[]; error?: string }) => {
        if (!j.ok) {
          setError(j.error || "Não foi possível carregar os criativos dessa conta.");
          return;
        }
        setImages(j.images ?? []);
      })
      .catch(() => setError("Não foi possível carregar os criativos dessa conta."))
      .finally(() => setLoadingImages(false));
  }, [adAccountId, clientId]);

  const pick = async (img: AccountImage) => {
    setPickingHash(img.hash);
    setError(null);
    try {
      const res = await fetch(
        `/api/creative-studio/account-images/fetch?clientId=${encodeURIComponent(clientId)}&adAccountId=${encodeURIComponent(adAccountId)}&hash=${encodeURIComponent(img.hash)}`
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error();
      onPick({ base64: json.base64, mimeType: json.mimeType, label: img.label });
    } catch {
      setError("Não foi possível baixar essa imagem agora.");
    } finally {
      setPickingHash(null);
    }
  };

  return (
    <DsModal open={open} onClose={onClose} title="Criativos da conta" subtitle="Imagens já usadas em anúncios reais desse cliente" width="lg">
      <div className="space-y-3">
        {adAccounts.length > 1 ? (
          <select
            value={adAccountId}
            onChange={(e) => setAdAccountId(e.target.value)}
            className="ui-input h-8 w-full max-w-xs py-0 font-body text-xs"
          >
            {adAccounts.map((a) => (
              <option key={a.metaAdAccountId} value={a.metaAdAccountId}>
                {a.label}
              </option>
            ))}
          </select>
        ) : null}

        {error ? <p className="font-body text-xs text-red-500">{error}</p> : null}

        {loadingAccounts || loadingImages ? (
          <div className="flex items-center justify-center gap-2 py-16 font-body text-xs text-[var(--text-dim)]">
            <Loader2 size={14} className="animate-spin" />
            Carregando…
          </div>
        ) : images.length === 0 && !error ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <ImageOff size={22} className="text-[var(--text-dimmer)]" />
            <p className="font-body text-xs text-[var(--text-dimmer)]">Nenhuma imagem de anúncio encontrada nessa conta.</p>
          </div>
        ) : (
          <div className="grid max-h-[55vh] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
            {images.map((img) => (
              <button
                key={img.hash}
                type="button"
                onClick={() => pick(img)}
                disabled={pickingHash !== null}
                className="relative aspect-square overflow-hidden rounded-lg border-2 border-transparent transition hover:border-[var(--ui-accent)] disabled:opacity-60"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.label} className="h-full w-full object-cover" />
                {pickingHash === img.hash ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Loader2 size={18} className="animate-spin text-white" />
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </div>
    </DsModal>
  );
}
