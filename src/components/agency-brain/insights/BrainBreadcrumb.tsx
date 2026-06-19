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
    <nav className="mb-6 text-sm text-slate-500" aria-label="Breadcrumb">
      <Link href={parentHref} className="font-medium text-violet-600 hover:text-violet-800">
        Agency Brain
      </Link>
      <span className="mx-2 text-slate-300">/</span>
      <span className="text-slate-700">{title}</span>
    </nav>
  );
}
