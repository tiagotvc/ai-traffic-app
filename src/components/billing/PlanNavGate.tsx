import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { redirect } from "@/i18n/navigation";
import { getAppContext } from "@/lib/app-context";
import { isNavItemAllowed, type GatedNavId } from "@/lib/billing/nav-permissions";

export async function PlanNavGate({
  navId,
  locale,
  children
}: {
  navId: GatedNavId;
  locale: string;
  children: React.ReactNode;
}) {
  const { entitlements } = await getAppContext();
  if (isNavItemAllowed(navId, entitlements.limits)) {
    return children;
  }

  const t = await getTranslations("planGate");

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
          />
        </svg>
      </div>
      <h1 className="mt-4 text-xl font-bold text-slate-900">{t("title")}</h1>
      <p className="mt-2 text-sm text-slate-600">{t(`nav.${navId}`)}</p>
      <p className="mt-1 text-xs text-slate-500">
        {t("currentPlan", { plan: entitlements.planName })}
      </p>
      <Link href="/billing" className="ui-btn-primary mt-6 text-sm">
        {t("upgradeCta")}
      </Link>
    </div>
  );
}

export async function requireNavAccess(navId: GatedNavId, locale: string) {
  const { entitlements } = await getAppContext();
  if (!isNavItemAllowed(navId, entitlements.limits)) {
    redirect({ href: "/billing", locale });
  }
}
