"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/cn";

type LlmProviderId = "gemini" | "claude";

export function CreatorAiProviderPicker({
  provider,
  onChange,
  providers,
  disabled,
  name = "creator-ai-provider"
}: {
  provider: LlmProviderId;
  onChange: (next: LlmProviderId) => void;
  providers: { gemini: boolean; claude: boolean };
  disabled?: boolean;
  name?: string;
}) {
  const t = useTranslations("campaignCreator");

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-[var(--text-dim)]">{t("aiProviderLabel")}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <CreatorAiProviderCard
          name={name}
          value="gemini"
          checked={provider === "gemini"}
          onChange={() => onChange("gemini")}
          title={t("aiProviderGemini")}
          badge={t("aiProviderGeminiRecommended")}
          disabled={disabled || !providers.gemini}
          offLabel={!providers.gemini ? t("aiProviderOff") : undefined}
        />
        <CreatorAiProviderCard
          name={name}
          value="claude"
          checked={provider === "claude"}
          onChange={() => onChange("claude")}
          title={t("aiProviderClaude")}
          disabled={disabled || !providers.claude}
          offLabel={!providers.claude ? t("aiProviderOff") : undefined}
        />
      </div>
      {!providers.claude ? (
        <p className="text-[10px] leading-snug text-[var(--text-dimmer)]">{t("aiProviderClaudeHint")}</p>
      ) : null}
    </div>
  );
}

function CreatorAiProviderCard({
  name,
  value,
  checked,
  onChange,
  title,
  badge,
  disabled,
  offLabel
}: {
  name: string;
  value: LlmProviderId;
  checked: boolean;
  onChange: () => void;
  title: string;
  badge?: string;
  disabled?: boolean;
  offLabel?: string;
}) {
  return (
    <label
      className={cn(
        "relative flex cursor-pointer flex-col rounded-xl border p-3.5 transition",
        checked
          ? "border-[var(--ui-accent-border-strong)] bg-[var(--ui-accent-muted)] ring-1 ring-[var(--ui-accent-border)]"
          : "border-[var(--border-color)] bg-[var(--surface-card)] hover:border-[var(--border-hover)]",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="peer sr-only"
      />
      <div className="flex items-start justify-between gap-2">
        <span className="font-heading text-sm font-semibold text-[var(--text-main)]">{title}</span>
        <span
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 transition",
            checked
              ? "border-[var(--ui-accent)] bg-[var(--ui-accent)]"
              : "border-[var(--border-hover)] bg-transparent"
          )}
          aria-hidden
        >
          {checked ? (
            <span className="mx-auto mt-0.5 block h-1.5 w-1.5 rounded-full bg-[var(--ui-accent-btn-text)]" />
          ) : null}
        </span>
      </div>
      {badge ? (
        <span className="mt-1.5 inline-flex w-fit rounded-md bg-[var(--ui-accent-muted)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--ui-accent)]">
          {badge}
        </span>
      ) : null}
      {offLabel ? <span className="mt-1 text-[10px] text-amber-600">({offLabel})</span> : null}
    </label>
  );
}

export function CreatorAiPromptField({
  icon,
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  maxLength = 200,
  disabled,
  hint
}: {
  icon?: ReactNode;
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        {icon ? (
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
            {icon}
          </span>
        ) : null}
        <span className="text-xs font-medium text-[var(--text-dim)]">{label}</span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        disabled={disabled}
        className="ui-textarea w-full text-sm"
      />
      <div className="flex items-center justify-between gap-2">
        {hint ? <p className="text-[10px] text-[var(--text-dimmer)]">{hint}</p> : <span />}
        <span className="shrink-0 text-[10px] tabular-nums text-[var(--text-dimmer)]">
          {value.length}/{maxLength}
        </span>
      </div>
    </div>
  );
}

export function CreatorAiPreviewSection({
  title,
  hint,
  children,
  action
}: {
  title: string;
  hint?: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-xl border border-[var(--ui-accent-border)] bg-[var(--surface-bg)] p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ui-accent)]">{title}</p>
        {hint ? <p className="mt-0.5 text-[10px] text-[var(--text-dim)]">{hint}</p> : null}
      </div>
      {children}
      {action ? <div className="pt-1">{action}</div> : null}
    </section>
  );
}
