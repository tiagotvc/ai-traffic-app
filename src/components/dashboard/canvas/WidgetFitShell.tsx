"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/cn";

/**
 * Shell that shrink-wraps widget chrome + content and reports measured height
 * so the canvas grid can allocate the correct number of rows.
 */
export function WidgetFitShell({
  children,
  enabled,
  onMeasure,
  className,
  style
}: {
  children: React.ReactNode;
  enabled: boolean;
  onMeasure?: (heightPx: number) => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onMeasureRef = useRef(onMeasure);
  onMeasureRef.current = onMeasure;

  useEffect(() => {
    if (!enabled || !onMeasureRef.current) return;

    const el = ref.current;
    if (!el) return;

    let frame = 0;
    const report = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const height = el.getBoundingClientRect().height;
        if (height > 0) onMeasureRef.current?.(height);
      });
    };

    report();
    const observer = new ResizeObserver(report);
    observer.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [enabled]);

  return (
    <div
      ref={ref}
      className={cn(enabled && "dashboard-widget--fit-content h-auto max-h-none", className)}
      style={style}
    >
      {children}
    </div>
  );
}
