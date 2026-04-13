// Fuente única de verdad para datos, colores e IDs de UBAs
// Importar desde aquí en lugar de duplicar en cada componente

export const UBA_COLORS = {
  uba1: '#E53935',
  uba2: '#43A047',
  uba3: '#1E88E5',
  uba4: '#FB8C00',
  uba5: '#8E24AA',
  ubac: '#00ACC1',
};

export const UBA_ORDER = ['uba1', 'uba2', 'uba3', 'uba4', 'uba5', 'ubac'];

export const UBA_DATA = {
  uba1: { uba: 'UBA1', numero_predios: 2197, area_m2: 718315 },
  uba2: { uba: 'UBA2', numero_predios: 5959, area_m2: 1662210 },
  uba3: { uba: 'UBA3', numero_predios: 2805, area_m2: 1054055 },
  uba4: { uba: 'UBA4', numero_predios: 3258, area_m2: 902978 },
  uba5: { uba: 'UBA5', numero_predios: 1537, area_m2: 608186 },
  ubac: { uba: 'UBAC', numero_predios: 2028, area_m2: 1491423 },
};

// Colores pasteles por UBA (RGB) — para renderizado en OpenLayers
export const UBA_PASTEL = {
  uba1: [255, 182, 193],
  uba2: [180, 238, 180],
  uba3: [173, 216, 230],
  uba4: [255, 218, 185],
  uba5: [216, 191, 216],
  ubac: [175, 238, 238],
};

// Paleta de colores pasteles para barrios (RGB)
export const PASTEL_BARRIOS = [
  [255, 179, 186], [255, 223, 186], [255, 255, 186], [186, 255, 201],
  [186, 225, 255], [232, 186, 255], [255, 217, 186], [186, 255, 236],
  [255, 228, 186], [212, 186, 255], [201, 255, 229], [255, 179, 217],
  [179, 229, 255], [255, 229, 179], [217, 255, 179], [255, 204, 179],
  [204, 179, 255], [179, 255, 204], [255, 210, 210], [210, 255, 210],
];

// IDs de capas UBA (polígonos geográficos, no Sisben)
export const UBA_IDS = new Set(['uba1', 'uba2', 'uba3', 'uba4', 'uba5', 'ubac']);

// IDs de capas Sisben por UBA
export const SIS_UBA_IDS = new Set(['sis_uba1', 'sis_uba2', 'sis_uba3', 'sis_uba4', 'sis_uba5', 'sis_ubac']);

// Mapeo: layer ID sisben → ubaId para el endpoint /api/sisben/uba/:ubaId
export const SIS_UBA_MAP = {
  sis_uba1: 'uba1',
  sis_uba2: 'uba2',
  sis_uba3: 'uba3',
  sis_uba4: 'uba4',
  sis_uba5: 'uba5',
  sis_ubac: 'ubac',
};
