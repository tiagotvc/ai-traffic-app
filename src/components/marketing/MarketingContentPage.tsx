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
    <div className="marketing-section">
      <div className="mx-auto max-w-3xl space-y-10">
        <header className="text-center">
          {badge ? <p className="marketing-section-title">{badge}</p> : null}
          <h1 className="marketing-section-heading">{title}</h1>
          {subtitle ? (
            <p className="marketing-section-sub mx-auto max-w-2xl">{subtitle}</p>
          ) : null}
        </header>
        {children}
      </div>
    </div>
  );
}

export function MarketingContentCard({ children }: { children: ReactNode }) {
  return <div className="marketing-card p-6 sm:p-8">{children}</div>;
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
      <h2 className="font-heading text-lg font-semibold text-[var(--text-main)]">{title}</h2>
      <div className="text-sm leading-relaxed text-[var(--text-dim)]">{children}</div>
    </section>
  );
}
