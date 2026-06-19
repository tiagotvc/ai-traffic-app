"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { useAgencyBrainClient } from "@/components/agency-brain/AgencyBrainClientContext";
import { LabsCreditsBar } from "@/components/labs/LabsCreditsBar";
import { ScientistPicker } from "@/components/labs/ScientistPicker";
import { FormField } from "@/components/ui/FormField";
import { CLIENT_NICHE_OPTIONS } from "@/lib/client-niches";
import { estimateCredits } from "@/lib/labs/types";

export type LabsExperimentFormState = {
  clientSlug: string;
  name: string;
  product: string;
  niche: string;
  market: string;
  objective: string;
  selectedScientists: string[];
};

type LabsCreateExperimentModalProps = {
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: (form: LabsExperimentFormState) => void;
};

function emptyForm(clientSlug: string, niche: string): LabsExperimentFormState {
  return {
    clientSlug,
    name: "",
    product: "",
    niche,
    market: "BR",
    objective: "",
    selectedScientists: []
  };
}

export function LabsCreateExperimentModal({
  open,
  saving,
  onClose,
  onSubmit
}: LabsCreateExperimentModalProps) {
  const t = useTranslations("agencyBrain");
  const tClient = useTranslations("client");
  const { clientSlug: contextClient, clients, onClientChange } = useAgencyBrainClient();
  const [form, setForm] = useState(() => emptyForm(contextClient, ""));

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm(contextClient, ""));
  }, [open, contextClient]);

  useEffect(() => {
    if (!open || !form.clientSlug || form.niche) return;
    void fetch(`/api/clients/${encodeURIComponent(form.clientSlug)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.ok && json.client?.niche) {
          setForm((f) => ({ ...f, niche: json.client.niche }));
        }
      })
      .catch(() => undefined);
  }, [open, form.clientSlug, form.niche]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const estimated = estimateCredits(form.selectedScientists);
  const canSubmit =
    form.clientSlug.length > 0 &&
    form.name.trim().length > 0 &&
    form.product.trim().length > 0 &&
    form.selectedScientists.length > 0 &&
    !saving;

  function toggleScientist(id: string) {
    setForm((f) => {
      const has = f.selectedScientists.includes(id);
      return {
        ...f,
        selectedScientists: has
          ? f.selectedScientists.filter((s) => s !== id)
          : [...f.selectedScientists, id]
      };
    });
  }

  function handleClientChange(slug: string) {
    onClientChange(slug);
    setForm((f) => ({ ...f, clientSlug: slug, niche: "" }));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="labs-create-title"
      >
        <div className="shrink-0 border-b border-violet-100 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="labs-create-title" className="text-lg font-semibold">
                {t("labsModalTitle")}
              </h2>
              <p className="mt-0.5 text-sm text-white/80">{t("labsModalHint")}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label={t("labsModalClose")}
            >
              ✕
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          <FormField label={t("clientPickerLabel")} hint={t("labsClientHint")}>
            <select
              className="ui-select max-w-md text-sm"
              value={form.clientSlug}
              onChange={(e) => handleClientChange(e.target.value)}
            >
              <option value="">{t("clientPickerPlaceholder")}</option>
              {clients.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t("labsFieldName")}>
              <input
                className="ui-input"
                placeholder={t("labsFieldNamePlaceholder")}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                autoFocus
              />
            </FormField>
            <FormField label={t("labsFieldProduct")}>
              <input
                className="ui-input"
                placeholder={t("labsFieldProductPlaceholder")}
                value={form.product}
                onChange={(e) => setForm((f) => ({ ...f, product: e.target.value }))}
              />
            </FormField>
          </div>

          <FormField label={t("labsFieldNiche")} hint={t("labsNicheHint")}>
            <select
              className="ui-select max-w-md"
              value={form.niche}
              onChange={(e) => setForm((f) => ({ ...f, niche: e.target.value }))}
              disabled={!form.clientSlug}
            >
              {CLIENT_NICHE_OPTIONS.map((opt) => (
                <option key={opt.value || "unset"} value={opt.value}>
                  {tClient(opt.labelKey)}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label={t("labsFieldObjective")}>
            <textarea
              className="ui-textarea min-h-[72px]"
              placeholder={t("labsFieldObjectivePlaceholder")}
              value={form.objective}
              onChange={(e) => setForm((f) => ({ ...f, objective: e.target.value }))}
            />
          </FormField>

          <div>
            <p className="text-sm font-medium text-slate-800">{t("labsSquadTitle")}</p>
            <p className="mt-0.5 text-xs text-slate-500">{t("labsSquadHint")}</p>
            <div className="mt-3">
              <ScientistPicker selected={form.selectedScientists} onToggle={toggleScientist} />
            </div>
          </div>

          <LabsCreditsBar
            selectedScientists={form.selectedScientists}
            estimatedCredits={estimated}
          />
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/80 px-5 py-4">
          <p className="text-xs text-slate-500">{t("labsRunDurationHint")}</p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="ui-btn-secondary text-sm">
              {t("labsModalCancel")}
            </button>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => onSubmit(form)}
              className="ui-btn-primary text-sm"
            >
              {saving ? t("labsStarting") : t("labsStartResearch")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
