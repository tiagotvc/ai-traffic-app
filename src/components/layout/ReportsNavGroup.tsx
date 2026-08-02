"use client";

import { useTranslations } from "next-intl";
import { BarChart3 } from "lucide-react";
import { Link } from "@/i18n/navigation";

import { NavUpgradeLink } from "@/components/layout/NavUpgradeLink";
import { sidebarItemClasses } from "@/components/layout/sidebar-nav-styles";
import { REPORTS_NAV, isReportsActive } from "@/lib/reports/nav";
import type { ResolvedFeatureMap } from "@/lib/feature-flags/types";
import { isModuleEnabledInShell } from "@/lib/feature-flags/modules";
import { isNavItemAllowed } from "@/lib/billing/nav-permissions";
import type { PlanLimits } from "@/lib/billing/types";
import { FREE_LIMITS } from "@/lib/billing/types";

function ReportsNavIcon() {
  return <BarChart3 size={18} strokeWidth={1.75} className="shrink-0" />;
}

type Props = {
  collapsed: boolean;
  planLimits?: PlanLimits;
  planLimitsReady?: boolean;
  platformFeatures?: ResolvedFeatureMap;
  isPlatformAdmin?: boolean;
  pathname: string;
  onNavigate?: () => void;
};

// Item único (sem sub-itens) — "Agenda" era o único filho além de "Relatório" e foi
// removida (agendamento de envio ainda não é uma feature exposta), então o grupo
// expansível virou redundante: um só link apontando pra mesma rota do pai.
export function ReportsNavGroup({
  collapsed,
  planLimits = FREE_LIMITS,
  planLimitsReady = true,
  platformFeatures,
  isPlatformAdmin = false,
  pathname,
  onNavigate
}: Props) {
  const t = useTranslations("nav");
  const base = pathname.replace(/^\/(pt-BR|en)/, "") || "/";
  const parentActive = isReportsActive(base);

  if (!isModuleEnabledInShell(platformFeatures, "reports", { ready: planLimitsReady })) {
    return null;
  }

  const allowed = !planLimitsReady || isNavItemAllowed("reports", planLimits);

  if (!allowed) {
    return (
      <NavUpgradeLink
        label={t(REPORTS_NAV.navKey)}
        collapsed={collapsed}
        icon={<ReportsNavIcon />}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <Link
      href={REPORTS_NAV.route}
      title={collapsed ? t(REPORTS_NAV.navKey) : undefined}
      onClick={() => onNavigate?.()}
      className={sidebarItemClasses(parentActive, collapsed)}
    >
      <ReportsNavIcon />
      {!collapsed ? (
        <span className="min-w-0 flex-1 whitespace-normal text-left leading-snug">
          {t(REPORTS_NAV.navKey)}
        </span>
      ) : null}
    </Link>
  );
}
