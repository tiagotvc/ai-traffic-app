import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { auth, signIn } from "@/auth";
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
  const target = redirectTo ?? `/${locale}/onboarding/meta?from=settings`;

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

  const btnClass =
    variant === "secondary"
      ? "rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
      : "rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500";

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
        await signIn("facebook", { redirectTo: target });
      }}
    >
      <button type="submit" className={btnClass}>
        {t("reconnectMeta")}
      </button>
    </form>
  );
}
