"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Link } from "@/i18n/navigation";

type Item = { id: string; ok: boolean; label: string; href?: string };

export function ClientReadinessChecklist({ clientId }: { clientId: string }) {
  const t = useTranslations("client");
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/clients/${encodeURIComponent(clientId)}/ad-accounts`).then((r) => r.json()),
      fetch(`/api/clients/${encodeURIComponent(clientId)}/meta-settings`).then((r) => r.json()),
      fetch(`/api/sync/status?clientId=${encodeURIComponent(clientId)}`).then((r) => r.json())
    ]).then(([accounts, meta, sync]) => {
      const linked = (accounts.linkedMetaIds ?? []).length > 0;
      const bm = Boolean(accounts.clientMetaBusinessId);
      const page = Boolean(meta.client?.metaPageId);
      const url = Boolean(meta.client?.metaLinkUrl);
      const pixel = Boolean(meta.settings?.metaPixelId);
      const synced = (sync.accounts ?? []).some(
        (a: { status: string }) => a.status === "ok"
      );
      setItems([
        { id: "bm", ok: bm, label: t("readyBm") },
        { id: "accounts", ok: linked, label: t("readyAccounts") },
        { id: "page", ok: page, label: t("readyPage") },
        { id: "url", ok: url, label: t("readyUrl") },
        { id: "pixel", ok: pixel, label: t("readyPixel") },
        { id: "sync", ok: synced, label: t("readySync"), href: "/settings/meta-assets" }
      ]);
    });
  }, [clientId, t]);

  const done = items.filter((i) => i.ok).length;
  const allOk = items.length > 0 && done === items.length;

  return (
    <div
      className={`rounded-xl border p-3 text-xs ${
        allOk ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50/80"
      }`}
    >
      <div className="font-semibold text-slate-800">
        {t("readinessTitle")} ({done}/{items.length})
      </div>
      <ul className="mt-2 space-y-1">
        {items.map((i) => (
          <li key={i.id} className="flex items-center gap-2">
            <span className={i.ok ? "text-emerald-600" : "text-amber-700"}>{i.ok ? "✓" : "○"}</span>
            {i.href && !i.ok ? (
              <Link href={i.href} className="text-violet-700 underline">
                {i.label}
              </Link>
            ) : (
              <span className="text-slate-700">{i.label}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
