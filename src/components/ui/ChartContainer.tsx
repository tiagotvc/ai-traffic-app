"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import { ResponsiveContainer } from "recharts";

type ChartContainerProps = {
  /** Altura em px ou classe Tailwind (ex. `h-56`). */
  height: number | string;
  className?: string;
  children: ReactElement;
};

/**
 * Evita o warning do Recharts "width(-1) height(-1)" medindo o pai antes de montar o gráfico.
 */
export function ChartContainer({ height, className = "", children }: ChartContainerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) setSize({ w, h });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isNumericHeight = typeof height === "number";

  return (
    <div
      ref={ref}
      className={`report-chart-wrap relative isolate w-full min-w-0 overflow-hidden ${isNumericHeight ? "" : height} ${className}`}
      style={isNumericHeight ? { height } : undefined}
    >
      {size ? (
        <ResponsiveContainer width={size.w} height={size.h}>
          {children}
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}
