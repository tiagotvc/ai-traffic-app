import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";

interface Props {
  data: number[];
  color: string;
}

export function SparklineChart({ data, color }: Props) {
  const chartData = data.map((v, i) => ({ i, v }));

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
            if (active && payload && payload.length) {
              return (
                <div
                  className="rounded px-2 py-1 text-xs"
                  style={{
                    background: "var(--surface-card)",
                    border: "1px solid var(--border-hover)",
                    color: "var(--text-main)"
                  }}
                >
                  {String(payload[0].value)}
                </div>
              );
            }
            return null;
          }}
        />
      </LineChart>
    </ResponsiveContainer>
    </div>
  );
}
