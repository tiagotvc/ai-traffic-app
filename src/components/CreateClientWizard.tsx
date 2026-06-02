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

type Step = "name" | "bm";

export function CreateClientWizard({ onCreated }: { onCreated: () => void }) {
  const t = useTranslations("clientsHub.createWizard");
  const tHub = useTranslations("clientsHub");
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [selectedBm, setSelectedBm] = useState("");
  const [inventoryEmpty, setInventoryEmpty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setStep("name");
    setName("");
    setSelectedBm("");
    setError(null);
  };

  const loadBusinesses = useCallback(() => {
    fetch("/api/meta/businesses")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          const rows = j.businesses ?? [];
          setBusinesses(rows);
          setInventoryEmpty(rows.length === 0 && (j.totals?.adAccounts ?? 0) === 0);
        }
      });
  }, []);

  useEffect(() => {
    if (open) loadBusinesses();
  }, [open, loadBusinesses]);

  const submit = (bmId: string) => {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          metaBusinessId: bmId || undefined,
          linkAllBmAssets: true
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

  const selectedBmRow = businesses.find((b) => b.metaBusinessId === selectedBm) ?? null;

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
                onClick={() => setSelectedBm(bm.metaBusinessId)}
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

          {selectedBmRow ? (
            <p className="rounded-xl border border-violet-100 bg-violet-50 px-3 py-2 text-[11px] text-violet-800">
              {t("bmConfirm", {
                accounts: selectedBmRow.adAccountCount,
                pages: selectedBmRow.pageCount
              })}
            </p>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          ) : null}

          <button
            type="button"
            disabled={isPending || !selectedBm}
            onClick={() => submit(selectedBm)}
            className="ui-btn-primary w-full disabled:opacity-60"
          >
            {isPending ? t("creating") : t("create")}
          </button>
          <button type="button" onClick={() => setStep("name")} className="ui-btn-secondary w-full">
            {t("back")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
