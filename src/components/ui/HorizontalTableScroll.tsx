import type { ReactNode } from "react";

/** Wrapper com scroll horizontal visível e sombra lateral indicando mais conteúdo. */
export function HorizontalTableScroll({
  children,
  className = ""
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-x-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-slate-100 ${className}`}
      style={{
        maskImage:
          "linear-gradient(to right, black calc(100% - 24px), transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to right, black calc(100% - 24px), transparent 100%)"
      }}
    >
      {children}
    </div>
  );
}
