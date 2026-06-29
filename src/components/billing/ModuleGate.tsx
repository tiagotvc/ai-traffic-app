import { redirect } from "@/i18n/navigation";
import { getAppContext } from "@/lib/app-context";
import { isFeatureEnabledForUser } from "@/lib/feature-flags/registry";
import { getPlatformFeatureFlags } from "@/lib/feature-flags/service";
import type { PlatformModuleId } from "@/lib/feature-flags/modules";

export async function requireModuleEnabled(moduleId: PlatformModuleId, locale: string) {
  const { user, platformAdmin } = await getAppContext();
  if (platformAdmin) return;

  const flags = await getPlatformFeatureFlags();
  const enabled = isFeatureEnabledForUser(flags, moduleId, {
    userId: user.id,
    isPlatformAdmin: false
  });
  if (!enabled) {
    redirect({ href: "/dashboard", locale });
  }
}

export async function ModuleGate({
  moduleId,
  locale,
  children
}: {
  moduleId: PlatformModuleId;
  locale: string;
  children: React.ReactNode;
}) {
  await requireModuleEnabled(moduleId, locale);
  return children;
}
