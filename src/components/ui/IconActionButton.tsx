"use client";

import { cn } from "@/lib/cn";

type IconActionButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: React.ReactNode;
  label: string;
  variant?: "gradient" | "outline";
};

export function IconActionButton({
  icon,
  label,
  variant = "gradient",
  className,
  type = "button",
  ...props
}: IconActionButtonProps) {
  return (
    <button
      type={type}
      title={label}
      aria-label={label}
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold transition-all duration-200",
        variant === "gradient"
          ? "shadow-md hover:brightness-110 active:scale-95"
          : "border hover:bg-[var(--row-hover)]",
        className
      )}
      style={
        variant === "gradient"
          ? { background: "linear-gradient(135deg, #f5a623, #e8920d)", color: "#0f1419" }
          : { borderColor: "var(--border-color)", color: "var(--text-dim)" }
      }
      {...props}
    >
      {icon}
    </button>
  );
}
