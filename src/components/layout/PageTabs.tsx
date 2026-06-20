export type PageTabItem<T extends string> = {
  key: T;
  label: string;
  badge?: string | number;
};

export function PageTabs<T extends string>({
  tabs,
  active,
  onChange
}: {
  tabs: PageTabItem<T>[];
  active: T;
  onChange: (key: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-[var(--border-color)] pb-0">
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`tab-transition -mb-px border-b-2 px-1 pb-2.5 text-sm font-medium transition ${
              isActive
                ? "border-[var(--amber-bright)] text-[var(--amber)]"
                : "border-transparent text-[var(--text-dim)] hover:border-[var(--border-hover)] hover:text-[var(--text-main)]"
            }`}
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
