import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

type DsButtonVariant = "primary" | "brand" | "accent" | "secondary" | "ghost" | "danger";
type DsButtonSize = "sm" | "md" | "lg";

type DsButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: DsButtonVariant;
  size?: DsButtonSize;
};

const variantClass: Record<DsButtonVariant, string> = {
  primary: "ui-btn-primary",
  brand: "ui-btn-brand",
  accent: "ui-btn-accent",
  secondary: "ui-btn-secondary",
  ghost: "ui-btn-ghost",
  danger: "ui-btn-danger"
};

const sizeClass: Record<DsButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-sm"
};

export function DsButton({
  children,
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: DsButtonProps) {
  return (
    <button
      type={type}
      className={cn(variantClass[variant], sizeClass[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}
