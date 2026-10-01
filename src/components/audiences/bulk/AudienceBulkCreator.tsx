"use client";

import { useCallback, useState, type ComponentType } from "react";
import { Layers } from "lucide-react";
import { useTranslations } from "next-intl";

import { AudienceScopeBar } from "@/components/audiences/AudienceScopeBar";
import { useAudienceScope } from "@/components/audiences/AudienceScopeContext";
import { DsCard, DsUnderlineTabs, PageTitleBlock } from "@/design-system";
import { Link } from "@/i18n/navigation";
import { BULK_AUDIENCE_TABS, type BulkAudienceTabId } from "@/lib/audiences/bulk/tabs";
import { BULK_MAX_AUDIENCES } from "@/lib/audiences/bulk/types";

import { BulkCreationProgress } from "./BulkCreationProgress";
import { LookalikeBuilder } from "./LookalikeBuilder";
import type { BulkBuilderOutput, BulkBuilderProps } from "./types";
import { useAudienceCreationQueue } from "./useAudienceCreationQueue";
import { VideoViewBuilder } from "./VideoViewBuilder";

/** Aba → builder. Nova aba: registrar em `BULK_AUDIENCE_TABS` e aqui. */
const BUILDERS: Record<BulkAudienceTabId, ComponentType<BulkBuilderProps>> = {
  video_view: VideoViewBuilder,
  lookalike: LookalikeBuilder
};

const EMPTY_OUTPUT: BulkBuilderOutput = { config: null, preview: [], summary: [] };
const PREVIEW_NAMES = 5;

/**
 * Criador de públicos em lote: só configura e dispara. Combinações, nomes,
 * duplicidade e chamadas à Meta ficam em `src/lib/audiences/bulk` e nas rotas
 * `/api/audiences/bulk/*`.
 */
export function AudienceBulkCreator() {
  const t = useTranslations("audiencesBulk");
  const tAud = useTranslations("audiences");
  const scope = useAudienceScope();
  const { clientSlug, adAccountId, scopeKey, metaConnected } = scope;
  const [tab, setTab] = useState<BulkAudienceTabId>("video_view");
  const [output, setOutput] = useState<BulkBuilderOutput>(EMPTY_OUTPUT);
  const queue = useAudienceCreationQueue({ clientSlug, adAccountId });
  const busy = queue.state.phase === "planning" || queue.state.phase === "running";

  const handleOutput = useCallback((next: BulkBuilderOutput) => setOutput(next), []);

  function changeTab(next: BulkAudienceTabId) {
    if (busy || next === tab) return;
    queue.reset();
    setOutput(EMPTY_OUTPUT);
    setTab(next);
  }

  const Builder = BUILDERS[tab];
  const total = output.preview.length;
  const overLimit = total > BULK_MAX_AUDIENCES;
  const ready = !!scope.client && !!adAccountId && metaConnected;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <PageTitleBlock
        title={t("title")}
        subtitle={t("subtitle")}
        titleIcon={<Layers size={16} aria-hidden />}
      />

      <AudienceScopeBar variant="bar" />

      {!scope.loading && !metaConnected ? (
        <div className="ui-alert-warning text-sm">
          {tAud("metaRequired")}{" "}
          <Link href="/settings" className="ui-link">
            {tAud("connectMeta")}
          </Link>
        </div>
      ) : null}

      <DsUnderlineTabs
        tabs={BULK_AUDIENCE_TABS.map((x) => ({ key: x.id, label: t(x.labelKey) }))}
        active={tab}
        onChange={changeTab}
      />

      {scope.loading ? (
        <p className="text-sm text-[var(--text-dim)]">…</p>
      ) : !ready ? (
        <p className="text-sm text-[var(--text-dim)]">{tAud("scopeSelectClientFirst")}</p>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <DsCard padding="lg">
            {/* Remonta ao trocar de aba ou de conta: o estado pertence à conta anterior. */}
            <Builder
              key={`${tab}:${scopeKey}`}
              clientSlug={clientSlug}
              adAccountId={adAccountId}
              disabled={busy}
              onChange={handleOutput}
            />
          </DsCard>

          <div className="space-y-4 lg:sticky lg:top-4">
            {queue.state.phase === "idle" ? (
              <DsCard padding="lg" className="space-y-4">
                <h2 className="font-heading text-base font-semibold text-[var(--text-main)]">{t("summary.title")}</h2>
                <dl className="space-y-1.5 text-sm">
                  {output.summary.map((s) => (
                    <div key={s.label} className="flex justify-between gap-3">
                      <dt className="text-[var(--text-dim)]">{s.label}</dt>
                      <dd className="font-semibold tabular-nums text-[var(--text-main)]">{s.value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="border-t border-[var(--border-color)] pt-3">
                  <p className="text-xs text-[var(--text-dim)]">{t("summary.willCreate")}</p>
                  <p className="font-heading text-3xl font-semibold tabular-nums text-[var(--text-main)]">
                    {t("summary.audiences", { count: total })}
                  </p>
                  {overLimit ? (
                    <p className="mt-1 text-xs text-red-500">{t("summary.overLimit", { max: BULK_MAX_AUDIENCES })}</p>
                  ) : null}
                </div>
                {total ? (
                  <div>
                    <p className="mb-1 text-[11px] uppercase tracking-wide text-[var(--text-dimmer)]">
                      {t("summary.namePreview")}
                    </p>
                    <ul className="space-y-0.5 text-xs text-[var(--text-dim)]">
                      {output.preview.slice(0, PREVIEW_NAMES).map((p) => (
                        <li key={p.key} className="break-words">
                          {p.name}
                        </li>
                      ))}
                      {total > PREVIEW_NAMES ? (
                        <li className="text-[var(--text-dimmer)]">
                          {t("summary.andMore", { count: total - PREVIEW_NAMES })}
                        </li>
                      ) : null}
                    </ul>
                  </div>
                ) : null}
                {queue.state.error ? (
                  <div className="ui-alert-danger text-sm">
                    {queue.state.error}
                    {queue.state.tosUrl ? (
                      <>
                        {" "}
                        <a href={queue.state.tosUrl} target="_blank" rel="noreferrer" className="ui-link">
                          {t("summary.acceptTos")}
                        </a>
                      </>
                    ) : null}
                  </div>
                ) : null}
                <button
                  type="button"
                  disabled={!output.config || !total || overLimit}
                  onClick={() => output.config && void queue.start(output.config)}
                  className="ui-btn-accent w-full px-5 py-2.5 font-heading text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("summary.create")}
                </button>
                <p className="text-[11px] text-[var(--text-dimmer)]">{t("summary.duplicateNote")}</p>
              </DsCard>
            ) : (
              <BulkCreationProgress state={queue.state} onCancel={queue.cancel} onReset={queue.reset} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
