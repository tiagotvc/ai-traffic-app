import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { Link } from "@/i18n/navigation";

type DsChoiceCardLayout = "stack" | "inline";

type DsChoiceCardProps = {
  title: string;
  description?: string;
  icon: ReactNode;
  /** Destaque com accent temático — selecionado/ativo. */
  accent?: boolean;
  /** Seção ainda não visitada — borda e texto muted, sem preenchimento. */
  muted?: boolean;
  /** Seção visitada mas não ativa — borda ligeiramente mais forte que muted. */
  visited?: boolean;
  href?: string;
  onClick?: () => void;
  className?: string;
  /** Layout compacto — só ícone + título (mobile/tablet). Prefer `layout="inline"` for wizard tabs. */
  compact?: boolean;
  /** `inline` = ícone à esquerda, título compacto numa linha (wizard). `stack` = ícone acima (modais). */
  layout?: DsChoiceCardLayout;
};

function isInlineLayout(compact?: boolean, layout?: DsChoiceCardLayout): boolean {
  return layout === "inline" || !!compact;
}

const cardClass = (
  accent?: boolean,
  muted?: boolean,
  visited?: boolean,
  compact?: boolean,
  layout?: DsChoiceCardLayout
) => {
  const inline = isInlineLayout(compact, layout);
  const selected = !!accent;

  return cn(
    "group rounded-xl border text-left transition",
    inline
      ? "flex min-h-[4rem] w-full flex-row items-center gap-2.5 px-3 py-2"
      : "flex flex-col p-3.5 lg:p-4",
    compact && layout !== "inline" && "items-center p-2 text-center",
    selected && "ds-choice-card--selected",
    !selected && muted && "ds-choice-card--muted",
    !selected && visited && "ds-choice-card--visited",
    selected
      ? "border-transparent bg-gradient-to-br from-[var(--ui-accent-btn-from)] to-[var(--ui-accent-btn-to)] text-[var(--ui-accent-btn-text)] shadow-[0_4px_14px_-4px_var(--ui-accent-btn-shadow)] hover:opacity-95"
      : muted
        ? "border-[var(--creator-choice-inactive-border,var(--border-color))] bg-transparent hover:border-[var(--creator-choice-inactive-border,var(--border-color))] hover:bg-transparent"
        : visited
          ? "border-[var(--border-hover)] bg-transparent hover:border-[var(--border-hover)] hover:bg-transparent"
          : "border-[var(--creator-card-border,var(--border-color))] bg-[var(--creator-card-bg,var(--surface-card))] hover:border-[var(--border-hover)]"
  );
};

function ChoiceCardContent({
  title,
  description,
  icon,
  accent,
  muted,
  visited,
  compact,
  layout
}: Omit<DsChoiceCardProps, "href" | "onClick" | "className">) {
  const inline = isInlineLayout(compact, layout);
  const selected = !!accent;
  const isMuted = !selected && !!muted;
  const isVisited = !selected && !!visited;

  if (inline) {
    return (
      <>
        <span
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-lg",
            layout === "inline" ? "h-8 w-8" : "h-6 w-6",
            selected
              ? "bg-white/15 text-[var(--ui-accent-btn-text)]"
              : isMuted
                ? "bg-transparent text-[var(--creator-choice-inactive-icon,var(--text-dimmer))]"
                : isVisited
                  ? "bg-transparent text-[var(--text-dim)]"
                  : "bg-[var(--creator-card-bg-inset,var(--surface-bg))] text-[var(--text-main)] group-hover:text-[var(--ui-accent)]"
          )}
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span
            className={cn(
              "block font-heading font-semibold leading-tight",
              layout === "inline" ? "truncate text-sm" : "text-[10px]",
              selected
                ? "text-[var(--ui-accent-btn-text)]"
                : isMuted
                  ? "text-[var(--creator-choice-inactive-text,var(--text-dimmer))]"
                  : isVisited
                    ? "text-[var(--text-dim)]"
                    : "text-[var(--text-dim)]"
            )}
          >
            {title}
          </span>
          {layout === "inline" && description ? (
            <span
              className={cn(
                "mt-0.5 hidden truncate text-xs leading-tight lg:block",
                selected
                  ? "text-[var(--ui-accent-btn-text)]/80"
                  : isMuted
                    ? "text-[var(--creator-choice-inactive-text,var(--text-dimmer))]"
                    : "text-[var(--text-dimmer)]"
              )}
            >
              {description}
            </span>
          ) : null}
        </span>
      </>
    );
  }

  return (
    <>
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-lg",
          "h-9 w-9",
          selected
            ? "bg-white/15 text-[var(--ui-accent-btn-text)]"
            : isMuted
              ? "bg-transparent text-[var(--creator-choice-inactive-icon,var(--text-dimmer))]"
              : isVisited
                ? "bg-transparent text-[var(--text-dim)]"
                : "bg-[var(--creator-card-bg-inset,var(--surface-bg))] text-[var(--text-main)] group-hover:text-[var(--ui-accent)]"
        )}
      >
        {icon}
      </span>
      <span
        className={cn(
          "mt-3 font-heading text-sm font-semibold",
          selected
            ? "text-[var(--ui-accent-btn-text)]"
            : isMuted
              ? "text-[var(--creator-choice-inactive-text,var(--text-dimmer))]"
              : isVisited
                ? "text-[var(--text-dim)]"
                : "text-[var(--text-dim)]"
        )}
      >
        {title}
      </span>
      {description ? (
        <span
          className={cn(
            "mt-1 text-xs leading-relaxed",
            selected
              ? "text-[var(--ui-accent-btn-text)]/80"
              : isMuted
                ? "text-[var(--creator-choice-inactive-text,var(--text-dimmer))]"
                : "text-[var(--text-dimmer)]"
          )}
        >
          {description}
        </span>
      ) : null}
    </>
  );
}

/** Card de escolha para modais simplificados (ex.: manual vs IA). */
export function DsChoiceCard({
  title,
  description = "",
  icon,
  accent,
  muted,
  visited,
  href,
  onClick,
  className,
  compact,
  layout = "stack"
}: DsChoiceCardProps) {
  const inline = isInlineLayout(compact, layout);
  const cardClasses = cn(
    cardClass(accent, muted, visited, compact, layout),
    inline && (layout === "inline" ? "ds-choice-card-inline" : "ds-choice-card-compact"),
    className
  );

  if (href) {
    return (
      <Link href={href} onClick={onClick} className={cardClasses}>
        <ChoiceCardContent
          title={title}
          description={description}
          icon={icon}
          accent={accent}
          muted={muted}
          visited={visited}
          compact={compact}
          layout={layout}
        />
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={cardClasses}>
      <ChoiceCardContent
        title={title}
        description={description}
        icon={icon}
        accent={accent}
        muted={muted}
        visited={visited}
        compact={compact}
        layout={layout}
      />
    </button>
  );
}
