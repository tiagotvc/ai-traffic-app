"use client";

/** Smooth confidence-style gradient bar (red → yellow → orange → green). */
export function CampaignCreatorScoreBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));

  return (
    <div className="relative h-2 overflow-hidden rounded-full">
      <div
        className="absolute inset-0 campaign-creator-score-gradient"
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
