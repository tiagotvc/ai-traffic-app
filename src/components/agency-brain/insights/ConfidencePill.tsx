"use client";

export function ConfidencePill({ score }: { score: number }) {
  return (
    <span className="text-sm font-semibold tabular-nums text-slate-800">{score}%</span>
  );
}
