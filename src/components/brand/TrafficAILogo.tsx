type LogoSize = "sm" | "md" | "lg";

const SIZES: Record<LogoSize, { box: string; text: string; sub: string; mark: string }> = {
  sm: { box: "h-9 w-9 rounded-xl text-base", text: "text-sm", sub: "text-[10px]", mark: "text-base" },
  md: { box: "h-11 w-11 rounded-2xl text-xl", text: "text-sm", sub: "text-xs", mark: "text-xl" },
  lg: { box: "h-14 w-14 rounded-2xl text-2xl", text: "text-base", sub: "text-xs", mark: "text-2xl" }
};

export function TrafficAILogo({
  size = "md",
  showText = true,
  productLabel,
  variant = "dark"
}: {
  size?: LogoSize;
  showText?: boolean;
  productLabel?: string;
  variant?: "dark" | "light";
}) {
  const s = SIZES[size];
  const isDark = variant === "dark";

  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex shrink-0 items-center justify-center font-bold shadow-lg ${s.box} ${
          isDark
            ? "bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-violet-500/30 ring-1 ring-white/20"
            : "bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-violet-600/25 ring-1 ring-violet-200/50"
        }`}
      >
        <span className={s.mark}>∞</span>
      </div>
      {showText ? (
        <div>
          <div
            className={`font-bold tracking-wide ${s.text} ${
              isDark ? "text-white" : "text-slate-900"
            }`}
          >
            Traffic AI
          </div>
          {productLabel ? (
            <div
              className={`${s.sub} ${isDark ? "text-violet-200/80" : "text-slate-500"}`}
            >
              {productLabel}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
