import { ModuleGate } from "@/components/billing/ModuleGate";
import { PlanNavGate } from "@/components/billing/PlanNavGate";

export default async function ReportsLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <ModuleGate moduleId="reports" locale={locale}>
      <PlanNavGate navId="reports" locale={locale}>
        {children}
      </PlanNavGate>
    </ModuleGate>
  );
}
