// Re-exportar paletas desde fuente centralizada para uso en el mapa
export { UBA_PASTEL, PASTEL_BARRIOS } from '../../../constants/ubas';

// Color coroplético para mapa de calor Sisben — degradado lavanda → púrpura oscuro
export function getChoroplethColor(value, min, max) {
  const t = max === min ? 0.5 : Math.max(0, Math.min(1, (value - min) / (max - min)));
  const r = Math.round(243 - t * 169); // 243 → 74
  const g = Math.round(229 - t * 209); // 229 → 20
  const b = Math.round(245 - t * 105); // 245 → 140
  return [r, g, b];
}
