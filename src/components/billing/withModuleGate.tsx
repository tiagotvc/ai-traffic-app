import { ModuleGate } from "@/components/billing/ModuleGate";
import type { PlatformModuleId } from "@/lib/feature-flags/modules";

export function withModuleGate(moduleId: PlatformModuleId) {
  return async function GatedModuleLayout({
    children,
    params
  }: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
  }) {
    const { locale } = await params;
    return (
      <ModuleGate moduleId={moduleId} locale={locale}>
        {children}
      </ModuleGate>
    );
  };
}
