import { getTranslations } from "next-intl/server";

import { AiCenterClient } from "@/components/AiCenterClient";

export default async function AiCenterPage() {
  const t = await getTranslations("aiCenter");

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      <section className="lg:col-span-2">
        <AiCenterClient />
      </section>
      <aside className="ui-card p-4">
        <div className="text-sm font-semibold text-slate-900">{t("debugTitle")}</div>
        <div className="mt-2 text-xs text-slate-500">{t("debugHint")}</div>
        <div className="mt-3 h-56 rounded-xl border border-dashed border-slate-200 bg-slate-50" />
      </aside>
    </div>
  );
}
