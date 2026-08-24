"use client";

import { BarChart2, Building2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { useAudienceScope } from "@/components/audiences/AudienceScopeContext";
import { FilterSelectDropdown } from "@/components/FilterSelectDropdown";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

type Props = {
  /** `bar` = linha completa nas bibliotecas; `inline` = compacta nos headers de criador. */
  variant?: "bar" | "inline";
  /** Só exibe cliente/conta como chips estáticos (telas que não dependem da conta Meta). */
  readOnly?: boolean;
  className?: string;
};

/**
 * Seletor de cliente + conta de anúncios do módulo de públicos, sempre visível.
 *
 * A conta é renderizada mesmo quando o cliente tem uma só — é o que garante que
 * o usuário sempre saiba de qual conta os públicos estão sendo lidos/criados.
 */
export function AudienceScopeBar({ variant = "bar", readOnly = false, className }: Props) {
  const t = useTranslations("audiences");
  const router = useRouter();
  const scope = useAudienceScope();

  if (readOnly) {
    if (!scope.clientName) return null;
    return (
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-dim)]",
          className
        )}
      >
        <span className="uppercase tracking-wide">{t("scopeWorkingFor")}</span>
        <span className="font-medium text-[var(--text-main)]">{scope.clientName}</span>
        {scope.accountLabel ? (
          <>
            <span aria-hidden>·</span>
            <span>{scope.accountLabel}</span>
          </>
        ) : null}
      </div>
    );
  }

  const inline = variant === "inline";

  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <div
        className={cn(
          "flex min-w-0 flex-wrap items-end gap-2",
          inline ? "gap-x-2" : "ui-filter-panel-grid--campaign-creator"
        )}
      >
        {!inline ? (
          <span className="mb-2.5 shrink-0 text-xs uppercase tracking-wide text-[var(--text-dim)]">
            {t("scopeWorkingFor")}
          </span>
        ) : null}

        <FilterSelectDropdown
          creatorField
          className="ui-filter-panel-field ui-filter-panel-field--client"
          icon={<Building2 size={14} />}
          label={t("selectClient")}
          placeholder={t("scopeSelectClientPh")}
          value={scope.clientSlug}
          onChange={scope.setClientSlug}
          disabled={scope.loading}
          clearable={false}
          options={scope.clients.map((c) => ({ value: c.slug, label: c.name }))}
          emptyMessage={t("scopeNoClients")}
          emptyActionLabel={t("scopeNoClientsAction")}
          onEmptyAction={() => router.push("/clients")}
        />

        <FilterSelectDropdown
          creatorField
          className="ui-filter-panel-field ui-filter-panel-field--ad-account"
          valueClassName="max-w-none"
          icon={<BarChart2 size={14} />}
          label={t("selectAdAccount")}
          placeholder={t("scopeSelectAccountPh")}
          value={scope.adAccountId}
          onChange={scope.setAdAccountId}
          disabled={scope.loading || scope.accounts.length === 0}
          clearable={false}
          options={scope.accounts.map((a) => ({
            value: a.metaAdAccountId,
            label: a.label
          }))}
        />
      </div>

      {scope.hasNoAccounts && !scope.loading ? (
        <p className="text-xs text-amber-700">
          {t("noAdAccount")}{" "}
          <Link href={`/clients/${scope.clientSlug}`} className="underline">
            {t("linkAccount")}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
