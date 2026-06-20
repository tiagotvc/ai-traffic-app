import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export function DsTableShell({
  title,
  meta,
  children,
  className
}: {
  title?: string;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--surface-card)]",
        className
      )}
    >
      {title ? (
        <div
          className="flex items-center justify-between border-b border-[var(--border-color)] px-4 py-3"
          style={{ background: "var(--surface-thead)" }}
        >
          <h3 className="font-heading text-sm font-semibold text-[var(--text-main)]">{title}</h3>
          {meta}
        </div>
      ) : null}
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function DsTableHeadCell({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-widest text-[var(--text-dimmer)]",
        className
      )}
    >
      {children}
    </th>
  );
}

export function DsTableRow({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr
      className={cn(
        "border-b border-[var(--border-color)] transition-colors hover:bg-[var(--row-hover)]",
        className
      )}
    >
      {children}
    </tr>
  );
}
