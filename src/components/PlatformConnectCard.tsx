"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

/** Card exibido quando a plataforma selecionada não está conectada para o cliente. */
export function PlatformConnectCard({
  platform,
  clientId
}: {
  platform: "meta" | "google";
  clientId: string;
}) {
  const t = useTranslations("clientOverview");
  const title = platform === "meta" ? t("connectMetaTitle") : t("connectGoogleTitle");
  const body = platform === "meta" ? t("connectMetaBody") : t("connectGoogleBody");
  return (
    <div className="ui-card flex flex-col items-start gap-2 p-6">
      <div className="text-sm font-semibold text-[var(--text-main)]">{title}</div>
      <p className="max-w-prose text-xs text-[var(--text-dim)]">{body}</p>
      <Link href={`/clients/${clientId}/settings`} className="ui-link mt-1 text-xs font-semibold">
        {t("connectCta")}
      </Link>
    </div>
  );
}
