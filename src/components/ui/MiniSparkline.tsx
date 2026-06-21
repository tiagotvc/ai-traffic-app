export function MiniSparkline({
  points,
  color = "#7c3aed",
  height = 36,
  width = 88,
  fullWidth = false
}: {
  points: number[];
  color?: string;
  height?: number;
  width?: number;
  /** Preenche 100% da largura do container — ideal para cards de relatório/PDF. */
  fullWidth?: boolean;
}) {
  const data = points.length > 1 ? points : [0, 0];
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const viewW = fullWidth ? 100 : width;
  const step = viewW / (data.length - 1);

  const coords = data
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  if (fullWidth) {
    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${viewW} ${height}`}
        preserveAspectRatio="none"
        className="block max-w-full"
        aria-hidden
      >
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          points={coords}
        />
      </svg>
    );
  }

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0" aria-hidden>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={coords}
      />
    </svg>
  );
}
