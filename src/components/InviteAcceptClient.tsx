"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Link } from "@/i18n/navigation";

export function InviteAcceptClient({
  isLoggedIn,
  locale
}: {
  isLoggedIn: boolean;
  locale: string;
}) {
  const t = useTranslations("invite");
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn || !token) return;
    setStatus("loading");
    fetch("/api/workspace/invites/accept", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token })
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setStatus("ok");
        } else {
          setStatus("error");
          setError(j.error ?? "unknown");
        }
      })
      .catch(() => {
        setStatus("error");
        setError("network");
      });
  }, [isLoggedIn, token]);

  if (!token) {
    return <p className="text-sm text-slate-600">{t("missingToken")}</p>;
  }

  if (!isLoggedIn) {
    const callbackUrl = `/${locale}/invite?token=${encodeURIComponent(token)}`;
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600">{t("loginRequired")}</p>
        <Link
          href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="ui-btn-primary inline-block text-center"
        >
          {t("loginCta")}
        </Link>
      </div>
    );
  }

  if (status === "loading" || status === "idle") {
    return <p className="text-sm text-slate-600">{t("accepting")}</p>;
  }

  if (status === "ok") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-emerald-700">{t("accepted")}</p>
        <Link href="/command-center" className="ui-btn-primary inline-block text-center">
          {t("goToApp")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-red-700">{t("failed", { error: error ?? "" })}</p>
      <Link href="/settings" className="text-sm font-medium text-violet-600 underline">
        {t("settingsLink")}
      </Link>
    </div>
  );
}
