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

export type CreateClientStep = 1 | 2 | 3 | 4;

export function useCreateClientWizard(locale: string, opts?: { metaConnected?: boolean }) {
  const [step, setStep] = useState<CreateClientStep>(opts?.metaConnected ? 2 : 1);
  const [name, setName] = useState("");
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

  useEffect(() => {
    loadBusinesses();
    fetch("/api/settings/meta")
      .then((r) => r.json())
      .then((j) => setMetaAdsConnected(!!j.connected))
      .catch(() => setMetaAdsConnected(false));
    if (opts?.metaConnected) {
      setStep(2);
    }
  }, [loadBusinesses, opts?.metaConnected]);

  useEffect(() => {
    if (step === 4 && selectedBm && selected.size > 0) {
      const bmName = businesses.find((b) => b.metaBusinessId === selectedBm)?.name ?? null;
      loadWizardAssets(selectedBm, [...selected], bmName);
    }
  }, [step, selectedBm, selected, businesses, loadWizardAssets]);

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

  const canContinueStep1 = name.trim().length > 0;
  const canContinueStep2 = !!selectedBm;
  const canContinueStep3 = selected.size > 0;
  const canCreate = !!selectedPageId.trim();
  const selectedBmName = businesses.find((b) => b.metaBusinessId === selectedBm)?.name ?? null;

  const score =
    (canContinueStep1 ? 25 : 0) +
    (canContinueStep2 ? 25 : 0) +
    (canContinueStep3 ? 25 : 0) +
    (canCreate ? 25 : 0);

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

  function goToStep(next: CreateClientStep) {
    setStep(next);
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
    startTransition(async () => {
      const linkedMetaPixelIds = [...selectedPixelIds];
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          metaBusinessId: selectedBm || undefined,
          metaBusinessName: bmName || undefined,
          metaAdAccountIds: [...selected],
          metaPageId: selectedPageId.trim(),
          linkedMetaPixelIds,
          metaPixelId: linkedMetaPixelIds[0] ?? undefined
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
    step,
    setStep: goToStep,
    name,
    setName,
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
    canContinueStep1,
    canContinueStep2,
    canContinueStep3,
    canCreate,
    score,
    selectBusiness,
    create,
    formatSpend,
    reloadBusinesses: loadBusinesses
  };
}
