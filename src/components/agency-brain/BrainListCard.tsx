"use client";

import { useState, type ReactNode } from "react";

import { CreatedAtMeta } from "@/components/agency-brain/CreatedAtMeta";

export function BrainListCard({
  title,
  badges,
  createdAt,
  updatedAt,
  children,
  defaultExpanded = false
}: {
  title: string;
  badges?: ReactNode;
  createdAt: string;
  updatedAt?: string | null;
  children?: ReactNode;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const hasBody = Boolean(children);

  return (
    <div className="ui-card overflow-hidden">
      <div
        className={`flex flex-wrap items-start justify-between gap-3 ${expanded ? "p-4" : "p-3"}`}
      >
        <button
          type="button"
          className={`min-w-0 flex-1 text-left ${hasBody ? "cursor-pointer" : "cursor-default"}`}
          onClick={() => hasBody && setExpanded((v) => !v)}
          aria-expanded={hasBody ? expanded : undefined}
          disabled={!hasBody}
        >
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={`font-semibold text-slate-900 ${expanded ? "" : "truncate max-w-md"}`}>
              {title}
            </h3>
            {badges}
          </div>
          {!expanded ? (
            <CreatedAtMeta createdAt={createdAt} updatedAt={updatedAt} className="mt-1" />
          ) : null}
        </button>
        {hasBody ? (
          <button
            type="button"
            className="flex-shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "collapse" : "expand"}
          >
            <svg
              className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        ) : null}
      </div>
      {expanded && children ? (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3">
          <CreatedAtMeta createdAt={createdAt} updatedAt={updatedAt} className="mb-2" />
          {children}
        </div>
      ) : null}
    </div>
  );
}
