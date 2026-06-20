import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { auth } from "@/auth";
import { InviteAcceptClient } from "@/components/InviteAcceptClient";

export default async function InvitePage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("invite");
  const session = await auth();

  return (
    <div className="mx-auto max-w-lg space-y-4 py-8">
      <h1 className="font-heading text-2xl font-bold text-[var(--text-main)]">{t("title")}</h1>
      <p className="text-sm text-[var(--text-dim)]">{t("subtitle")}</p>
      <div className="ui-card p-5">
        <Suspense fallback={<p className="text-sm text-[var(--text-dim)]">{t("accepting")}</p>}>
          <InviteAcceptClient isLoggedIn={!!session?.user} locale={locale} />
        </Suspense>
      </div>
    </div>
  );
}
