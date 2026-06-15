"use client";

type FeedbackMessage = { type: "ok" | "err"; text: string };

export function FeedbackBanner({ message }: { message: FeedbackMessage | null }) {
  if (!message) return null;

  return (
    <div
      className={`rounded-lg border px-4 py-3 text-sm ${
        message.type === "ok"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-800"
      }`}
      role="status"
    >
      {message.text}
    </div>
  );
}

export type { FeedbackMessage };
