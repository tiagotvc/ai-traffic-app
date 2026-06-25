import { cn } from "@/lib/cn";

export type DsUnderlineTabItem<T extends string> = {
  key: T;
  label: string;
  badge?: string | number;
};

export type DsUnderlineTabAccent = "amber" | "brand" | "violet";

/**
 * Sub-abas com underline — ex.: Plano | Limites | Faturamento dentro de Configurações.
 * `brand` / `violet` usam `--ui-accent` (âmbar no light, roxo no dark).
 */
export function DsUnderlineTabs<T extends string>({
  tabs,
  active,
  onChange,
  accent = "brand",
  className
}: {
  tabs: DsUnderlineTabItem<T>[];
  active: T;
  onChange: (key: T) => void;
  accent?: DsUnderlineTabAccent;
  className?: string;
}) {
  const useBrand = accent === "brand" || accent === "violet";
  const activeClass = useBrand
    ? "border-[var(--ui-accent)] text-[var(--ui-accent)]"
    : "border-[var(--amber-bright)] text-[var(--amber)]";

  return (
    <div className={cn("flex flex-wrap gap-4", className)}>
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={cn(
              "tab-transition border-b-2 px-0.5 pb-2 text-sm font-medium transition",
              isActive
                ? activeClass
                : "border-transparent text-[var(--text-dim)] hover:text-[var(--text-main)]"
            )}
          >
            {tab.label}
            {tab.badge != null ? (
              <span className="ml-1 font-normal text-[var(--text-dimmer)]">({tab.badge})</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
