/** Minimal dependency-free SVG line chart. Draws `values` scaled to fit
 * the viewBox, with a filled area under the line for readability. */
export function LineChart({ values, width = 600, height = 180, color = "var(--accent)" }) {
  if (!values || values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const padding = 8;

  const points = values.map((v, i) => {
    const x = padding + (i / (values.length - 1)) * (width - padding * 2);
    const y = height - padding - ((v - min) / range) * (height - padding * 2);
    return [x, y];
  });

  const linePath = points.map((p, i) => (i === 0 ? `M ${p[0]},${p[1]}` : `L ${p[0]},${p[1]}`)).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1][0]},${height - padding} L ${points[0][0]},${height - padding} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="insight-chart" preserveAspectRatio="none">
      <path d={areaPath} fill={color} opacity="0.12" />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
}

/** Minimal dependency-free SVG bar chart for small labeled datasets like
 * per-class image counts. */
export function BarChart({ data, width = 600, height = 200, color = "var(--accent)" }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.value));
  const padding = 30;
  const barGap = 10;
  const barWidth = (width - padding * 2 - barGap * (data.length - 1)) / data.length;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="insight-chart">
      {data.map((d, i) => {
        const barHeight = (d.value / max) * (height - padding - 24);
        const x = padding + i * (barWidth + barGap);
        const y = height - padding - barHeight;
        return (
          <g key={d.label}>
            <rect x={x} y={y} width={barWidth} height={barHeight} fill={color} rx="2" />
            <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" className="insight-bar-value">
              {d.value}
            </text>
            <text
              x={x + barWidth / 2}
              y={height - padding + 16}
              textAnchor="middle"
              className="insight-bar-label"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}