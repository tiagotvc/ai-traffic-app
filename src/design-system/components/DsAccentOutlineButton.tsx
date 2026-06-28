import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

export const dsAccentOutlineClass =
  "ui-btn-accent-outline inline-flex shrink-0 items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold disabled:opacity-60";

type SharedProps = {
  children: ReactNode;
  className?: string;
};

/**
 * CTA outline com cor de accent temático (`--ui-accent`: âmbar no light, roxo no dark).
 * Ex.: "Comprar limites →", "Convidar membro".
 */
export function DsAccentOutlineButton({
  children,
  className,
  ...props
}: SharedProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={cn(dsAccentOutlineClass, className)} {...props}>
      {children}
    </button>
  );
}

export function DsAccentOutlineLink({
  children,
  className,
  ...props
}: SharedProps & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a className={cn(dsAccentOutlineClass, className)} {...props}>
      {children}
    </a>
  );
}
