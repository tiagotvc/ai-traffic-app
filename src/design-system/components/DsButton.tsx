import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

type DsButtonVariant =
  | "primary"
  | "brand"
  | "accent"
  | "secondary"
  | "ghost"
  | "danger"
  | "meta";
type DsButtonSize = "xs" | "sm" | "md" | "lg";

type DsButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: DsButtonVariant;
  size?: DsButtonSize;
  /** Botão de ícone quadrado — ignora o padding de `size` e usa dimensão fixa. */
  iconOnly?: boolean;
};

const variantClass: Record<DsButtonVariant, string> = {
  primary: "ui-btn-primary",
  brand: "ui-btn-brand",
  accent: "ui-btn-accent",
  secondary: "ui-btn-secondary",
  ghost: "ui-btn-ghost",
  danger: "ui-btn-danger",
  meta: "ui-btn-meta"
};

const sizeClass: Record<DsButtonSize, string> = {
  xs: "px-2 py-1 text-xs",
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-sm"
};

/** Dimensão fixa para botões de ícone (quadrados), por tamanho. */
const iconOnlyClass: Record<DsButtonSize, string> = {
  xs: "h-7 w-7 p-0",
  sm: "h-8 w-8 p-0",
  md: "h-9 w-9 p-0",
  lg: "h-10 w-10 p-0"
};

export function DsButton({
  children,
  className,
  variant = "primary",
  size = "md",
  iconOnly = false,
  type = "button",
  ...props
}: DsButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        variantClass[variant],
        iconOnly ? iconOnlyClass[size] : sizeClass[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
