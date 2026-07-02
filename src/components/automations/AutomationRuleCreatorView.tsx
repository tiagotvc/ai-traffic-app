"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, X, Zap } from "lucide-react";

import { Link, useRouter } from "@/i18n/navigation";
import { PageTitleBlock } from "@/design-system/components/PageTitleBlock";
import { UxHorizontalStepper } from "@/uxpilot-ui/adapters/ux-wizard-primitives";
import { TriggerStep } from "@/components/automations/steps/TriggerStep";
import { ActionStep } from "@/components/automations/steps/ActionStep";
import { ReviewStep } from "@/components/automations/steps/ReviewStep";
import { AutomationRulePreviewCard } from "@/components/automations/AutomationRulePreviewCard";
import {
  EMPTY_RULE_FORM,
  getRuleTemplate,
  ruleFormToPayload,
  type RuleForm
} from "@/lib/automation/rule-templates";

const STEPS = [
  { number: 1, label: "Gatilho" },
  { number: 2, label: "Ação" },
  { number: 3, label: "Revisão" }
];

function RuleWizardNav({
  placement,
  onBack,
  onNext,
  onSave,
  showSave,
  nextDisabled,
  saveDisabled,
  backLabel
}: {
  placement: "sidebar" | "footer";
  onBack: () => void;
  onNext: () => void;
  onSave: () => void;
  showSave: boolean;
  nextDisabled: boolean;
  saveDisabled: boolean;
  backLabel: string;
}) {
  return (
    <div className={placement === "sidebar" ? "ui-wizard-nav--sidebar" : "ui-wizard-nav--footer"}>
      <div className="ui-wizard-nav__actions">
        <button
          type="button"
          onClick={onBack}
          className="ui-wizard-nav__btn ui-wizard-nav__btn--back ui-btn-secondary inline-flex h-9 items-center justify-center gap-1 px-3.5 text-sm font-heading font-medium"
        >
          <ChevronLeft size={16} strokeWidth={2.5} />
          {backLabel}
        </button>
        {showSave ? (
          <button
            type="button"
            disabled={saveDisabled}
            onClick={onSave}
            className="ui-wizard-nav__btn ui-wizard-nav__btn--next ui-btn-accent inline-flex h-9 items-center justify-center gap-2 px-4 text-sm font-heading font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check size={14} strokeWidth={2.5} />
            Salvar regra
          </button>
        ) : (
          <button
            type="button"
            disabled={nextDisabled}
            onClick={onNext}
            className="ui-wizard-nav__btn ui-wizard-nav__btn--next ui-btn-accent inline-flex h-9 items-center justify-center gap-1 px-4 text-sm font-heading font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            Próximo
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Shell do stepper de criação de regra de automação. Página dedicada (rota), reusando o shell
 * `[data-campaign-creator-shell]` e os primitivos de wizard. Pré-preenche a partir de `?template=<id>`.
 */
export function AutomationRuleCreatorView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const template = getRuleTemplate(searchParams.get("template"));

  const [form, setForm] = useState<RuleForm>(() => template?.form ?? EMPTY_RULE_FORM);
  const [enabled, setEnabled] = useState(true);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    fetch("/api/clients?minimal=1")
      .then((r) => r.json())
      .then((j: { clients?: Array<{ id: string; name: string }> }) => setClients(j.clients ?? []))
      .catch(() => {});
  }, []);

  const update = (patch: Partial<RuleForm>) => setForm((f) => ({ ...f, ...patch }));

  const isReview = step === STEPS.length;
  const canNext =
    step === 1
      ? form.kind === "schedule"
        ? form.schedule.startHour !== form.schedule.endHour
        : form.groups.length > 0 &&
          form.groups.every((g) => g.length > 0 && g.every((c) => Number(c.value) > 0))
      : true;

  const close = () => router.push("/automations");

  const goPrev = () => {
    if (step <= 1) {
      close();
      return;
    }
    setStep((s) => s - 1);
  };
  const goNext = () => {
    if (canNext) setStep((s) => Math.min(STEPS.length, s + 1));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/automation/rules", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...ruleFormToPayload(form), enabled })
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(
          res.status === 402
            ? "Limite de regras do seu plano atingido. Faça upgrade para criar mais."
            : data?.error ?? "Não foi possível salvar a regra."
        );
        setSaving(false);
        return;
      }
      router.push("/automations");
      router.refresh();
    } catch {
      setError("Não foi possível salvar a regra.");
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="campaign-creator-header shrink-0 px-4 pb-3 pt-3 lg:pl-8 lg:pr-4 lg:pb-4 lg:pt-4">
        <div className="flex items-start justify-between gap-3">
          <PageTitleBlock
            className="flex-1"
            title="Nova regra de automação"
            titleIcon={<Zap size={16} aria-hidden />}
            subtitle={
              <>
                <Link href="/automations" className="hover:underline">
                  Automações
                </Link>
                {" › "}
                {template ? template.title : "Regra personalizada"}
              </>
            }
          />
          <button
            type="button"
            onClick={close}
            aria-label="Fechar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-opacity hover:opacity-80 lg:h-8 lg:w-8"
          >
            <X size={20} strokeWidth={2} className="text-[var(--text-dim)]" />
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_1fr] gap-x-8 overflow-x-visible overflow-y-hidden px-4 lg:grid-cols-[minmax(0,1fr)_16rem] lg:pl-8 lg:pr-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="campaign-creator-stepper-row col-start-1 row-start-1 flex shrink-0 items-center gap-3 border-b border-[var(--border-color)] py-2 lg:gap-4 lg:py-1.5">
          <div className="min-w-0 flex-1 overflow-x-auto px-4">
            <div className="campaign-creator-stepper mx-auto w-full max-w-md lg:mx-0">
              <UxHorizontalStepper
                size="mini"
                steps={STEPS.map((s) => ({
                  number: s.number,
                  label: s.label,
                  disabled: s.number > step
                }))}
                current={step}
                onStepClick={(n) => {
                  if (n <= step) setStep(n);
                }}
              />
            </div>
          </div>
        </div>

        <main className="relative col-start-1 row-start-2 flex min-h-0 min-w-0 w-full flex-col overflow-x-visible overflow-y-hidden py-3">
          <div className="campaign-creator-step-panel flex min-h-0 min-w-0 w-full flex-1 flex-col">
            <div className="campaign-creator-step-scroll min-h-0 flex-1 overflow-y-auto px-4 pt-2 pb-2 lg:px-0">
              {step === 1 ? <TriggerStep form={form} update={update} /> : null}
              {step === 2 ? <ActionStep form={form} update={update} /> : null}
              {step === 3 ? (
                <ReviewStep
                  form={form}
                  update={update}
                  enabled={enabled}
                  onEnabledChange={setEnabled}
                  error={error}
                  clients={clients}
                />
              ) : null}
            </div>
          </div>
        </main>

        <aside className="campaign-creator-sidebar hidden min-h-0 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:flex lg:flex-col lg:overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="campaign-creator-sidebar__scroll min-h-0 flex-1 overflow-y-auto">
              <div className="campaign-creator-sidebar__inner space-y-3 py-1">
                <AutomationRulePreviewCard form={form} enabled={enabled} />
              </div>
            </div>
            <div className="campaign-creator-sidebar-footer shrink-0">
              <RuleWizardNav
                placement="sidebar"
                onBack={goPrev}
                onNext={goNext}
                onSave={save}
                showSave={isReview}
                nextDisabled={!canNext}
                saveDisabled={saving}
                backLabel={step <= 1 ? "Cancelar" : "Voltar"}
              />
            </div>
          </div>
        </aside>
      </div>

      <div className="campaign-creator-footer-outer shrink-0 lg:hidden">
        <div className="campaign-creator-footer-band">
          <RuleWizardNav
            placement="footer"
            onBack={goPrev}
            onNext={goNext}
            onSave={save}
            showSave={isReview}
            nextDisabled={!canNext}
            saveDisabled={saving}
            backLabel={step <= 1 ? "Cancelar" : "Voltar"}
          />
        </div>
      </div>
    </div>
  );
}
