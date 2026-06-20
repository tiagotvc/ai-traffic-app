"use client";

import { useTranslations } from "next-intl";

import { SCIENTIST_CATALOG } from "@/lib/labs/scientist-catalog";

function ScientistIcon({ path, className }: { path: string; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={path} />
    </svg>
  );
}

type ScientistPickerProps = {
  selected: string[];
  onToggle: (id: string) => void;
};

export function ScientistPicker({ selected, onToggle }: ScientistPickerProps) {
  const t = useTranslations("agencyBrain");

  return (
    <div
      className="rounded-xl border border-dashed border-[rgba(124,58,237,0.2)]/80 bg-gradient-to-b from-violet-50/40 to-slate-50/30 p-3 sm:p-4"
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, rgb(139 92 246 / 0.06) 1px, transparent 0)",
        backgroundSize: "20px 20px"
      }}
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {SCIENTIST_CATALOG.map((entry) => {
          const isSelected = selected.includes(entry.id);
          const label = t(entry.nameKey);
          const brief = t(entry.briefKey);
          const role = t(entry.roleKey);
          const description = t(entry.descKey);

          return (
            <div key={entry.id} className="group relative">
              <button
                type="button"
                onClick={() => onToggle(entry.id)}
                aria-pressed={isSelected}
                aria-label={`${label} — ${role}. ${brief}. ${description}`}
                title={description}
                className={[
                  "relative flex w-full flex-col items-center rounded-xl p-2.5 text-center transition-all duration-150",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1",
                  isSelected
                    ? `bg-gradient-to-br ${entry.gradient} text-white shadow-md ring-2 ring-offset-1 ${entry.accent}`
                    : "bg-white ring-1 ring-slate-200/90 hover:ring-violet-200 hover:shadow-sm"
                ].join(" ")}
              >
                {!isSelected && (
                  <div
                    className={`pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br ${entry.gradient} opacity-[0.06] transition-opacity group-hover:opacity-[0.12]`}
                  />
                )}

                {isSelected && (
                  <span className="absolute -top-1.5 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-emerald-500 px-1.5 py-px text-[8px] font-bold uppercase tracking-wide text-white shadow">
                    {t("labsScientistOnTeam")}
                  </span>
                )}

                <div
                  className={[
                    "relative flex h-8 w-8 items-center justify-center rounded-lg shadow-sm",
                    isSelected
                      ? "bg-white/20 text-white"
                      : `bg-gradient-to-br ${entry.gradient} text-white`
                  ].join(" ")}
                >
                  <ScientistIcon path={entry.iconPath} className="h-4 w-4" />
                </div>

                <span
                  className={[
                    "relative mt-1.5 rounded px-1 py-px text-[8px] font-semibold uppercase tracking-wide",
                    isSelected ? "bg-white/15 text-white/90" : "bg-[var(--surface-thead)] text-[var(--text-dim)]"
                  ].join(" ")}
                >
                  {role}
                </span>

                <p
                  className={[
                    "relative mt-1 text-xs font-semibold leading-tight",
                    isSelected ? "text-white" : "text-[var(--text-main)]"
                  ].join(" ")}
                >
                  {label}
                </p>

                <p
                  className={[
                    "relative mt-0.5 line-clamp-2 text-[10px] leading-snug",
                    isSelected ? "text-white/80" : "text-[var(--text-dim)]"
                  ].join(" ")}
                >
                  {brief}
                </p>

                <span
                  className={[
                    "relative mt-1 rounded-full px-1.5 py-px text-[10px] font-medium tabular-nums",
                    isSelected ? "bg-white/20 text-white" : "bg-[var(--surface-thead)] text-[var(--text-dim)]"
                  ].join(" ")}
                >
                  {entry.credits} cr
                </span>

                {isSelected && (
                  <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white/25 text-white">
                    <svg className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                )}
              </button>

              <div
                role="tooltip"
                className={[
                  "pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-30 w-48 -translate-x-1/2",
                  "rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-left text-[11px] leading-snug text-white shadow-xl",
                  "opacity-0 transition-opacity duration-150 group-hover:opacity-100",
                  "before:absolute before:left-1/2 before:top-full before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-slate-900"
                ].join(" ")}
              >
                <p className="text-[9px] font-semibold uppercase tracking-wide text-violet-300">{role}</p>
                <p className="mt-0.5 font-semibold text-white/95">{label}</p>
                <p className="mt-1 text-white/75">{description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
