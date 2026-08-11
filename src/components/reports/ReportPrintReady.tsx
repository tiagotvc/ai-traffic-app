"use client";

import { useEffect, useState, type ReactNode } from "react";

function isReportContentReady(root: HTMLElement | null): boolean {
  if (!root) return false;
  if (root.querySelector('[data-report-creatives-loading="true"]')) return false;
  if (root.querySelector(".skeleton-shimmer")) return false;

  const charts = root.querySelectorAll(".recharts-wrapper");
  if (charts.length > 0) {
    const chartsReady = Array.from(charts).every((c) => (c as HTMLElement).offsetWidth > 48);
    if (!chartsReady) return false;
  }

  const images = Array.from(root.querySelectorAll("img"));
  if (images.some((img) => !img.complete)) return false;

  return true;
}

export function ReportPrintReady({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const start = Date.now();

    const tick = () => {
      if (cancelled) return;
      const root = document.getElementById("report-print-root");
      if (isReportContentReady(root)) {
        setReady(true);
        return;
      }
      if (Date.now() - start < 90_000) {
        window.dispatchEvent(new Event("resize"));
        window.setTimeout(tick, 300);
      } else {
        setReady(true);
      }
    };

    tick();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    // O relatório é peça entregue ao cliente: sempre claro, qualquer que seja o tema do app.
    // `data-theme="light"` no MESMO elemento do shell redefine os tokens para o subtree inteiro.
    <div
      data-report-print-ready={ready ? "true" : "false"}
      data-reports-shell
      data-theme="light"
      className="report-print-shell"
    >
      {children}
    </div>
  );
}
