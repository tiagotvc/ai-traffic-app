"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState, useTransition } from "react";

import { Link } from "@/i18n/navigation";

type BusinessRow = {
  metaBusinessId: string;
  name: string;
  adAccountCount: number;
  pageCount: number;
};

type AssetAccount = {
  metaAdAccountId: string;
  label: string;
  metaBusinessId?: string | null;
};

type AssetPage = {
  metaPageId: string;
  name: string;
};

type AssetPixel = {
  id: string;
  name: string;
};

type Step = "name" | "bm" | "account" | "page" | "pixel";

export function CreateClientWizard({ onCreated }: { onCreated: () => void }) {
  const t = useTranslations("clientsHub.createWizard");
  const tHub = useTranslations("clientsHub");
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [selectedBm, setSelectedBm] = useState("");
  const [accounts, setAccounts] = useState<AssetAccount[]>([]);
  const [pages, setPages] = useState<AssetPage[]>([]);
  const [pixels, setPixels] = useState<AssetPixel[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedPageId, setSelectedPageId] = useState("");
  const [selectedPixelId, setSelectedPixelId] = useState("");
  const [metaLinkUrl, setMetaLinkUrl] = useState("");
  const [inventoryEmpty, setInventoryEmpty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setStep("name");
    setName("");
    setSelectedBm("");
    setSelectedAccountId("");
    setSelectedPageId("");
    setSelectedPixelId("");
    setMetaLinkUrl("");
    setError(null);
    setAccounts([]);
    setPages([]);
    setPixels([]);
  };

  const loadBusinesses = useCallback(() => {
    fetch("/api/meta/businesses")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          const rows = j.businesses ?? [];
          setBusinesses(rows);
          setInventoryEmpty(
            rows.length === 0 && (j.totals?.adAccounts ?? 0) === 0
          );
        }
      });
  }, []);

  const loadBmAssets = useCallback((businessId: string) => {
    const q = businessId ? `?businessId=${encodeURIComponent(businessId)}` : "";
    fetch(`/api/meta/assets${q}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setAccounts(j.adAccounts ?? []);
          setPages(j.pages ?? []);
        }
      });
  }, []);

  const loadPixels = useCallback((adAccountId: string) => {
    if (!adAccountId) {
      setPixels([]);
      return;
    }
    fetch(`/api/meta/assets?adAccountId=${encodeURIComponent(adAccountId)}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setPixels(j.pixels ?? []);
      });
  }, []);

  useEffect(() => {
    if (open) loadBusinesses();
  }, [open, loadBusinesses]);

  useEffect(() => {
    if (open && step !== "name") loadBmAssets(selectedBm);
  }, [open, step, selectedBm, loadBmAssets]);

  useEffect(() => {
    if (selectedAccountId) loadPixels(selectedAccountId);
  }, [selectedAccountId, loadPixels]);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          metaBusinessId: selectedBm || undefined,
          metaAdAccountIds: selectedAccountId ? [selectedAccountId] : [],
          metaPageId: selectedPageId || undefined,
          metaPixelId: selectedPixelId || undefined,
          metaLinkUrl: metaLinkUrl.trim() || undefined
        })
      });
      const j = await res.json();
      if (!res.ok || !j.ok) {
        setError(j.error ?? tHub("createFailed"));
        return;
      }
      setOpen(false);
      reset();
      onCreated();
    });
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="ui-btn-primary">
        {t("openButton")}
      </button>
    );
  }

  return (
    <div className="ui-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-slate-900">{t("title")}</div>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            reset();
          }}
          className="text-xs text-slate-500 hover:text-slate-800"
        >
          {t("cancel")}
        </button>
      </div>

      {inventoryEmpty ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {t("emptyInventory")}{" "}
          <Link href="/settings/meta-assets" className="font-medium text-violet-700 underline">
            {t("goMetaAssets")}
          </Link>
        </div>
      ) : null}

      {step === "name" ? (
        <div className="mt-4 space-y-3">
          <label className="block text-xs text-slate-600">{t("clientName")}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="ui-input w-full"
            placeholder={tHub("newClientPlaceholder")}
          />
          <button
            type="button"
            disabled={!name.trim()}
            onClick={() => setStep("bm")}
            className="ui-btn-primary w-full disabled:opacity-60"
          >
            {t("next")}
          </button>
        </div>
      ) : null}

      {step === "bm" ? (
        <div className="mt-4 space-y-3">
          <div className="text-xs text-slate-600">{t("pickBm")}</div>
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {businesses.map((bm) => (
              <button
                key={bm.metaBusinessId}
                type="button"
                onClick={() => {
                  setSelectedBm(bm.metaBusinessId);
                  setSelectedAccountId("");
                  setSelectedPageId("");
                  setStep("account");
                }}
                className={`w-full rounded-xl border px-3 py-2 text-left text-xs ${
                  selectedBm === bm.metaBusinessId
                    ? "border-violet-400 bg-violet-50"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="font-medium text-slate-900">{bm.name}</div>
                <div className="text-slate-500">
                  {t("bmCounts", { accounts: bm.adAccountCount, pages: bm.pageCount })}
                </div>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setStep("name")} className="ui-btn-secondary w-full">
            {t("back")}
          </button>
        </div>
      ) : null}

      {step === "account" ? (
        <div className="mt-4 space-y-3">
          <div className="text-xs text-slate-600">{t("pickAccount")}</div>
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {accounts.length ? (
              accounts.map((a) => (
                <button
                  key={a.metaAdAccountId}
                  type="button"
                  onClick={() => {
                    setSelectedAccountId(a.metaAdAccountId);
                    setStep("page");
                  }}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-xs ${
                    selectedAccountId === a.metaAdAccountId
                      ? "border-violet-400 bg-violet-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {a.label}
                </button>
              ))
            ) : (
              <p className="text-xs text-slate-500">{t("noAccounts")}</p>
            )}
          </div>
          <button type="button" onClick={() => setStep("bm")} className="ui-btn-secondary w-full">
            {t("back")}
          </button>
        </div>
      ) : null}

      {step === "page" ? (
        <div className="mt-4 space-y-3">
          <div className="text-xs text-slate-600">{t("pickPage")}</div>
          <select
            value={selectedPageId}
            onChange={(e) => setSelectedPageId(e.target.value)}
            className="ui-input w-full text-sm"
          >
            <option value="">{t("skipPage")}</option>
            {pages.map((p) => (
              <option key={p.metaPageId} value={p.metaPageId}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setStep("pixel")}
            className="ui-btn-primary w-full"
          >
            {t("next")}
          </button>
          <button type="button" onClick={() => setStep("account")} className="ui-btn-secondary w-full">
            {t("back")}
          </button>
        </div>
      ) : null}

      {step === "pixel" ? (
        <div className="mt-4 space-y-3">
          <div className="text-xs text-slate-600">{t("pickPixel")}</div>
          <select
            value={selectedPixelId}
            onChange={(e) => setSelectedPixelId(e.target.value)}
            className="ui-input w-full text-sm"
          >
            <option value="">{t("skipPixel")}</option>
            {pixels.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <div>
            <label className="text-xs text-slate-600">{t("linkUrl")}</label>
            <input
              value={metaLinkUrl}
              onChange={(e) => setMetaLinkUrl(e.target.value)}
              placeholder="https://"
              className="ui-input mt-1 w-full"
            />
          </div>
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          ) : null}
          <button
            type="button"
            disabled={isPending || !selectedAccountId}
            onClick={submit}
            className="ui-btn-primary w-full disabled:opacity-60"
          >
            {isPending ? t("creating") : t("create")}
          </button>
          <button type="button" onClick={() => setStep("page")} className="ui-btn-secondary w-full">
            {t("back")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
