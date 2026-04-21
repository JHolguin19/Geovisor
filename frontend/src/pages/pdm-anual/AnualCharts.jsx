/**
 * AnualCharts — SVG charts for PDM Anual dashboard
 */

// ── DonutChart ────────────────────────────────────────────────────────────────

export function DonutChart({ segments, size = 160, thickness = 28 }) {
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  const center = size / 2;
  const total = segments.reduce((s, seg) => s + (seg.value || 0), 0);

  let offset = 0;
  const arcs = segments.map((seg, i) => {
    const pct = total > 0 ? seg.value / total : 0;
    const dash = pct * circ;
    const arc = (
      <circle
        key={i}
        cx={center} cy={center} r={r}
        fill="none"
        stroke={seg.color}
        strokeWidth={thickness}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={-offset}
        transform={`rotate(-90 ${center} ${center})`}
      />
    );
    offset += dash;
    return arc;
  });

  return (
    <div className="pdm-a-donut-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={center} cy={center} r={r} fill="none" stroke="#e9ecef" strokeWidth={thickness} />
        {arcs}
      </svg>
      <div className="pdm-a-donut-center">
        <span className="pdm-a-donut-total">{total}</span>
        <span className="pdm-a-donut-label">metas</span>
      </div>
    </div>
  );
}

// ── HBarChart ─────────────────────────────────────────────────────────────────

export function HBarChart({ bars, maxValue }) {
  const max = maxValue || Math.max(...bars.map(b => b.value || 0), 1);

  return (
    <div className="pdm-a-hbar-chart">
      {bars.map((bar, i) => {
        const w = Math.max(2, (bar.value / max) * 100);
        return (
          <div key={i} className="pdm-a-hbar-row">
            <span className="pdm-a-hbar-label">{bar.label}</span>
            <div className="pdm-a-hbar-track">
              <div
                className="pdm-a-hbar-fill"
                style={{ width: `${w}%`, background: bar.color }}
              />
            </div>
            <span className="pdm-a-hbar-value" style={{ color: bar.color }}>{bar.value}</span>
          </div>
        );
      })}
    </div>
  );
}
