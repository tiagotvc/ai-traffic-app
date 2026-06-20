"use client";

import { Link } from "@/i18n/navigation";

export function BrainBreadcrumb({
  title,
  parentHref = "/agency-brain"
}: {
  title: string;
  parentHref?: string;
}) {
  return (
    <nav className="mb-6 text-sm text-[var(--text-dim)]" aria-label="Breadcrumb">
      <Link href={parentHref} className="ui-link font-medium">
        Agency Brain
      </Link>
      <span className="mx-2 text-[var(--text-dimmer)]">/</span>
      <span className="text-[var(--text-dim)]">{title}</span>
    </nav>
  );
}
