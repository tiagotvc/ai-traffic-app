import { Suspense } from "react";

import { CreativeMemoryClient } from "@/components/creative-memory/CreativeMemoryClient";
import { redirect } from "@/i18n/navigation";
import { getAppContext } from "@/lib/app-context";

export default async function CreativeMemoryPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { entitlements } = await getAppContext();
  if (!entitlements.limits.allowCreativeMemoryAi) {
    redirect({ href: "/billing", locale });
  }
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">…</div>}>
      <CreativeMemoryClient />
    </Suspense>
  );
}
