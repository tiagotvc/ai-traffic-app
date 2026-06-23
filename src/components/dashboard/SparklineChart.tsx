import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";

import { PremiumChartTooltip } from "@/components/charts/PremiumChartTooltip";
import { premiumActiveDot, premiumRechartsTooltipProps } from "@/lib/dashboard/premium-chart-theme";

interface Props {
  data: number[];
  labels?: string[];
  color: string;
  formatValue?: (value: number) => string;
}

export function SparklineChart({ data, labels, color, formatValue }: Props) {
  const chartData = data.map((v, i) => ({
    i,
    v,
    label: labels?.[i] ?? ""
  }));

  if (chartData.length < 2) {
    return (
      <div
        className="flex h-full min-h-[48px] items-center justify-center rounded text-[10px]"
        style={{ color: "var(--text-dimmer)" }}
      >
        —
      </div>
    );
  }

  return (
    <div className="h-full min-h-[48px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={premiumActiveDot(color)}
            animationDuration={1200}
            animationEasing="ease-out"
          />
          <Tooltip
            {...premiumRechartsTooltipProps}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as { v: number; label: string };
              const display = formatValue?.(Number(point.v)) ?? String(point.v);
              return (
                <PremiumChartTooltip title={point.label || undefined}>
                  <p className="font-semibold">{display}</p>
                </PremiumChartTooltip>
              );
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
