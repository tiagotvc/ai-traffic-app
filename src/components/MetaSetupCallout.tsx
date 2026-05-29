import { getTranslations } from "next-intl/server";

import { getMetaOAuthRedirectUri } from "@/lib/meta-env";

export async function MetaSetupCallout() {
  const t = await getTranslations("settings");
  const redirectUri = getMetaOAuthRedirectUri();

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-100">
      <div className="font-semibold">{t("metaSetupTitle")}</div>
      <p className="mt-2 text-xs text-amber-800/90">{t("metaSetupIntro")}</p>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-xs text-amber-100/90">
        <li>
          {t("metaSetupStep1")}{" "}
          <a
            href="https://developers.facebook.com/apps/"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            developers.facebook.com/apps
          </a>
        </li>
        <li>{t("metaSetupStep2")}</li>
        <li>
          {t("metaSetupStep3")}
          <code className="mt-1 block break-all rounded bg-black/30 px-2 py-1 text-[11px]">
            {redirectUri}
          </code>
        </li>
        <li>{t("metaSetupStep4")}</li>
        <li>{t("metaSetupStep5")}</li>
      </ol>
      <p className="mt-3 text-[11px] text-amber-800/80">{t("metaSetupRestart")}</p>
    </div>
  );
}
