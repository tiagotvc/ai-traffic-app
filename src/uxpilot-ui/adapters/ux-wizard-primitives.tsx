"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

export function UxCircularProgress({ value }: { value: number }) {
  const r = 30;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <div className="relative flex h-16 w-16 items-center justify-center">
      <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--border-color)" strokeWidth="5" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="var(--ui-accent)"
          strokeWidth="5"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <span className="absolute font-heading text-base font-bold" style={{ color: "var(--ui-accent)" }}>
        {value}
      </span>
    </div>
  );
}

export function UxScoreItem({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full transition-all"
        style={{
          background: done ? "rgba(16,185,129,0.12)" : "var(--surface-bg)",
          border: `1.5px solid ${done ? "#10b981" : "var(--border-hover)"}`
        }}
      >
        {done ? <Check size={9} style={{ color: "#10b981" }} strokeWidth={3} /> : null}
      </div>
      <span className="font-body text-xs" style={{ color: done ? "var(--text-main)" : "var(--text-dimmer)" }}>
        {label}
      </span>
    </div>
  );
}

export function UxFormCard({ children }: { children: ReactNode }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--border-color)",
        boxShadow: "0 1px 6px rgba(0,0,0,0.05)"
      }}
    >
      {children}
    </div>
  );
}

/** Conteúdo de passo do wizard sem card interno — campos direto no fundo da página. */
export function UxWizardStepContent({ children }: { children: ReactNode }) {
  return <div className="space-y-3">{children}</div>;
}

/** Campo select compacto: ícone + label + input, sem card/accordion. */
export function WizardInlineSelectField({
  icon,
  label,
  children,
  className
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-start gap-2.5", className)}>
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
        {icon}
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <span className="block font-body text-[11px] font-medium text-[var(--text-dim)]">{label}</span>
        {children}
      </div>
    </div>
  );
}

/** Seção colapsável do wizard (details/summary). */
export function WizardAccordionSection({
  title,
  hint,
  defaultOpen = false,
  children
}: {
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-xl border border-[var(--border-color)] bg-[var(--surface-card)]"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <span className="font-heading text-sm font-semibold text-[var(--text-main)]">{title}</span>
          {hint ? <p className="mt-0.5 text-xs text-[var(--text-dim)]">{hint}</p> : null}
        </div>
        <ChevronDown
          size={16}
          strokeWidth={2}
          className="shrink-0 text-[var(--text-dim)] transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="space-y-4 border-t border-[var(--border-color)] px-4 py-4">{children}</div>
    </details>
  );
}

