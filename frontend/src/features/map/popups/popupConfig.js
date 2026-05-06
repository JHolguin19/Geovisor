import { ALUMBRADO_WFS } from '../../../constants/alumbrado';

// Re-exportar para uso en hooks de mapa
export { ALUMBRADO_WFS };

// Orden de prioridad para GetFeatureInfo (igual que el aplicativo original)
export const QUERY_PRIORITY = [
  // 1. Uso de suelo — columnas estandarizadas en BD
  { id: 'uso_estanco',      props: (p) => `<strong>🏢 Establecimiento:</strong> ${p.nombre_establecimiento || '—'}<br>📍 <strong>Dirección:</strong> ${p.direccion || '—'}<br>🏷️ <strong>Tipo:</strong> ${p.tipo_establecimiento || '—'}` },
  { id: 'uso_discotecas',   props: (p) => `<strong>🏢 Establecimiento:</strong> ${p.nombre_establecimiento || '—'}<br>📍 <strong>Dirección:</strong> ${p.direccion || '—'}<br>🏷️ <strong>Tipo:</strong> ${p.tipo_establecimiento || '—'}` },
  { id: 'uso_droguerias',   props: (p) => `<strong>🏢 Establecimiento:</strong> ${p.nombre_establecimiento || '—'}<br>📍 <strong>Dirección:</strong> ${p.direccion || '—'}<br>🏷️ <strong>Tipo:</strong> ${p.tipo_establecimiento || '—'}` },
  { id: 'uso_ferreterias',  props: (p) => `<strong>🏢 Establecimiento:</strong> ${p.nombre_establecimiento || '—'}<br>📍 <strong>Dirección:</strong> ${p.direccion || '—'}<br>🏷️ <strong>Tipo:</strong> ${p.tipo_establecimiento || '—'}` },
  { id: 'uso_ips',          props: (p) => `<strong>🏢 Establecimiento:</strong> ${p.nombre_establecimiento || '—'}<br>📍 <strong>Dirección:</strong> ${p.direccion || '—'}<br>🏷️ <strong>Tipo:</strong> ${p.tipo_establecimiento || '—'}` },
  { id: 'uso_restaurantes', props: (p) => `<strong>🏢 Establecimiento:</strong> ${p.nombre_establecimiento || '—'}<br>📍 <strong>Dirección:</strong> ${p.direccion || '—'}<br>🏷️ <strong>Tipo:</strong> ${p.tipo_establecimiento || '—'}` },
  { id: 'uso_servicios',    props: (p) => `<strong>🏢 Establecimiento:</strong> ${p.nombre_establecimiento || '—'}<br>📍 <strong>Dirección:</strong> ${p.direccion || '—'}<br>🏷️ <strong>Tipo:</strong> ${p.tipo_establecimiento || '—'}` },
  // 2. Equipo institucional
  { id: 'equipo_institucional', props: (p) => `<strong>Descripción:</strong> ${p.Nombre || '—'}<br>📍 <strong>Barrio:</strong> ${p.NOMBRE_2 || '—'}` },
  // 3. Predios educativos
  { id: 'predios_educativos', props: (p) => `<strong>Nombre:</strong> ${p.Nombre || '—'}<br><strong>Sede:</strong> ${p.Sede || p.sede || '—'}<br><strong>Barrio:</strong> ${p.NOMBRE_2 || '—'}<br><strong>Tipo:</strong> ${p.educacion || '—'}<br><strong>Estudiantes:</strong> ${p.numero_estudiantes || '—'}` },
  // 4. Iglesias
  { id: 'iglesias', props: (p) => `<strong>⛪ Nombre:</strong> ${p.NOMBRE || '—'}<br>🆔 <strong>Código:</strong> ${p.COD || '—'}` },
  // 5. Zonas verdes
  { id: 'zonas_verdes', props: (p) => `<strong>Descripción:</strong> ${p.Equipament || '—'}<br>📍 <strong>Barrio:</strong> ${p.barrio || p.NOMBRE || '—'}` },
  // 5b. Obras de pavimentación (lote 1)
  { id: 'obras_pavimentacion', props: (p) => {
    const f1 = p['obras2 \uFFFD_1'];
    const f2 = p['obras2 \uFFFD_2'];
    const f3 = p['obras2 \uFFFD_3'];
    const f4 = p['obras2 \uFFFD_4'];
    const f6 = p['obras2 \uFFFD_6'];
    const f7 = p['obras2 \uFFFD_7'];
    const presupuesto = f6
      ? Number(f6).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })
      : '—';
    return `<strong>🏗️ Obras de Pavimentación</strong><br>
      <strong>📍 Ubicación:</strong> ${f1 || '—'}<br>
      <strong>📏 Longitud:</strong> ${f3 != null ? f3 : '—'} m<br>
      <strong>🔧 Tipo de Obra:</strong> ${f2 || '—'}<br>
      <strong>👥 Beneficiarios:</strong> ${f4 != null ? f4 : '—'}<br>
      <strong>💰 Presupuesto:</strong> ${presupuesto}<br>
      <strong>✅ Estado:</strong> ${f7 || '—'}`;
  }},
  // 5c. Pavimentación 2
  { id: 'pavimentacion2', props: (p) => {
    const f1 = p['obras1 \uFFFD_1'];
    const f2 = p['obras1 \uFFFD_2'];
    const f3 = p['obras1 \uFFFD_3'];
    const f4 = p['obras1 \uFFFD_4'];
    const f6 = p['obras1 \uFFFD_6'];
    const f7 = p['obras1 \uFFFD_7'];
    const presupuesto = f6
      ? Number(f6).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })
      : '—';
    return `<strong>🏗️ Pavimentación 2 - Infraestructura</strong><br>
      <strong>📍 Ubicación:</strong> ${f1 || '—'}<br>
      <strong>📏 Longitud:</strong> ${f3 != null ? f3 : '—'} m<br>
      <strong>🔧 Tipo de Obra:</strong> ${f2 || '—'}<br>
      <strong>👥 Beneficiarios:</strong> ${f4 != null ? f4 : '—'}<br>
      <strong>💰 Presupuesto:</strong> ${presupuesto}<br>
      <strong>✅ Estado:</strong> ${f7 || '—'}`;
  }},
  // 6. Capas de Salud
  { id: 'ipm_santander', props: (p) => {
    const ipm = p.ipm != null ? Number(p.ipm).toFixed(1) : '—';
    const rango = p.ipm != null ? Math.min(Math.floor(Number(p.ipm) / 10) + 1, 10) : '—';
    return `<strong>📊 IPM — Pobreza Multidimensional</strong><br>
      <strong>🏷️ Vulnerabilidad:</strong> ${p.LABEL || '—'}<br>
      <strong>📈 IPM:</strong> ${ipm}%<br>
      <strong>🔢 Rango:</strong> ${rango} / 10<br>
      <strong>🤰 Embarazo Temprano:</strong> ${p.embarazo_a || '—'}<br>
      <strong>🆔 Código DANE:</strong> ${p.COD_DANE || '—'}`;
  }},
  { id: 'ips_salud', props: (p) =>
      `<strong>🏥 IPS:</strong> ${p.Instituci || '—'}` },
  { id: 'cuadrantes_salud', props: (p) =>
      `<strong>🚔 Cuadrante Policía:</strong> ${p.Nombre || '—'}` },
  { id: 'microterritorios_salud', props: (p) =>
      `<strong>🗺️ Microterritorio:</strong> ${p.CODIGO || '—'}<br><strong>🏠 Hogares:</strong> ${p.num_hogare ?? '—'}` },
  { id: 'territorios_salud', props: (p) =>
      `<strong>🗺️ Territorio:</strong> ${p.Codigo || '—'}<br><strong>🏠 Hogares:</strong> ${p.Num_hogar ?? '—'}` },
  { id: 'veredas_salud', props: (p) =>
      `<strong>🌿 Vereda:</strong> ${p.nombre || '—'}<br><strong>📐 Área:</strong> ${p.area_hecta ? Number(p.area_hecta).toFixed(1) + ' ha' : '—'}` },
  { id: 'zona_influencia_salud', props: (p) =>
      `<strong>📍 Zona de Influencia:</strong> ${p.NOMBRE_GEO || 'IPS'}<br><strong>📏 Radio:</strong> ${p.BUFF_DIST ?? 30} m` },
  // 6b. Delitos por barrio (Gobierno) — capa dinámica del panel
  { id: 'delitos_panel', props: (p) =>
    `<strong>🛡️ ${p.nombre || '—'} — Delitos</strong><br>
    <strong>Total:</strong> ${p.total_delitos ?? 0}<br>
    <strong>Homicidios:</strong> ${p.homicidios ?? 0}<br>
    <strong>Hurto a personas:</strong> ${p.hurto_personas ?? 0}<br>
    <strong>Lesiones:</strong> ${p.lesiones ?? 0}<br>
    <strong>VIF:</strong> ${p.violencia_intrafamiliar ?? 0}<br>
    <strong>Hurto motos:</strong> ${p.hurto_motos ?? 0}<br>
    <strong>Extorsión:</strong> ${p.extorsion ?? 0}<br>
    <strong>Delitos sexuales:</strong> ${p.delitos_sexuales ?? 0}` },
  { id: 'barrios_urbanos_gobierno', props: (p) =>
    `<strong>🏘️ Barrio:</strong> ${p.nombre || '—'}` },
  // 7. UBAs
  { id: 'uba1', props: (p) => `<strong>🏘️ Barrio:</strong> ${p.nombre || ''}<br><strong>🏢 UBA:</strong> 1` },
  { id: 'uba2', props: (p) => `<strong>🏘️ Barrio:</strong> ${p.nombre || ''}<br><strong>🏢 UBA:</strong> 2` },
  { id: 'uba3', props: (p) => `<strong>🏘️ Barrio:</strong> ${p.nombre || ''}<br><strong>🏢 UBA:</strong> 3` },
  { id: 'uba4', props: (p) => `<strong>🏘️ Barrio:</strong> ${p.nombre || ''}<br><strong>🏢 UBA:</strong> 4` },
  { id: 'uba5', props: (p) => `<strong>🏘️ Barrio:</strong> ${p.nombre || ''}<br><strong>🏢 UBA:</strong> 5` },
  { id: 'ubac', props: (p) => `<strong>🏘️ Barrio:</strong> ${p.nombre || ''}<br><strong>🏢 UBA:</strong> C` },
  // 7. Barrios urbanos
  { id: 'barrios_urbanos', props: (p) => `<strong>🏘️ Barrio:</strong> ${p.nombre || ''}` },
  // 8. Nomenclatura vial
  { id: 'nomenclatura_vial', props: (p) => `<strong>🛣️ Nombre de vía:</strong> ${p.texto || ''}` },
];

// Siempre consultar predios urbanos como fallback
export function formatPredios(p) {
  return `<strong>📌 Matrícula:</strong> ${p.matriculainmobiliaria || p.matricula_inmobiliaria || '—'}<br>
    <strong>📌 Número Predial:</strong> ${p.codigo || '—'}<br>
    <strong>📍 Dirección:</strong> ${p.direccion || '—'}<br>
    <strong>🏞️ Área Terreno:</strong> ${p.areaterreno_m2 || p.area_terreno || '—'} m²<br>
    <strong>🏗️ Área Construida:</strong> ${p.areaconstruida_m2 || p.area_construida || '—'} m²<br>
    <strong>💰 Avalúo:</strong> ${p.avaluo || '—'}<br>
    <strong>🏢 Destino Económico:</strong> ${p.destinoeconomico || p.destino_economico || '—'}`;
}
