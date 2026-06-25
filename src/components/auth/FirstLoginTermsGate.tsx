"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";

import { LegalModal, type LegalModalType } from "@/components/auth/LegalModal";

/**
 * No primeiro login (ou quando os termos mudam de versão), exibe um modal de aceite
 * e persiste o registro via /api/auth/accept-terms. É um gate: não fecha sem aceitar.
 */
export function FirstLoginTermsGate() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [needsAccept, setNeedsAccept] = useState(false);
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [legal, setLegal] = useState<LegalModalType | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/accept-terms")
      .then((r) => r.json())
      .then((j) => {
        if (active && j?.ok && j.accepted === false) setNeedsAccept(true);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (!needsAccept) return null;

  async function accept() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/accept-terms", { method: "POST" });
      if (res.ok) setNeedsAccept(false);
    } finally {
      setSubmitting(false);
    }
  }

  const openLegal = (type: LegalModalType) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLegal(type);
  };

  const termsLink = (chunks: ReactNode) => (
    <button type="button" onClick={openLegal("terms")} className="font-semibold text-[var(--violet-bright)] hover:underline">
      {chunks}
    </button>
  );
  const privacyLink = (chunks: ReactNode) => (
    <button type="button" onClick={openLegal("privacy")} className="font-semibold text-[var(--violet-bright)] hover:underline">
      {chunks}
    </button>
  );

  return (
    <>
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4">
        <div className="w-full max-w-md rounded-2xl border border-[var(--border-color)] bg-[var(--surface-card)] p-6 shadow-2xl">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: "rgba(124,58,237,0.12)" }}>
            <ShieldCheck size={20} style={{ color: "#7c3aed" }} />
          </div>
          <h2 className="mt-3 font-heading text-lg font-bold text-[var(--text-main)]">{t("termsGateTitle")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-dim)]">{t("termsGateBody")}</p>

          <label className="mt-4 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-[var(--border-color)] accent-[var(--violet)]"
            />
            <span className="text-xs leading-relaxed text-[var(--text-dim)]">
              {t.rich("termsAccept", { terms: termsLink, privacy: privacyLink })}
            </span>
          </label>

          <button
            type="button"
            disabled={!checked || submitting}
            onClick={accept}
            className="ui-btn-primary mt-5 w-full text-sm disabled:opacity-60"
          >
            {submitting ? t("termsGateConfirming") : t("termsGateConfirm")}
          </button>
        </div>
      </div>
      {legal ? <LegalModal type={legal} locale={locale} onClose={() => setLegal(null)} /> : null}
    </>
  );
}
