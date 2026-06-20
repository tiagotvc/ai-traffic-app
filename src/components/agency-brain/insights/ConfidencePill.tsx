"use client";

export function ConfidencePill({
  score,
  variant = "text"
}: {
  score: number;
  variant?: "text" | "bar";
}) {
  if (variant === "bar") {
    return (
      <div
        className="h-1.5 w-16 overflow-hidden rounded-full"
        style={{ background: "var(--border-hover)" }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${score}%`,
            background:
              score >= 85
                ? "linear-gradient(90deg,#FACC15,#f5a623)"
                : score >= 70
                  ? "#4f46e5"
                  : "var(--text-dimmer)"
          }}
        />
      </div>
    );
  }

  return (
    <span className="text-sm font-semibold tabular-nums text-[var(--text-main)]">{score}%</span>
  );
}
