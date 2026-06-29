import { Suspense } from "react";

import { AudiencesCreatorShell } from "@/components/audiences/AudiencesCreatorShell";
import { ModuleGate } from "@/components/billing/ModuleGate";
import { PlanNavGate } from "@/components/billing/PlanNavGate";

export default async function AudiencesLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <ModuleGate moduleId="audiences" locale={locale}>
      <PlanNavGate navId="audiences" locale={locale}>
        <Suspense fallback={<div className="p-8 text-sm text-[var(--text-dim)]">…</div>}>
          <AudiencesCreatorShell>{children}</AudiencesCreatorShell>
        </Suspense>
      </PlanNavGate>
    </ModuleGate>
  );
}
