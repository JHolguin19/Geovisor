import { useContext, useMemo } from 'react';
import MapContext from '../../context/MapContext';
import './AguasPanel.css';

const LEGEND_VEREDAS = [
  { color: '#0288D1', label: 'Con sistema de acueducto', opacity: '0.55' },
  { color: '#EF4444', label: 'Sin cobertura', opacity: '0.75' },
];

const LEGEND_RED = [
  { color: '#0288D1', label: 'Red de conducción', line: true },
];

const LEGEND_ESTRUCTURAS = [
  { color: '#01579B', label: 'Bocatoma / Tanque / Desarenador / PTAP', point: true },
];

export default function AguasPanel() {
  const { activeLayers, aguasConfig, setAguasConfig } = useContext(MapContext);

  const aguasActive = useMemo(
    () => [...activeLayers].some(id => id.startsWith('aguas_')),
    [activeLayers]
  );
  const veredasActive = activeLayers.has('aguas_veredas_acueductos');
  const redActive = activeLayers.has('aguas_red_acueducto');
  const estructuraActive = activeLayers.has('aguas_estructura_acueducto');

  if (!aguasActive) return null;

  const { sistemaFiltro } = aguasConfig;

  function setSistema(val) {
    setAguasConfig(prev => ({ ...prev, sistemaFiltro: val || null }));
  }

  return (
    <div className="ap">
      {/* Header */}
      <div className="ap__header">
        <svg className="ap__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2C6 2 3 7.5 3 12a9 9 0 0018 0c0-4.5-3-10-9-10z"/>
          <path d="M12 2v20M7.5 8.5c1.5 2 3 4 4.5 4s3-2 4.5-4"/>
        </svg>
        <span>Dirección de Aguas</span>
      </div>

      <div className="ap__body">

        {/* Filtro por sistema de acueducto */}
        {veredasActive && (
          <div className="ap__section">
            <div className="ap__section-title">Filtrar por Sistema de Acueducto</div>
            <div className="ap__field">
              <select
                className="ap__select"
                value={sistemaFiltro || ''}
                onChange={e => setSistema(e.target.value)}
              >
                <option value="">Todos los sistemas</option>
                <option value="SIN COBERTURA">— Sin cobertura —</option>
                <optgroup label="Acueductos municipales">
                  <option value="ACUACAR">ACUACAR</option>
                  <option value="ACUASAN">ACUASAN</option>
                  <option value="ACUAVIVA">ACUAVIVA</option>
                </optgroup>
                <optgroup label="Acueductos comunitarios">
                  <option value="ABASTECIMIENTO DE AGUA MUNCHIQUE">Munchique</option>
                  <option value="ACUEDUCTO INTER VEREDAL EL TURCO-TRES QUEBRADAS">El Turco – Tres Quebradas</option>
                  <option value="ACUEDUCTO LA CASCADA">La Cascada</option>
                  <option value="ACUEDUCTO SAN PEDRO">San Pedro</option>
                  <option value="ACUEDUCTO VEREDA PÁEZ (PACADOA)">Vereda Páez (Pacadoa)</option>
                  <option value="ALTO JOSE DE MANDIVA">Alto José de Mandiva</option>
                  <option value="ALTO PARAISO">Alto Paraíso</option>
                  <option value="ALTO SAN FRANCISCO">Alto San Francisco</option>
                  <option value="ASOCIACIÓN COMUNITARIA DEL SISTEMA DE ABASTECIMIENTO NUESTRA AGUA DE PARAMO">Nuestra Agua de Páramo</option>
                  <option value="ASOCIACIÓN DE USUARIOS DEL ACUEDUCTO DE LA CUENCA DEL RIO PAEZ QUINAMAYO AGUAS DE - CURPAQ">CURPAQ</option>
                  <option value="BAJO SAN FRANCISCO">Bajo San Francisco</option>
                  <option value="CACHIMBAL">Cachimbal</option>
                  <option value="CALIFORNIA">California</option>
                  <option value="CHAPA BAJA">Chapa Baja</option>
                  <option value="EL CONDOR">El Cóndor</option>
                  <option value="EL PALMAR">El Palmar</option>
                  <option value="FILADELFIA">Filadelfia</option>
                  <option value="GUADUALITO">Guadualito</option>
                  <option value="JERUSALEN">Jerusalén</option>
                  <option value="LA ARROBLEDA">La Arrobleda</option>
                  <option value="LAS VUELTAS">Las Vueltas</option>
                  <option value="LOMITAS-MAZAMORRERO">Lomitas – Mazamorrero</option>
                  <option value="MANDIVA">Mandiva</option>
                  <option value="PARNAZO">Parnazo</option>
                  <option value="PLANTA DE TRATAMIENTO DE AGUA POTABLE EL MIRADOR">PTAP El Mirador</option>
                  <option value="SAN QUEPAL">San Quepal</option>
                  <option value="SANTA ROSA">Santa Rosa</option>
                  <option value="SISTEMA DE ABASTECIMIENTO ARAUCA – GUAYTALA">Arauca – Guaytala</option>
                  <option value="SISTEMA DE ABASTECIMIENTO BUENA VISTA">Buena Vista</option>
                  <option value="SISTEMA DE ABASTECIMIENTO DE LA VEREDA AGUA BLANCA">Agua Blanca</option>
                  <option value="SISTEMA DE ABASTECIMIENTO EL MANANTIAL">El Manantial</option>
                  <option value="SISTEMA DE ABASTECIMIENTO LA ALITA BAJA">La Alita Baja</option>
                  <option value="SISTEMA DE ABASTECIMIENTO LA AURORA">La Aurora</option>
                  <option value="SISTEMA DE ABASTECIMIENTO LA CASCADA">La Cascada (Abasto)</option>
                  <option value="SISTEMA DE ABASTECIMIENTO LA HONDA">La Honda</option>
                  <option value="SISTEMA DE ABASTECIMIENTO LOMA ALTA">Loma Alta</option>
                  <option value="SISTEMA DE ABASTECIMIENTO LOS TIGRES Y RIO CLARO">Los Tigres y Río Claro</option>
                  <option value="SISTEMA DE ABASTO ALTAMIRA">Altamira</option>
                  <option value="SISTEMA DE ABASTO BELLA VISTA">Bella Vista</option>
                  <option value="SISTEMA DE ABASTO CASCAJAL">Cascajal</option>
                  <option value="SISTEMA DE ABASTO EL BROCHE">El Broche</option>
                  <option value="SISTEMA DE ABASTO LAS LAJAS">Las Lajas</option>
                  <option value="SISTEMA DE ABASTO PEDREGAL">Pedregal</option>
                  <option value="SISTEMA DE ACUEDUCTO COMUNITARIO MONDOMITO">Mondomito</option>
                  <option value="SISTEMA DE ACUEDUCTO RURAL EL LLANITO">El Llanito</option>
                  <option value="TAMINANGO">Taminango</option>
                  <option value="VILACHI">Vilachí</option>
                </optgroup>
              </select>
              {sistemaFiltro && (
                <button className="ap__clear-btn" onClick={() => setSistema('')}>
                  × Limpiar filtro
                </button>
              )}
            </div>
            {sistemaFiltro === 'SIN COBERTURA' && (
              <div className="ap__alert">
                <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                </svg>
                Mostrando veredas sin cobertura de acueducto
              </div>
            )}
          </div>
        )}

        {/* Leyenda de capas activas */}
        <div className="ap__section">
          <div className="ap__section-title">Leyenda</div>

          {veredasActive && (
            <div className="ap__legend-group">
              <div className="ap__legend-label">Veredas — Cobertura</div>
              {LEGEND_VEREDAS.map(item => (
                <div key={item.label} className="ap__legend-item">
                  <span
                    className="ap__legend-swatch ap__legend-swatch--poly"
                    style={{ background: item.color, opacity: item.opacity }}
                  />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          )}

          {redActive && (
            <div className="ap__legend-group">
              <div className="ap__legend-label">Red de Acueducto</div>
              {LEGEND_RED.map(item => (
                <div key={item.label} className="ap__legend-item">
                  <span className="ap__legend-swatch ap__legend-swatch--line"
                    style={{ background: item.color }} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          )}

          {estructuraActive && (
            <div className="ap__legend-group">
              <div className="ap__legend-label">Estructuras</div>
              {LEGEND_ESTRUCTURAS.map(item => (
                <div key={item.label} className="ap__legend-item">
                  <span className="ap__legend-swatch ap__legend-swatch--point"
                    style={{ background: item.color }} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
