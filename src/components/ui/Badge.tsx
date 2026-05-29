import type { ReactNode } from "react";

const variants = {
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-red-50 text-red-700 border-red-200",
  neutral: "bg-slate-100 text-slate-600 border-slate-200",
  brand: "bg-violet-50 text-violet-700 border-violet-200"
} as const;

export function Badge({
  children,
  variant = "neutral"
}: {
  children: ReactNode;
  variant?: keyof typeof variants;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${variants[variant]}`}
    >
      {children}
    </span>
  );
}
