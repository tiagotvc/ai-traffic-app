import { Suspense } from "react";

import { AgencyBrainShell } from "@/components/agency-brain/AgencyBrainShell";
import { redirect } from "@/i18n/navigation";
import { getAppContext } from "@/lib/app-context";

export default async function AgencyBrainLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { entitlements } = await getAppContext();
  if (!entitlements.limits.allowCreativeMemoryAi) {
    redirect({ href: "/billing", locale });
  }
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">…</div>}>
      <AgencyBrainShell>{children}</AgencyBrainShell>
    </Suspense>
  );
}
