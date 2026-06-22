import { getTranslations } from "next-intl/server";

import { redirect } from "next/navigation";



import { auth } from "@/auth";

import { ConnectMarketingPanel } from "@/components/connect/ConnectMarketingPanel";

import { MetaConnectButton } from "@/components/connect/MetaConnectButton";

import { TrafficAILogo } from "@/components/brand/TrafficAILogo";

import { Link } from "@/i18n/navigation";

import { StripOAuthHash } from "@/components/StripOAuthHash";

import { getAppBaseUrl } from "@/lib/app-url";

import { isGoogleOAuthConfigured } from "@/lib/google-env";

import { isMetaOAuthConfigured } from "@/lib/meta-env";



type ComingSoonPlatform = { key: "tiktok" | "snapchat"; mark: string; ring: string };



const COMING_SOON: ComingSoonPlatform[] = [

  { key: "tiktok", mark: "♪", ring: "ring-slate-300 text-[var(--text-main)]" },

  { key: "snapchat", mark: "👻", ring: "ring-amber-200 text-amber-500" }

];



export default async function ConnectPlatformPage({

  params

}: {

  params: Promise<{ locale: string }>;

}) {

  const { locale } = await params;

  const t = await getTranslations("connectPlatform");

  const tCommon = await getTranslations("common");

  const metaConfigured = isMetaOAuthConfigured();

  const googleConfigured = isGoogleOAuthConfigured();

  const metaTarget = `/${locale}/onboarding/meta/setup`;



  async function connectMeta() {

    "use server";

    if (!isMetaOAuthConfigured()) {

      redirect(`/${locale}/onboarding/connect?metaError=missing_app_config`);

    }

    const session = await auth();

    if (!session?.user?.email) {

      redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(metaTarget)}`);

    }

    redirect(`/api/meta/oauth/start?redirectTo=${encodeURIComponent(metaTarget)}`);

  }



  async function connectGoogleAds() {

    "use server";

    redirect(

      `${getAppBaseUrl()}/api/google/oauth/start?redirectTo=${encodeURIComponent(`/${locale}/onboarding/connect`)}`

    );

  }



  return (

    <div className="min-h-[calc(100vh-4rem)] lg:min-h-screen lg:-mx-6 lg:-my-6">

      <StripOAuthHash />

      <div className="grid min-h-[calc(100vh-4rem)] grid-cols-1 lg:min-h-screen lg:grid-cols-2">

        <div className="hidden lg:block lg:min-h-screen">

          <ConnectMarketingPanel productLabel={tCommon("product")} />

        </div>



        <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-white lg:min-h-screen">

          <div className="border-b border-[var(--border-color)] bg-gradient-to-r from-violet-950 to-indigo-950 px-6 py-6 text-white lg:hidden">

            <TrafficAILogo size="sm" productLabel={tCommon("product")} variant="dark" />

          </div>



          <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 sm:px-10">

            <div className="w-full max-w-[440px]">

              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--violet)]">

                {t("breadcrumb")}

              </p>

              <h1 className="mt-2 font-heading text-2xl font-bold tracking-tight text-[var(--text-main)] sm:text-3xl">

                {t("title")}

              </h1>

              <p className="mt-2 text-sm leading-relaxed text-[var(--text-dim)]">{t("subtitle")}</p>



              <div className="mt-8">

                <div className="mb-3 flex items-center gap-2">

                  <span className="text-sm font-semibold text-[var(--text-main)]">{t("metaAds")}</span>

                  <span className="rounded-full bg-[rgba(124,58,237,0.1)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">

                    {t("metaPrimary")}

                  </span>

                </div>



                {metaConfigured ? (

                  <MetaConnectButton connectAction={connectMeta} />

                ) : (

                  <p className="ui-alert-warning">{t("metaUnavailable")}</p>

                )}

              </div>



              <div className="mt-8">

                <div className="text-sm font-semibold text-[var(--text-dim)]">{t("otherPlatforms")}</div>

                <div className="mt-3 space-y-2">

                  {googleConfigured ? (

                    <form action={connectGoogleAds}>

                      <button

                        type="submit"

                        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[var(--border-color)] bg-white px-4 py-3.5 text-left shadow-sm transition hover:border-slate-300 hover:bg-[var(--surface-thead)]"

                      >

                        <span className="flex items-center gap-3">

                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-sm font-bold text-rose-500 ring-1 ring-rose-200">

                            G

                          </span>

                          <span>

                            <span className="block text-sm font-medium text-[var(--text-main)]">

                              {t("google")}

                            </span>

                            <span className="block text-xs text-[var(--text-dim)]">{t("googleHint")}</span>

                          </span>

                        </span>

                        <span aria-hidden className="text-[var(--text-dimmer)]">→</span>

                      </button>

                    </form>

                  ) : (

                    <div className="flex cursor-not-allowed items-center justify-between gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-thead)]/60 px-4 py-3.5 opacity-80">

                      <span className="text-sm font-medium text-[var(--text-dim)]">{t("google")}</span>

                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-[var(--text-dim)]">

                        {t("comingSoon")}

                      </span>

                    </div>

                  )}



                  {COMING_SOON.map((p) => (

                    <div

                      key={p.key}

                      className="flex cursor-not-allowed items-center justify-between gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-thead)]/60 px-4 py-3.5 opacity-80"

                      aria-disabled

                    >

                      <span className="flex items-center gap-3">

                        <span

                          className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sm font-bold ring-1 ${p.ring}`}

                        >

                          {p.mark}

                        </span>

                        <span className="text-sm font-medium text-[var(--text-dim)]">{t(p.key)}</span>

                      </span>

                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-[var(--text-dim)]">

                        {t("comingSoon")}

                      </span>

                    </div>

                  ))}

                </div>

              </div>



              <div className="mt-10 text-center">

                <Link

                  href="/dashboard"

                  className="text-sm font-semibold text-[var(--violet)] transition hover:text-violet-500"

                >

                  {t("connectLater")}

                </Link>

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>

  );

}

