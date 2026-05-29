import { getTranslations } from "next-intl/server";

import { MetaOnboardingClient } from "@/components/MetaOnboardingClient";
import { StripOAuthHash } from "@/components/StripOAuthHash";

export default async function MetaOnboardingPage() {
  const t = await getTranslations("metaOnboarding");
  return (
    <div className="space-y-4">
      <StripOAuthHash />
      <div>
        <p className="text-xs font-medium text-slate-500">{t("breadcrumb")}</p>
      </div>
      <MetaOnboardingClient />
    </div>
  );
}
