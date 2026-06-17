"use client";

import { useEffect, useState } from "react";

import type { FeedbackMessage } from "@/components/agency-brain/FeedbackBanner";

const AUTO_DISMISS_MS = 4500;

export function FeedbackSnackbar({ message }: { message: FeedbackMessage | null }) {
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState<FeedbackMessage | null>(null);

  useEffect(() => {
    if (!message) return;

    setCurrent(message);
    setVisible(true);

    const timer = window.setTimeout(() => {
      setVisible(false);
    }, AUTO_DISMISS_MS);

    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (visible || !current) return;

    const timer = window.setTimeout(() => setCurrent(null), 220);
    return () => window.clearTimeout(timer);
  }, [visible, current]);

  if (!current) return null;

  const styles =
    current.type === "ok"
      ? "border-emerald-300 bg-emerald-600 text-white shadow-emerald-500/30"
      : current.type === "warn"
        ? "border-amber-300 bg-amber-500 text-white shadow-amber-500/30"
        : "border-red-300 bg-red-600 text-white shadow-red-500/30";

  return (
    <div
      className={`pointer-events-none fixed bottom-5 left-1/2 z-50 max-w-md px-4 transition-all duration-200 sm:bottom-6 ${
        visible
          ? "-translate-x-1/2 translate-y-0 opacity-100"
          : "-translate-x-1/2 translate-y-2 opacity-0"
      }`}
      role="status"
      aria-live="polite"
    >
      <div
        className={`rounded-xl border px-4 py-2.5 text-sm font-medium shadow-lg ${styles}`}
      >
        {current.text}
      </div>
    </div>
  );
}
