import { Suspense } from "react";

import { AgencyBrainShell } from "@/components/agency-brain/AgencyBrainShell";
import { ModuleGate } from "@/components/billing/ModuleGate";
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
    <ModuleGate moduleId="brain" locale={locale}>
      <PlanNavGate navId="agencyBrain" locale={locale}>
        <Suspense fallback={<div className="p-8 text-sm text-[var(--text-dim)]">…</div>}>
          <AgencyBrainShell>{children}</AgencyBrainShell>
        </Suspense>
      </PlanNavGate>
    </ModuleGate>
  );
}
