import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { isMetaOAuthConfigured } from "@/lib/meta-env";

export async function ConnectMetaButton({
  locale,
  redirectTo,
  variant = "primary"
}: {
  locale: string;
  redirectTo?: string;
  variant?: "primary" | "secondary";
}) {
  const t = await getTranslations("settings");
  const configured = isMetaOAuthConfigured();
  const target = redirectTo ?? `/${locale}/settings?from=meta_reconnect`;

  if (!configured) {
    return (
      <button
        type="button"
        disabled
        title={t("metaSetupRequired")}
        className="ui-btn-secondary cursor-not-allowed opacity-60"
      >
        {t("reconnectMeta")}
      </button>
    );
  }

  const btnClass = variant === "secondary" ? "ui-btn-secondary text-xs" : "ui-btn-primary text-xs";

  return (
    <form
      action={async () => {
        "use server";
        if (!isMetaOAuthConfigured()) {
          redirect(`/${locale}/settings?metaError=missing_app_config`);
        }
        const session = await auth();
        if (!session?.user?.email) {
          redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(target)}`);
        }
        redirect(`/api/meta/oauth/start?redirectTo=${encodeURIComponent(target)}`);
      }}
    >
      <button type="submit" className={btnClass}>
        {t("reconnectMeta")}
      </button>
    </form>
  );
}
