// Secretarías del municipio — incluye metadata de display y vínculo con capas

export const SECRETARIAS = [
  {
    id: 'sig',
    name: 'Sec. de Información Geográfica',
    shortName: 'SIG',
    code: 'SIG',
    color: '#1A5F9B',
    description: 'Gestión territorial, catastro y análisis geoespacial completo del municipio.',
    layersKey: 'sig',   // 'sig' = todas las capas
    hasMapa: true,
    orden: 1
  },
  {
    id: 'planeacion',
    name: 'Secretaría de Planeación',
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
    id: 'ambiente',
    name: 'Secretaría de Ambiente',
    shortName: 'Ambiente',
    code: 'AMB',
    color: '#2E7D32',
    description: 'Zonas verdes, espacios públicos y equipamiento biosaludable.',
    layersKey: 'zonas_verdes',
    hasMapa: true,
    orden: 4
  },
  {
    id: 'educacion',
    name: 'Secretaría de Educación',
    shortName: 'Educación',
    code: 'EDU',
    color: '#E65100',
    description: 'Instituciones educativas, sedes y cobertura territorial.',
    layersKey: 'educacion',
    hasMapa: true,
    orden: 5
  },
  {
    id: 'desarrollo_social',
    name: 'Secretaría de Desarrollo Social',
    shortName: 'Desarrollo Social',
    code: 'DES',
    color: '#6A1B9A',
    description: 'Información Sisben, población y datos socioeconómicos por UBA.',
    layersKey: 'sisben',
    hasMapa: true,
    orden: 6
  },
  {
    id: 'gobierno',
    name: 'Secretaría de Gobierno',
    shortName: 'Gobierno',
    code: 'GOB',
    color: '#00695C',
    description: 'Equipamiento institucional, templos y sedes gubernamentales.',
    layersKey: 'equipo_institucional',
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
    id: 'cultura',
    name: 'Secretaría de Cultura',
    shortName: 'Cultura',
    code: 'CUL',
    color: '#AD1457',
    description: 'Espacios culturales, patrimonio y cobertura de eventos municipales.',
    layersKey: null,
    hasMapa: false,
    orden: 10
  },
  {
    id: 'deportes',
    name: 'Secretaría de Deportes',
    shortName: 'Deportes',
    code: 'DEP',
    color: '#00838F',
    description: 'Escenarios deportivos, parques y equipamiento recreativo.',
    layersKey: null,
    hasMapa: false,
    orden: 11
  },
  {
    id: 'transito',
    name: 'Secretaría de Tránsito',
    shortName: 'Tránsito',
    code: 'TRA',
    color: '#E64A19',
    description: 'Vías, semáforos, señalización y movilidad urbana.',
    layersKey: null,
    hasMapa: false,
    orden: 12
  },
  {
    id: 'seguridad',
    name: 'Secretaría de Seguridad',
    shortName: 'Seguridad',
    code: 'SEG',
    color: '#37474F',
    description: 'Cuadrantes de seguridad, cámaras y cobertura de vigilancia.',
    layersKey: null,
    hasMapa: false,
    orden: 13
  },
  {
    id: 'juridica',
    name: 'Secretaría Jurídica',
    shortName: 'Jurídica',
    code: 'JUR',
    color: '#4527A0',
    description: 'Predios en litigio, linderos y asuntos legales territoriales.',
    layersKey: null,
    hasMapa: false,
    orden: 14
  },
  {
    id: 'talento_humano',
    name: 'Talento Humano',
    shortName: 'Talento Humano',
    code: 'TH',
    color: '#5D4037',
    description: 'Distribución de funcionarios y sedes administrativas.',
    layersKey: null,
    hasMapa: false,
    orden: 15
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
