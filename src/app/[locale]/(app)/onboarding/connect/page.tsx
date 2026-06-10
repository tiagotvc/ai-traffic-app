import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { auth, signIn } from "@/auth";
import { Link } from "@/i18n/navigation";
import { StripOAuthHash } from "@/components/StripOAuthHash";
import { isMetaOAuthConfigured } from "@/lib/meta-env";

type ComingSoonPlatform = { key: "google" | "tiktok" | "snapchat"; mark: string; ring: string };

const COMING_SOON: ComingSoonPlatform[] = [
  { key: "google", mark: "G", ring: "ring-rose-200 text-rose-500" },
  { key: "tiktok", mark: "♪", ring: "ring-slate-300 text-slate-800" },
  { key: "snapchat", mark: "👻", ring: "ring-amber-200 text-amber-500" }
];

export default async function ConnectPlatformPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("connectPlatform");
  const metaConfigured = isMetaOAuthConfigured();
  const target = `/${locale}/onboarding/meta`;

  async function connectMeta() {
    "use server";
    if (!isMetaOAuthConfigured()) {
      redirect(`/${locale}/onboarding/connect?metaError=missing_app_config`);
    }
    const session = await auth();
    if (!session?.user?.email) {
      redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(target)}`);
    }
    await signIn("facebook", { redirectTo: target });
  }

  return (
    <div>
      <StripOAuthHash />
      <div className="grid min-h-[70vh] grid-cols-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-2">
        {/* Brand / selling points */}
        <div className="relative hidden flex-col justify-center gap-8 bg-gradient-to-br from-violet-50 via-slate-50 to-white p-12 lg:flex">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-lg font-bold text-white">
              ∞
            </span>
            <span className="text-lg font-semibold text-slate-900">Traffic AI</span>
          </div>

          <div className="ui-card max-w-sm p-6">
            <div className="text-base font-semibold text-slate-900">{t("sellingTitle")}</div>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              {(["selling1", "selling2", "selling3"] as const).map((k) => (
                <li key={k} className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-violet-100 text-violet-600">
                    ✓
                  </span>
                  {t(k)}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Connect column */}
        <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
          <div className="mx-auto w-full max-w-md">
            <p className="text-xs font-medium text-slate-500">{t("breadcrumb")}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{t("title")}</h1>
            <p className="mt-2 text-sm text-slate-500">{t("subtitle")}</p>

            {/* Meta Ads — ativo */}
            <div className="mt-8">
              <div className="text-sm font-semibold text-slate-700">{t("metaAds")}</div>
              {metaConfigured ? (
                <form action={connectMeta} className="mt-2">
                  <button
                    type="submit"
                    className="flex w-full items-center justify-between gap-3 rounded-2xl bg-[#1877f2] px-4 py-3.5 text-left text-white shadow-sm transition hover:bg-[#1469d6]"
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-lg font-bold">
                        ∞
                      </span>
                      <span>
                        <span className="block text-sm font-semibold">{t("metaConnect")}</span>
                        <span className="block text-xs text-white/80">{t("metaHint")}</span>
                      </span>
                    </span>
                    <span aria-hidden>→</span>
                  </button>
                </form>
              ) : (
                <p className="mt-2 ui-alert-warning">{t("metaUnavailable")}</p>
              )}
            </div>

            {/* Outras plataformas — em breve */}
            <div className="mt-6">
              <div className="text-sm font-semibold text-slate-700">{t("otherPlatforms")}</div>
              <div className="mt-2 space-y-2">
                {COMING_SOON.map((p) => (
                  <div
                    key={p.key}
                    className="flex cursor-not-allowed items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 opacity-80"
                    aria-disabled
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm font-bold ring-1 ${p.ring}`}
                      >
                        {p.mark}
                      </span>
                      <span className="text-sm font-medium text-slate-700">{t(p.key)}</span>
                    </span>
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                      {t("comingSoon")}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 text-center">
              <Link
                href="/dashboard"
                className="text-sm font-semibold text-violet-600 hover:text-violet-500"
              >
                {t("connectLater")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
