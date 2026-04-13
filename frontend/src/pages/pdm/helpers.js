// Formatea valor 0-100 como porcentaje
export function pct(val) {
  const n = parseFloat(val);
  return isNaN(n) ? '—' : `${Math.round(n * 10) / 10}%`;
}

// Formatea valor 0-1 como porcentaje
export function pct01(val) {
  const n = parseFloat(val);
  return isNaN(n) ? '—' : `${Math.round(n * 1000) / 10}%`;
}

// Formatea miles de millones COP
export function fmtB(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return '—';
  if (n >= 1000) return `$${(n / 1000).toFixed(2)} billones`;
  return `$${n.toFixed(1)} mil millones`;
}

// Color según avance en escala 0-100
export function colorPct(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return 'var(--pdm-gray)';
  if (n >= 80)  return 'var(--pdm-green)';
  if (n >= 50)  return 'var(--pdm-amber)';
  return 'var(--pdm-red)';
}

// Estado de meta por avance físico (0-1)
export function estadoMeta(fisico) {
  const n = parseFloat(fisico);
  if (isNaN(n) || fisico === null) return { label: 'Sin dato', cls: 'estado-sin-dato' };
  if (n >= 0.8) return { label: 'En meta',    cls: 'estado-alta' };
  if (n >= 0.5) return { label: 'En proceso', cls: 'estado-media' };
  return          { label: 'Rezagada',    cls: 'estado-baja' };
}