/** Seção estática do formulário (título + campos visíveis de uma vez). */
export function WizardFormSection({
  title,
  hint,
  children
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-card)] p-4">
      <div>
        <h3 className="font-heading text-sm font-semibold text-[var(--text-main)]">{title}</h3>
        {hint ? <p className="mt-0.5 text-xs text-[var(--text-dim)]">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** Painel interno de modais grandes do wizard (import, IA, etc.). */
export function UxWizardModalPanel({
  children,
  className,
  size = "lg",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  size?: "md" | "lg" | "xl";
} & HTMLAttributes<HTMLDivElement>) {
  const maxW = size === "xl" ? "max-w-4xl" : size === "lg" ? "max-w-3xl" : "max-w-2xl";
  return (
    <div
      {...rest}
      className={cn(
        "flex min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-card)] shadow-2xl",
        maxW,
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

export function UxStepItem({
  active,
  completed,
  onClick,
  stepNum,
  label,
  sublabel,
  disabled
}: {
  active: boolean;
  completed: boolean;
  onClick: () => void;
  stepNum: number;
  label: string;
  sublabel?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="group relative flex w-full items-start gap-3 px-1 py-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50"
    >
      <div
        className="z-10 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-all"
        style={{
          background: completed
            ? "var(--ui-accent-muted)"
            : active
              ? "linear-gradient(135deg, var(--ui-accent-btn-from), var(--ui-accent-btn-to))"
              : "var(--surface-bg)",
          border: completed || active ? "2px solid var(--ui-accent)" : "2px solid var(--border-color)",
          boxShadow: active ? "0 0 0 4px var(--ui-accent-ring)" : "none"
        }}
      >
        {completed ? (
          <Check size={13} style={{ color: "var(--ui-accent)" }} strokeWidth={2.5} />
        ) : (
          <span
            style={{
              color: active ? "var(--ui-accent-btn-text)" : "var(--text-dimmer)",
              fontSize: 11,
              fontWeight: 700
            }}
          >
            {stepNum}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1 pt-1.5">
        <p
          className="truncate font-heading text-sm font-semibold leading-tight"
          style={{
            color: active ? "var(--ui-accent)" : completed ? "var(--text-main)" : "var(--text-dim)"
          }}
        >
          {label}
        </p>
        {sublabel ? (
          <p className="mt-0.5 truncate font-body text-[11px]" style={{ color: "var(--text-dimmer)" }}>
            {sublabel}
          </p>
        ) : null}
      </div>
    </button>
  );
}

export function UxHorizontalStepper({
  steps,
  current,
  onStepClick,
  size = "default"
}: {
  steps: Array<{ number: number; label: string; disabled?: boolean }>;
  current: number;
  onStepClick: (step: number) => void;
  size?: "default" | "mini" | "compact";
}) {
  const isMini = size === "mini";
  const isCompact = size === "compact";
  const checkSize = isMini ? 12 : isCompact ? 14 : 16;

  return (
    <nav
      aria-label="Etapas"
      className={cn(
        "ui-wizard-stepper",
        isMini && "ui-wizard-stepper--mini",
        isCompact && "ui-wizard-stepper--compact"
      )}
      style={{ ["--wizard-steps" as string]: steps.length }}
    >
      {steps.map((s, i) => {
        const done = current > s.number;
        const active = current === s.number;
        const future = !done && !active;
        const disabled = s.disabled ?? false;
        const isLast = i === steps.length - 1;
        return (
          <div key={s.number} className="ui-wizard-stepper__item">
            {!isLast ? (
              <div
                className={cn(
                  "ui-wizard-stepper__line",
                  done && "ui-wizard-stepper__line--done",
                  future && "ui-wizard-stepper__line--future"
                )}
                aria-hidden
              />
            ) : null}
            <button
              type="button"
              disabled={disabled}
              onClick={() => onStepClick(s.number)}
              className="flex flex-col items-center disabled:cursor-not-allowed"
            >
              <span
                className={cn(
                  "ui-wizard-stepper__circle",
                  active && "ui-wizard-stepper__circle--active",
                  done && "ui-wizard-stepper__circle--done",
                  future && "ui-wizard-stepper__circle--future"
                )}
              >
                {done ? <Check size={checkSize} strokeWidth={2.5} /> : s.number}
              </span>
              <span
                className={cn(
                  "ui-wizard-stepper__label max-w-[7.5rem] sm:max-w-[9rem]",
                  active && "ui-wizard-stepper__label--active",
                  done && !active && "ui-wizard-stepper__label--done",
                  future && "ui-wizard-stepper__label--future"
                )}
              >
                {s.label}
              </span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}

type WizardStepCircleProps = {
  number: number;
  label: string;
  done: boolean;
  active: boolean;
  disabled?: boolean;
  onClick?: () => void;
};

function WizardStepCircle({ number, label, done, active, disabled, onClick }: WizardStepCircleProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-[4.25rem] shrink-0 flex-col items-center disabled:cursor-not-allowed disabled:opacity-45 sm:w-[5rem]"
    >
      <span
        className={cn(
          "ui-wizard-stepper__circle",
          active && "ui-wizard-stepper__circle--active",
          done && "ui-wizard-stepper__circle--done"
        )}
      >
        {done ? <Check size={16} strokeWidth={2.5} /> : number}
      </span>
      <span
        className={cn(
          "ui-wizard-stepper__label mt-2.5 max-w-[4.25rem] text-center sm:max-w-[5rem]",
          active && "ui-wizard-stepper__label--active",
          done && !active && "ui-wizard-stepper__label--done"
        )}
      >
        {label}
      </span>
    </button>
  );
}

function WizardStepConnector({ done }: { done: boolean }) {
  return (
    <div
      className={cn(
        "mt-5 h-0.5 min-w-2 flex-1 self-start",
        done ? "bg-[var(--ui-accent)]" : "bg-[var(--border-color)]"
      )}
      aria-hidden
    />
  );
}

/** Ponte com micro-círculos entre duas etapas principais. */
export function UxMicroStepBridge({
  count,
  current,
  onStepClick,
  interactive = false,
  ariaLabel = "Sub-etapas"
}: {
  count: number;
  current: number;
  onStepClick?: (index: number) => void;
  interactive?: boolean;
  ariaLabel?: string;
}) {
  const leftDone = current > 0;
  const rightDone = current > count;

  return (
    <div
      className="flex min-w-[2.75rem] max-w-[5.5rem] flex-1 items-center self-start pt-[1.125rem] sm:max-w-[6.5rem]"
      aria-label={ariaLabel}
    >
      <div className={cn("h-0.5 flex-1", leftDone ? "bg-[var(--ui-accent)]" : "bg-[var(--border-color)]")} />
      <div className="flex items-center gap-1 px-0.5 sm:gap-1.5">
        {Array.from({ length: count }, (_, i) => {
          const n = i + 1;
          const done = current > n;
          const active = current === n;
          return (
            <button
              key={n}
              type="button"
              disabled={!interactive}
              onClick={() => onStepClick?.(n)}
              className={cn(
                "ui-wizard-stepper__circle ui-wizard-stepper__circle--micro shrink-0 transition-all",
                active && "ui-wizard-stepper__circle--active",
                done && "ui-wizard-stepper__circle--done",
                !interactive && "cursor-default"
              )}
              aria-current={active ? "step" : undefined}
            />
          );
        })}
      </div>
      <div className={cn("h-0.5 flex-1", rightDone ? "bg-[var(--ui-accent)]" : "bg-[var(--border-color)]")} />
    </div>
  );
}

export type WizardMicroBridge = {
  afterStepIndex: number;
  count: number;
  current: number;
  interactive?: boolean;
  onStepClick?: (index: number) => void;
  ariaLabel?: string;
};

/** Stepper principal do criador com micro-pontos entre etapas principais. */
export function UxCampaignCreatorMainStepper({
  steps,
  current,
  onStepClick,
  microBridges = []
}: {
  steps: Array<{ number: number; label: string; disabled?: boolean }>;
  current: number;
  onStepClick: (step: number) => void;
  microBridges?: WizardMicroBridge[];
}) {
  return (
    <nav aria-label="Etapas" className="ui-wizard-stepper-main">
      {steps.map((s, i) => {
        const done = current > s.number;
        const active = current === s.number;
        const disabled = s.disabled ?? false;
        const isLast = i === steps.length - 1;
        const bridge = microBridges.find((b) => b.afterStepIndex === i);

        return (
          <div key={s.number} className="contents">
            <WizardStepCircle
              number={s.number}
              label={s.label}
              done={done}
              active={active}
              disabled={disabled}
              onClick={() => !disabled && onStepClick(s.number)}
            />
            {!isLast ? (
              bridge ? (
                <UxMicroStepBridge
                  count={bridge.count}
                  current={bridge.current}
                  interactive={bridge.interactive}
                  onStepClick={bridge.onStepClick}
                  ariaLabel={bridge.ariaLabel}
                />
              ) : (
                <WizardStepConnector done={current > s.number} />
              )
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

export function UxWizardHeader({
  breadcrumbParent,
  breadcrumbParentHref,
  breadcrumbCurrent,
  title,
  onBack,
  showBack = true,
  badge
}: {
  breadcrumbParent: string;
  breadcrumbParentHref: string;
  breadcrumbCurrent: string;
  title: string;
  onBack: () => void;
  showBack?: boolean;
  badge?: string | null;
}) {
  return (
    <div
      className="sticky top-0 z-20 flex w-full items-center gap-3 border-b px-4 py-3 sm:px-6"
      style={{
        background: "var(--surface-card)",
        borderColor: "var(--border-color)",
        boxShadow: "0 1px 0 var(--border-color)"
      }}
    >
      <div className="min-w-0 flex-1">
        <p className="font-body text-xs" style={{ color: "var(--text-dimmer)" }}>
          <Link href={breadcrumbParentHref} className="hover:underline" style={{ color: "var(--text-dimmer)" }}>
            {breadcrumbParent}
          </Link>
          {" › "}
          <span style={{ color: "var(--text-dim)" }}>{breadcrumbCurrent}</span>
        </p>
        <div className="mt-0.5 flex items-center gap-2">
          <h1 className="font-heading text-lg font-bold sm:text-xl" style={{ color: "var(--text-main)" }}>
            {title}
          </h1>
          {badge ? (
            <span
              className="rounded px-2 py-0.5 font-heading text-xs font-semibold"
              style={{
                background: "var(--ui-accent-muted)",
                color: "var(--ui-accent)",
                border: "1px solid var(--ui-accent-border)"
              }}
            >
              {badge}
            </span>
          ) : null}
        </div>
      </div>
      {showBack ? (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-lg border px-4 py-1.5 font-heading text-sm font-semibold transition-all hover:opacity-80"
          style={{ borderColor: "var(--border-hover)", color: "var(--text-main)", background: "var(--surface-card)" }}
        >
          Voltar
        </button>
      ) : null}
    </div>
  );
}
