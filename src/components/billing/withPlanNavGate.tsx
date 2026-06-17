import { PlanNavGate } from "@/components/billing/PlanNavGate";
import type { GatedNavId } from "@/lib/billing/nav-permissions";

export function withPlanNavGate(navId: GatedNavId) {
  return async function GatedNavLayout({
    children,
    params
  }: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
  }) {
    const { locale } = await params;
    return (
      <PlanNavGate navId={navId} locale={locale}>
        {children}
      </PlanNavGate>
    );
  };
}
