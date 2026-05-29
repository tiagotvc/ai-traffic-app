import type { ReactNode } from "react";

export function FormField({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <div className="ui-label">{label}</div>
      <div className="mt-1.5">{children}</div>
      {hint ? <p className="mt-1 text-[11px] text-slate-500">{hint}</p> : null}
    </div>
  );
}
