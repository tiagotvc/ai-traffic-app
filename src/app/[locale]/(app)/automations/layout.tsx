import { ModuleGate } from "@/components/billing/ModuleGate";
import { PlanNavGate } from "@/components/billing/PlanNavGate";

export default async function AutomationsLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <ModuleGate moduleId="brain" locale={locale}>
      <PlanNavGate navId="automations" locale={locale}>
        {children}
      </PlanNavGate>
    </ModuleGate>
  );
}
