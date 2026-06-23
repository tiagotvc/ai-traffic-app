import type { ReactNode } from "react";

export function MarketingContentPage({
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
    <div className="px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-3xl space-y-10">
        <header className="text-center">
          {badge ? (
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-400/90">{badge}</p>
          ) : null}
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{title}</h1>
          {subtitle ? (
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-violet-200/70">{subtitle}</p>
          ) : null}
        </header>
        {children}
      </div>
    </div>
  );
}

export function MarketingContentCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">{children}</div>
  );
}

export function MarketingContentSection({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-heading text-lg font-semibold text-white">{title}</h2>
      <div className="text-sm leading-relaxed text-violet-200/75">{children}</div>
    </section>
  );
}
