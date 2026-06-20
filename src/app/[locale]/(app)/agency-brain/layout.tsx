import { Suspense } from "react";

import { AgencyBrainShell } from "@/components/agency-brain/AgencyBrainShell";
import { PlanNavGate } from "@/components/billing/PlanNavGate";

export default async function AgencyBrainLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <PlanNavGate navId="agencyBrain" locale={locale}>
      <Suspense fallback={<div className="p-8 text-sm text-[var(--text-dim)]">…</div>}>
        <AgencyBrainShell>{children}</AgencyBrainShell>
      </Suspense>
    </PlanNavGate>
  );
}
