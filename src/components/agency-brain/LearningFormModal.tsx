"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { DsButton, DsModal } from "@/design-system";
import type { LearningCategory, LearningDto, LearningImpact } from "@/lib/agency-brain/types";

const CATEGORIES: LearningCategory[] = [
  "CREATIVE",
  "AUDIENCE",
  "OFFER",
  "COPY",
  "BUDGET",
  "LANDING_PAGE",
  "SEASONALITY",
  "GENERAL"
];

const IMPACTS: LearningImpact[] = ["LOW", "MEDIUM", "HIGH"];

type FormState = {
  title: string;
  description: string;
  category: LearningCategory;
  impact: LearningImpact;
  confidence: LearningImpact;
  tags: string;
  metaCampaignId: string;
};

const emptyForm = (): FormState => ({
  title: "",
  description: "",
  category: "GENERAL",
  impact: "MEDIUM",
  confidence: "MEDIUM",
  tags: "",
  metaCampaignId: ""
});

export function LearningFormModal({
  open,
  onClose,
  onSave,
  initial,
  campaigns = [],
  saving = false
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: FormState) => Promise<void>;
  initial?: LearningDto | null;
  campaigns?: Array<{ id: string; name: string }>;
  saving?: boolean;
}) {
  const t = useTranslations("agencyBrain");
  const [form, setForm] = useState<FormState>(emptyForm());

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        title: initial.title,
        description: initial.description,
        category: initial.category,
        impact: initial.impact,
        confidence: initial.confidence as LearningImpact,
        tags: (initial.tags ?? []).join(", "),
        metaCampaignId: initial.metaCampaignId ?? ""
      });
    } else {
      setForm(emptyForm());
    }
  }, [open, initial]);

  return (
    <DsModal
      open={open}
      onClose={onClose}
      title={initial ? t("editLearning") : t("newLearning")}
      width="lg"
      footer={
        <>
          <DsButton variant="secondary" size="sm" onClick={onClose} disabled={saving}>
            {t("cancel")}
          </DsButton>
          <DsButton
            variant="primary"
            size="sm"
            disabled={saving || !form.title.trim() || !form.description.trim()}
            onClick={() => onSave(form)}
          >
            {saving ? t("saving") : t("save")}
          </DsButton>
        </>
      }
    >
        <div className="space-y-3">
          <div>
            <label className="ui-label">{t("fieldTitle")}</label>
            <input
              className="ui-input mt-1"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="ui-label">{t("fieldDescription")}</label>
            <textarea
              className="ui-textarea mt-1 min-h-[100px]"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="ui-label">{t("fieldCategory")}</label>
              <select
                className="ui-select mt-1"
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value as LearningCategory })
                }
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t(`category.${c}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="ui-label">{t("fieldImpact")}</label>
              <select
                className="ui-select mt-1"
                value={form.impact}
                onChange={(e) => setForm({ ...form, impact: e.target.value as LearningImpact })}
              >
                {IMPACTS.map((i) => (
                  <option key={i} value={i}>
                    {t(`impact.${i}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="ui-label">{t("fieldConfidence")}</label>
            <select
              className="ui-select mt-1"
              value={form.confidence}
              onChange={(e) =>
                setForm({ ...form, confidence: e.target.value as LearningImpact })
              }
            >
              {IMPACTS.map((i) => (
                <option key={i} value={i}>
                  {t(`confidence.${i}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="ui-label">{t("fieldTags")}</label>
            <input
              className="ui-input mt-1"
              placeholder={t("tagsPlaceholder")}
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
            />
          </div>
          {campaigns.length > 0 ? (
            <div>
              <label className="ui-label">{t("fieldCampaign")}</label>
              <select
                className="ui-select mt-1"
                value={form.metaCampaignId}
                onChange={(e) => setForm({ ...form, metaCampaignId: e.target.value })}
              >
                <option value="">{t("noCampaign")}</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
    </DsModal>
  );
}
