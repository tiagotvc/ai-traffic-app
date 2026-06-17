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
    <div className="flex flex-wrap gap-6 border-b border-slate-200">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`-mb-px border-b-2 pb-2.5 text-sm font-medium transition ${
            active === tab.key
              ? "border-violet-600 text-violet-700"
              : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
          }`}
        >
          {tab.label}
          {tab.badge != null ? (
            <span className="ml-1 font-normal text-slate-400">({tab.badge})</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
