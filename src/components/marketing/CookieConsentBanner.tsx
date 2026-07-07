"use client";

import { useEffect, useState } from "react";
import { Cookie } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { COOKIE_CONSENT_KEY, setCookieConsent, type CookieConsent } from "@/lib/cookie-consent";

/** Banner de consentimento de cookies (LGPD/GDPR). Persistido; aparece só uma vez. */
export function CookieConsentBanner() {
  const t = useTranslations("marketing");
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    let raf = 0;
    let timer = 0;
    try {
      if (!window.localStorage.getItem(COOKIE_CONSENT_KEY)) {
        timer = window.setTimeout(() => {
          setVisible(true);
          raf = window.requestAnimationFrame(() => setEntered(true));
        }, 500);
      }
    } catch {
      /* sem localStorage */
    }
    return () => {
      window.clearTimeout(timer);
      window.cancelAnimationFrame(raf);
    };
  }, []);

  function choose(value: CookieConsent) {
    setCookieConsent(value); // persiste + dispara COOKIE_CONSENT_EVENT
    setEntered(false);
    window.setTimeout(() => setVisible(false), 250);
  }

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center p-3 sm:p-5 print:hidden">
      <div
        className={`pointer-events-auto w-full max-w-2xl overflow-hidden rounded-2xl border shadow-xl shadow-black/25 transition-all duration-300 ease-out ${
          entered ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
        }`}
        style={{ borderColor: "var(--border-color)", background: "var(--surface-card)" }}
        role="dialog"
        aria-live="polite"
        aria-label={t("cookieTitle")}
      >
        <div className="h-1 w-full bg-[var(--ui-accent)]" />
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ background: "var(--ui-accent)" }}
            aria-hidden
          >
            <Cookie size={22} strokeWidth={2} />
          </span>

          <div className="min-w-0 flex-1">
            <p className="font-heading text-sm font-semibold text-[var(--text-main)]">
              {t("cookieTitle")}
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-dim)]">
              {t("cookieText")}{" "}
              <Link
                href="/privacy"
                className="font-medium text-[var(--ui-accent)] underline underline-offset-2 hover:opacity-80"
              >
                {t("cookieLearnMore")}
              </Link>
            </p>
          </div>

          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => choose("rejected")}
              className="ui-btn-secondary inline-flex h-9 items-center justify-center px-4 text-sm font-heading font-medium"
            >
              {t("cookieReject")}
            </button>
            <button
              type="button"
              onClick={() => choose("accepted")}
              className="ui-btn-accent inline-flex h-9 items-center justify-center px-4 text-sm font-heading font-semibold"
            >
              {t("cookieAccept")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
