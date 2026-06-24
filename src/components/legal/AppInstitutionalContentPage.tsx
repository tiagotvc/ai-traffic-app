import type { ReactNode } from "react";

export function AppInstitutionalContentPage({
  badge,
  title,
  subtitle,
  children
}: {
  badge?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-8">
      <header>
        {badge ? (
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--violet-bright)]">
            {badge}
          </p>
        ) : null}
        <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--text-main)] sm:text-3xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--text-dim)]">{subtitle}</p>
        ) : null}
      </header>
      {children}
    </div>
  );
}

export function AppInstitutionalCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-card)] p-5 sm:p-6">
      {children}
    </div>
  );
}

export function AppInstitutionalSection({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-heading text-base font-semibold text-[var(--text-main)]">{title}</h2>
      <div className="text-sm leading-relaxed text-[var(--text-dim)]">{children}</div>
    </section>
  );
}
