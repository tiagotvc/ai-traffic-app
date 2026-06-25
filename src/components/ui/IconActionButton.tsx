"use client";

import { cn } from "@/lib/cn";

type IconActionButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: React.ReactNode;
  label: string;
  /** `accent` — CTA temático (âmbar light / roxo dark). `outline` — secundário. */
  variant?: "accent" | "outline" | "gradient";
};

export function IconActionButton({
  icon,
  label,
  variant = "accent",
  className,
  type = "button",
  ...props
}: IconActionButtonProps) {
  const isAccent = variant === "accent" || variant === "gradient";

  return (
    <button
      type={type}
      title={label}
      aria-label={label}
      className={cn(
        "ui-btn-responsive font-heading font-semibold",
        isAccent && "ui-btn-accent active:scale-95 hover:brightness-110",
        variant === "outline" && "ui-btn-secondary",
        className
      )}
      {...props}
    >
      {icon}
      <span className="ui-btn-responsive-label">{label}</span>
    </button>
  );
}
