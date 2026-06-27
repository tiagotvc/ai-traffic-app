"use client";

/** Smooth confidence-style gradient bar (red → yellow → orange → green). */
export function CampaignCreatorScoreBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));

  return (
    <div className="relative h-2 overflow-hidden rounded-full">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to right, rgb(239 68 68 / 0.95), rgb(250 204 21 / 0.95), rgb(251 146 60 / 0.95), rgb(16 185 129 / 0.95))"
        }}
        aria-hidden
      />
      <div
        className="absolute inset-y-0 right-0 bg-[var(--creator-card-bg,var(--surface-card))] transition-all duration-300"
        style={{ width: `${100 - pct}%` }}
        aria-hidden
      />
    </div>
  );
}
