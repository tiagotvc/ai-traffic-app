import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { Link } from "@/i18n/navigation";

type DsChoiceCardProps = {
  title: string;
  description?: string;
  icon: ReactNode;
  /** Destaque com accent temático (âmbar light / roxo dark). */
  accent?: boolean;
  href?: string;
  onClick?: () => void;
  className?: string;
  /** Layout compacto — só ícone + título (mobile/tablet). */
  compact?: boolean;
};

const cardClass = (accent?: boolean, compact?: boolean) =>
  cn(
    "group flex flex-col rounded-xl border text-left transition",
    compact ? "items-center p-2.5 text-center" : "p-4",
    accent
      ? "border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] hover:border-[var(--ui-accent-border-strong)] hover:bg-[var(--ui-accent-hover)]"
      : "border-[var(--border-color)] hover:border-[var(--ui-accent-border)] hover:bg-[var(--ui-accent-hover)]"
  );

function ChoiceCardContent({
  title,
  description,
  icon,
  accent,
  compact
}: Omit<DsChoiceCardProps, "href" | "onClick" | "className">) {
  return (
    <>
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-lg",
          compact ? "h-7 w-7" : "h-9 w-9",
          accent
            ? "bg-[var(--ui-accent-muted-strong)] text-[var(--ui-accent)]"
            : "bg-[var(--surface-bg)] text-[var(--text-main)] group-hover:text-[var(--ui-accent)]"
        )}
      >
        {icon}
      </span>
      <span
        className={cn(
          "font-heading font-semibold text-[var(--text-main)]",
          compact ? "mt-1.5 text-[11px] leading-tight" : "mt-3 text-sm"
        )}
      >
        {title}
      </span>
      {!compact && description ? (
        <span className="mt-1 text-xs leading-relaxed text-[var(--text-dim)]">{description}</span>
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
  href,
  onClick,
  className,
  compact
}: DsChoiceCardProps) {
  if (href) {
    return (
      <Link href={href} onClick={onClick} className={cn(cardClass(accent, compact), className)}>
        <ChoiceCardContent
          title={title}
          description={description}
          icon={icon}
          accent={accent}
          compact={compact}
        />
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={cn(cardClass(accent, compact), className)}>
      <ChoiceCardContent
        title={title}
        description={description}
        icon={icon}
        accent={accent}
        compact={compact}
      />
    </button>
  );
}
