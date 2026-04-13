import { colorPct, pct } from './helpers';

// Barra de progreso — value: 0-100
export function BarPct({ value, color, height = 8 }) {
  const w   = Math.min(100, Math.max(0, parseFloat(value) || 0));
  const col = color || colorPct(w);
  return (
    <div className="pdm-bar-track" style={{ height }}>
      <div className="pdm-bar-fill" style={{ width: `${w}%`, background: col }} />
    </div>
  );
}

// Gauge SVG — value: 0-100
export function Gauge({ value, label, sub, color }) {
  const n   = Math.min(100, Math.max(0, parseFloat(value) || 0));
  const col = color || colorPct(n);
  const r   = 52;
  const circ = 2 * Math.PI * r;
  const dash = (n / 100) * circ;

  return (
    <div className="pdm-gauge">
      <div className="pdm-gauge-wrap">
        <svg width="136" height="136" viewBox="0 0 136 136">
          <circle cx="68" cy="68" r={r} fill="none" stroke="#e9ecef" strokeWidth="14" />
          <circle
            cx="68" cy="68" r={r}
            fill="none"
            stroke={col}
            strokeWidth="14"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeLinecap="round"
            transform="rotate(-90 68 68)"
          />
        </svg>
        <div className="pdm-gauge-center">
          <span className="pdm-gauge-value" style={{ color: col }}>{pct(n)}</span>
          <span className="pdm-gauge-label">{label}</span>
        </div>
      </div>
      {sub && <p className="pdm-gauge-sub">{sub}</p>}
    </div>
  );
}
