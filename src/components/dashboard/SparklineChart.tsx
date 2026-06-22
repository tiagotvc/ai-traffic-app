import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";

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
      <ResponsiveContainer width="100%" height={48}>
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, fill: color, strokeWidth: 0 }}
            animationDuration={1200}
            animationEasing="ease-out"
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as { v: number; label: string };
              const display =
                formatValue?.(Number(point.v)) ?? String(point.v);
              return (
                <div
                  className="rounded-lg px-2.5 py-1.5 text-xs shadow-lg"
                  style={{
                    background: "var(--surface-card)",
                    border: "1px solid var(--border-hover)",
                    color: "var(--text-main)"
                  }}
                >
                  {point.label ? (
                    <p className="mb-0.5 text-[10px] text-[var(--text-dim)]">{point.label}</p>
                  ) : null}
                  <p className="font-semibold">{display}</p>
                </div>
              );
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
