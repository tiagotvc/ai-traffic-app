import { redirect } from "next/navigation";

import { requireAppShellContext } from "@/lib/api-auth";
import { getEntitlements } from "@/lib/billing/entitlements";
import { CommanderScientistsView } from "@/components/commander/CommanderScientistsView";
import { isMetaAdLibraryConfigured } from "@/lib/meta-ad-library/provider";

/**
 * Cientistas é Advanced/Agency — bloqueado de verdade aqui no servidor (não só
 * escondendo o link no menu): quem digitar a URL direto no plano Individual é
 * redirecionado antes de qualquer conteúdo renderizar.
 */
export default async function CommanderScientistsPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { tenant, user, platformAdmin } = await requireAppShellContext();
  const entitlements = await getEntitlements(tenant.id, { platformAdmin, userId: user.id });

  if (!entitlements.limits.allowCopilot) {
    redirect(`/${locale}/commander`);
  }

  return <CommanderScientistsView researchApiConfigured={isMetaAdLibraryConfigured()} />;
}
