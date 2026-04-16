// Secretarías del municipio — incluye metadata de display y vínculo con capas

export const SECRETARIAS = [
  {
    id: 'sig',
    name: 'Sistema de Información Geográfica',
    shortName: 'SIG',
    code: 'SIG',
    color: '#1A5F9B',
    description: 'Gestión territorial, catastro y análisis geoespacial completo del municipio.',
    layersKey: 'sig',
    hasMapa: true,
    orden: 1
  },
  {
    id: 'planeacion',
    name: 'Secretaría de Planeación, Ordenamiento Territorial y Vivienda',
    shortName: 'Planeación',
    code: 'PLA',
    color: '#1565C0',
    description: 'Ordenamiento territorial, predios urbanos, UBAs y usos de suelo.',
    layersKey: 'planeacion',
    hasMapa: true,
    orden: 2
  },
  {
    id: 'obras',
    name: 'Secretaría de Infraestructura',
    shortName: 'Infraestructura',
    code: 'OBR',
    color: '#4E342E',
    description: 'Alumbrado público, pavimentación y obras de infraestructura vial.',
    layersKey: 'servicios_publicos',
    hasMapa: true,
    orden: 3
  },
  {
    id: 'gobierno',
    name: 'Secretaría de Gobierno, Paz y Convivencia',
    shortName: 'Gobierno',
    code: 'GOB',
    color: '#00695C',
    description: 'Equipamiento institucional, templos y sedes gubernamentales.',
    layersKey: 'equipo_institucional',
    hasMapa: true,
    orden: 4
  },
  {
    id: 'educacion',
    name: 'Secretaría de Educación y Cultura',
    shortName: 'Educación y Cultura',
    code: 'EDU',
    color: '#E65100',
    description: 'Instituciones educativas, sedes y cobertura territorial.',
    layersKey: 'educacion',
    hasMapa: true,
    orden: 5
  },
  {
    id: 'desarrollo_social',
    name: 'Secretaría de Bienestar Social y Participación Comunitaria',
    shortName: 'Bienestar Social',
    code: 'DES',
    color: '#6A1B9A',
    description: 'Información Sisben, población y datos socioeconómicos por UBA.',
    layersKey: 'sisben',
    hasMapa: true,
    orden: 6
  },
  {
    id: 'ambiente',
    name: 'Secretaría de Fomento Económico y Agroambiental',
    shortName: 'Fomento Económico',
    code: 'AMB',
    color: '#2E7D32',
    description: 'Fomento económico, agroambiental, zonas verdes y espacios públicos.',
    layersKey: 'zonas_verdes',
    hasMapa: true,
    orden: 7
  },
  {
    id: 'salud',
    name: 'Secretaría de Salud',
    shortName: 'Salud',
    code: 'SAL',
    color: '#B71C1C',
    description: 'Infraestructura de salud, IPS y cobertura de servicios médicos.',
    layersKey: null,
    hasMapa: false,
    orden: 8
  },
  {
    id: 'hacienda',
    name: 'Secretaría de Hacienda',
    shortName: 'Hacienda',
    code: 'HAC',
    color: '#1B5E20',
    description: 'Avalúos catastrales, predios tributarios y cartografía fiscal.',
    layersKey: null,
    hasMapa: false,
    orden: 9
  },
  {
    id: 'deportes',
    name: 'Instituto Municipal para el Deporte y la Recreación',
    shortName: 'Deporte y Recreación',
    code: 'DEP',
    color: '#00838F',
    description: 'Escenarios deportivos, parques y equipamiento recreativo.',
    layersKey: null,
    hasMapa: false,
    orden: 10
  },
  {
    id: 'transito',
    name: 'Secretaría de Movilidad',
    shortName: 'Movilidad',
    code: 'MOV',
    color: '#E64A19',
    description: 'Vías, semáforos, señalización y movilidad urbana.',
    layersKey: null,
    hasMapa: false,
    orden: 11
  },
  {
    id: 'gestion_riesgo',
    name: 'Oficina de Gestión del Riesgo de Desastres',
    shortName: 'Gestión del Riesgo',
    code: 'GRD',
    color: '#37474F',
    description: 'Prevención, atención y recuperación ante desastres y emergencias.',
    layersKey: null,
    hasMapa: false,
    orden: 12
  },
  {
    id: 'talento_humano',
    name: 'Departamento Administrativo de Desarrollo Institucional',
    shortName: 'Desarrollo Institucional',
    code: 'DAD',
    color: '#5D4037',
    description: 'Desarrollo institucional, talento humano y gestión administrativa.',
    layersKey: null,
    hasMapa: false,
    orden: 13
  },
  {
    id: 'merquilichao',
    name: 'Merquilichao',
    shortName: 'Merquilichao',
    code: 'MER',
    color: '#F57F17',
    description: 'Plaza de mercado y gestión de comercio municipal.',
    layersKey: null,
    hasMapa: false,
    orden: 14
  }
];

export function getSecretariaById(id) {
  return SECRETARIAS.find(s => s.id === id);
}

export function getSecretariaByCode(code) {
  return SECRETARIAS.find(s => s.code === code);
}

export function getSecretariasConMapa() {
  return SECRETARIAS.filter(s => s.hasMapa).sort((a, b) => a.orden - b.orden);
}

export function getSecretariasSinMapa() {
  return SECRETARIAS.filter(s => !s.hasMapa).sort((a, b) => a.orden - b.orden);
}

export default SECRETARIAS;
