"use client";

import type { ReactNode } from "react";

export function AgencyBrainEmptyGuide({
  title,
  description,
  steps
}: {
  title: string;
  description: string;
  steps: string[];
}) {
  return (
    <div className="ui-card p-8 text-center">
      <p className="text-sm font-semibold text-[var(--text-main)]">{title}</p>
      <p className="mt-1 text-sm text-[var(--text-dim)]">{description}</p>
      {steps.length > 0 ? (
        <ol className="mx-auto mt-4 max-w-md space-y-2 text-left text-xs text-[var(--text-dim)]">
          {steps.map((step, i) => (
            <li key={step} className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[rgba(124,58,237,0.1)] text-[10px] font-bold text-violet-700">
                {i + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

export function AgencyBrainEmptyGuideActions({ children }: { children: ReactNode }) {
  return <div className="mt-4 flex flex-wrap justify-center gap-2">{children}</div>;
}
