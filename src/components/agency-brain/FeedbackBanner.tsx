"use client";

type FeedbackMessage = { type: "ok" | "err" | "warn"; text: string };

export function FeedbackBanner({ message }: { message: FeedbackMessage | null }) {
  if (!message) return null;

  const styles =
    message.type === "ok"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : message.type === "warn"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-red-200 bg-red-50 text-red-800";

  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${styles}`} role="status">
      {message.text}
    </div>
  );
}

export type { FeedbackMessage };
