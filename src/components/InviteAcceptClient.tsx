"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Link, useRouter } from "@/i18n/navigation";

const TOKEN_STORAGE_KEY = "traffic-invite-token";

function readStoredToken() {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function InviteAcceptClient({
  isLoggedIn,
  locale
}: {
  isLoggedIn: boolean;
  locale: string;
}) {
  const t = useTranslations("invite");
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlToken = searchParams.get("token") ?? "";

  const token = useMemo(() => urlToken || readStoredToken(), [urlToken]);

  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ workspaceName: string; email: string } | null>(null);

  useEffect(() => {
    if (!urlToken) return;
    try {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, urlToken);
    } catch {
      /* ignore */
    }
  }, [urlToken]);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/workspace/invites/preview?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok && j.preview) {
          setPreview({ workspaceName: j.preview.workspaceName, email: j.preview.email });
        }
      })
      .catch(() => {});
  }, [token]);

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
          try {
            sessionStorage.removeItem(TOKEN_STORAGE_KEY);
          } catch {
            /* ignore */
          }
          setStatus("ok");
          router.refresh();
        } else {
          setStatus("error");
          setError(j.error ?? "unknown");
        }
      })
      .catch(() => {
        setStatus("error");
        setError("network");
      });
  }, [isLoggedIn, token, router]);

  if (!token) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-[var(--text-dim)]">{t("missingToken")}</p>
        <p className="text-xs text-[var(--text-dim)]">{t("missingTokenHint")}</p>
      </div>
    );
  }

  if (preview) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[var(--text-dim)]">
          {t("preview", { workspace: preview.workspaceName, email: preview.email })}
        </p>
        {!isLoggedIn ? (
          <>
            <p className="text-sm text-[var(--text-dim)]">{t("loginRequired")}</p>
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(`/${locale}/invite?token=${encodeURIComponent(token)}`)}`}
              className="ui-btn-primary inline-block text-center"
            >
              {t("loginCta")}
            </Link>
          </>
        ) : status === "loading" || status === "idle" ? (
          <p className="text-sm text-[var(--text-dim)]">{t("accepting")}</p>
        ) : status === "ok" ? (
          <div className="space-y-3">
            <p className="text-sm text-emerald-700">{t("accepted")}</p>
            <Link href="/dashboard" className="ui-btn-primary inline-block text-center">
              {t("goToApp")}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-red-700">{t("failed", { error: error ?? "" })}</p>
            <Link href="/settings" className="text-sm font-medium ui-link">
              {t("settingsLink")}
            </Link>
          </div>
        )}
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[var(--text-dim)]">{t("loginRequired")}</p>
        <Link
          href={`/login?callbackUrl=${encodeURIComponent(`/${locale}/invite?token=${encodeURIComponent(token)}`)}`}
          className="ui-btn-primary inline-block text-center"
        >
          {t("loginCta")}
        </Link>
      </div>
    );
  }

  if (status === "loading" || status === "idle") {
    return <p className="text-sm text-[var(--text-dim)]">{t("accepting")}</p>;
  }

  if (status === "ok") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-emerald-700">{t("accepted")}</p>
        <Link href="/dashboard" className="ui-btn-primary inline-block text-center">
          {t("goToApp")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-red-700">{t("failed", { error: error ?? "" })}</p>
      <Link href="/settings" className="text-sm font-medium ui-link">
        {t("settingsLink")}
      </Link>
    </div>
  );
}
