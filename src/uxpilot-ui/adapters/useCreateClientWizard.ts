"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { formatBRL } from "@/lib/format";

export type BusinessRow = {
  metaBusinessId: string;
  name: string;
  adAccountCount: number;
  pageCount: number;
};

export type AccountOption = {
  metaAdAccountId: string;
  label: string;
  metaBusinessId: string | null;
  metaBusinessName: string | null;
  spendLast30d: number | null;
};

export type WizardPageOption = { metaPageId: string; name: string };
export type WizardPixelOption = { id: string; name: string };

export type GoogleAccountOption = { id: string; descriptiveName: string | null; manager: boolean };

export type PlatformKey = "meta" | "google";
/** Passos possíveis; o conjunto ativo depende das plataformas escolhidas. */
export type StepKey = "name" | "platforms" | "bm" | "accounts" | "pagePixels" | "google";

export function useCreateClientWizard(locale: string, opts?: { metaConnected?: boolean }) {
  const [name, setName] = useState("");
  const [platforms, setPlatforms] = useState<Set<PlatformKey>>(
    opts?.metaConnected ? new Set<PlatformKey>(["meta"]) : new Set<PlatformKey>()
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [selectedBm, setSelectedBm] = useState("");
  const [inventoryEmpty, setInventoryEmpty] = useState(false);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bmSearch, setBmSearch] = useState("");
  const [accountSearch, setAccountSearch] = useState("");
  const [wizardPages, setWizardPages] = useState<WizardPageOption[]>([]);
  const [wizardPixels, setWizardPixels] = useState<WizardPixelOption[]>([]);
  const [loadingWizardAssets, setLoadingWizardAssets] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [selectedPixelIds, setSelectedPixelIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [metaAdsConnected, setMetaAdsConnected] = useState<boolean | null>(null);
  const [isPending, startTransition] = useTransition();
  // Google Ads
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [googleAccounts, setGoogleAccounts] = useState<GoogleAccountOption[]>([]);
  const [selectedGoogleCustomerId, setSelectedGoogleCustomerId] = useState("");

  const loadBusinesses = useCallback(() => {
    fetch("/api/meta/businesses")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          const rows = (j.businesses ?? []) as BusinessRow[];
          setBusinesses(rows);
          setInventoryEmpty(rows.length === 0 && (j.totals?.adAccounts ?? 0) === 0);
        }
      })
      .catch(() => {});
  }, []);

  const loadAccounts = useCallback((bmId: string) => {
    setLoadingAccounts(true);
    setAccounts([]);
    const qs = bmId ? `?metaBusinessId=${encodeURIComponent(bmId)}` : "";
    fetch(`/api/meta/account-options${qs}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setAccounts(j.accounts ?? []);
      })
      .catch(() => {})
      .finally(() => setLoadingAccounts(false));
  }, []);

  const loadWizardAssets = useCallback(
    (bmId: string, accountIds: string[], bmName: string | null) => {
      if (!bmId || accountIds.length === 0) return;
      setLoadingWizardAssets(true);
      setWizardPages([]);
      setWizardPixels([]);
      const qs = new URLSearchParams({
        metaBusinessId: bmId,
        metaAdAccountIds: accountIds.join(",")
      });
      if (bmName) qs.set("metaBusinessName", bmName);
      fetch(`/api/meta/wizard-assets?${qs.toString()}`)
        .then((r) => r.json())
        .then((j) => {
          if (j.ok) {
            setWizardPages(j.pages ?? []);
            setWizardPixels(j.pixels ?? []);
            if (j.pages?.length === 1) {
              setSelectedPageId(j.pages[0].metaPageId);
            }
          }
        })
        .catch(() => {})
        .finally(() => setLoadingWizardAssets(false));
    },
    []
  );

  // Passos ativos (ordem) a partir das plataformas escolhidas.
  const steps = useMemo<StepKey[]>(() => {
    const s: StepKey[] = ["name", "platforms"];
    if (platforms.has("meta")) s.push("bm", "accounts", "pagePixels");
    if (platforms.has("google")) s.push("google");
    return s;
  }, [platforms]);

  const stepIndexClamped = Math.min(stepIndex, steps.length - 1);
  const stepKey: StepKey = steps[stepIndexClamped] ?? "name";

  useEffect(() => {
    loadBusinesses();
    fetch("/api/settings/meta")
      .then((r) => r.json())
      .then((j) => setMetaAdsConnected(!!j.connected))
      .catch(() => setMetaAdsConnected(false));
    fetch("/api/google-ads/accounts")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.ok) {
          setGoogleEnabled(true);
          setGoogleAccounts(j.accounts ?? []);
        }
      })
      .catch(() => {});
    // Volta do OAuth Meta no meio do cadastro: pula direto para o passo da BM.
    if (opts?.metaConnected) {
      setStepIndex(2);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadBusinesses]);

  useEffect(() => {
    if (stepKey === "pagePixels" && selectedBm && selected.size > 0) {
      const bmName = businesses.find((b) => b.metaBusinessId === selectedBm)?.name ?? null;
      loadWizardAssets(selectedBm, [...selected], bmName);
    }
  }, [stepKey, selectedBm, selected, businesses, loadWizardAssets]);

  const filteredBusinesses = useMemo(() => {
    const q = bmSearch.trim().toLowerCase();
    if (!q) return businesses;
    return businesses.filter((b) => b.name.toLowerCase().includes(q));
  }, [businesses, bmSearch]);

  const filteredAccounts = useMemo(() => {
    const q = accountSearch.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (a) => a.label.toLowerCase().includes(q) || a.metaAdAccountId.toLowerCase().includes(q)
    );
  }, [accounts, accountSearch]);

  // Conclusão por passo.
  const stepDone: Record<StepKey, boolean> = {
    name: name.trim().length > 0,
    platforms: platforms.size > 0,
    bm: !!selectedBm,
    accounts: selected.size > 0,
    pagePixels: !!selectedPageId.trim(),
    google: !!selectedGoogleCustomerId
  };

  // Criar exige: cada plataforma escolhida com sua config mínima.
  const metaOk = !platforms.has("meta") || (!!selectedBm && selected.size > 0 && !!selectedPageId.trim());
  const googleOk = !platforms.has("google") || !!selectedGoogleCustomerId;
  const canCreate = platforms.size > 0 && metaOk && googleOk;

  const doneCount = steps.filter((k) => stepDone[k]).length;
  const score = Math.round((doneCount / steps.length) * 100);
  const isLast = stepIndexClamped === steps.length - 1;
  const canContinueCurrent = stepDone[stepKey];

  const selectedBmName = businesses.find((b) => b.metaBusinessId === selectedBm)?.name ?? null;

  function togglePlatform(p: PlatformKey) {
    setPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  function toggleAccount(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePixel(id: string) {
    setSelectedPixelIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** Pula para um índice de passo, se todos os passos anteriores estiverem completos. */
  function goToIndex(i: number) {
    if (i < 0 || i >= steps.length) return;
    if (i <= stepIndexClamped) {
      setStepIndex(i);
      return;
    }
    for (let k = 0; k < i; k += 1) {
      if (!stepDone[steps[k]]) return;
    }
    setStepIndex(i);
  }

  function selectBusiness(bmId: string) {
    setSelectedBm(bmId);
    setSelected(new Set());
    setSelectedPageId("");
    setSelectedPixelIds(new Set());
    setAccountSearch("");
    loadAccounts(bmId);
  }

  function create(onCreated: (slug: string) => void, onError: (msg: string) => void) {
    setError(null);
    const bmName = businesses.find((b) => b.metaBusinessId === selectedBm)?.name;
    const wantMeta = platforms.has("meta");
    const wantGoogle = platforms.has("google");
    const linkedMetaPixelIds = [...selectedPixelIds];
    startTransition(async () => {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          metaBusinessId: wantMeta ? selectedBm || undefined : undefined,
          metaBusinessName: wantMeta ? bmName || undefined : undefined,
          metaAdAccountIds: wantMeta && selected.size > 0 ? [...selected] : undefined,
          metaPageId: wantMeta ? selectedPageId.trim() || undefined : undefined,
          linkedMetaPixelIds: wantMeta && linkedMetaPixelIds.length ? linkedMetaPixelIds : undefined,
          metaPixelId: wantMeta ? linkedMetaPixelIds[0] ?? undefined : undefined,
          googleAdsCustomerId: wantGoogle ? selectedGoogleCustomerId || undefined : undefined
        })
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) {
        const msg = String(j?.error ?? "createFailed");
        setError(msg);
        onError(msg);
        return;
      }
      const slug = String(j.client?.slug ?? "");
      onCreated(slug);
    });
  }

  function formatSpend(value: number | null) {
    return value != null ? formatBRL(value, locale) : "—";
  }

  return {
    // passos
    steps,
    stepKey,
    stepIndex: stepIndexClamped,
    stepCount: steps.length,
    setStepIndex,
    goToIndex,
    isLast,
    stepDone,
    canContinueCurrent,
    canCreate,
    score,
    // plataformas
    platforms,
    togglePlatform,
    googleEnabled,
    googleAccounts,
    selectedGoogleCustomerId,
    setSelectedGoogleCustomerId,
    // nome
    name,
    setName,
    // meta
    businesses,
    filteredBusinesses,
    selectedBm,
    setSelectedBm,
    selectedBmName,
    inventoryEmpty,
    accounts,
    filteredAccounts,
    loadingAccounts,
    selected,
    toggleAccount,
    bmSearch,
    setBmSearch,
    accountSearch,
    setAccountSearch,
    wizardPages,
    wizardPixels,
    loadingWizardAssets,
    selectedPageId,
    setSelectedPageId,
    selectedPixelIds,
    togglePixel,
    error,
    metaAdsConnected,
    isPending,
    selectBusiness,
    create,
    formatSpend,
    reloadBusinesses: loadBusinesses
  };
}
