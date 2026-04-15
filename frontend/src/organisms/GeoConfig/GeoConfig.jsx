/**
 * GeoConfig — Configuración de georreferenciación
 *
 * Modos:
 *   none      — Sin geometría
 *   coords    — Latitud / Longitud desde columnas del archivo
 *   join      — Cruzar con capa base por código/nombre
 *   spatial   — Intersección espacial con capa base
 *
 * Props:
 *   rawColumns    : [{ name, detected_type, sample }]
 *   geoMode       : string ('none' | 'coords' | 'join' | 'spatial')
 *   geoConfig     : {}
 *   onModeChange  : (mode) => void
 *   onConfigChange: (config) => void
 */

import './GeoConfig.css';

const MODES = [
  {
    id: 'none',
    label: 'Sin geometría',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
        <circle cx="12" cy="12" r="10"/>
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
      </svg>
    ),
    desc: 'Los datos se guardarán sin información geoespacial.',
  },
  {
    id: 'coords',
    label: 'Coordenadas',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
        <circle cx="12" cy="10" r="3"/>
        <path d="M12 2a8 8 0 010 16c-4.418 0-8-3.582-8-8s3.582-8 8-8z"/>
        <line x1="12" y1="18" x2="12" y2="22"/>
      </svg>
    ),
    desc: 'Usa dos columnas del archivo (latitud y longitud) para crear puntos.',
  },
  {
    id: 'join',
    label: 'Cruzar con capa',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
      </svg>
    ),
    desc: 'Cruza un campo del archivo con el código o nombre en una capa base (barrios, predios...).',
  },
  {
    id: 'spatial',
    label: 'Intersección espacial',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
        <polygon points="3 11 22 2 13 21 11 13 3 11"/>
      </svg>
    ),
    desc: 'Hereda la geometría de la entidad base que contiene o intersecta al punto.',
  },
];

const BASE_LAYERS = [
  { value: 'barriosurbanos',  label: 'Barrios Urbanos' },
  { value: 'predios_2025_m', label: 'Predios 2025' },
  { value: 'comunas',        label: 'Comunas' },
  { value: 'veredas',        label: 'Veredas' },
];

export default function GeoConfig({ rawColumns = [], geoMode, geoConfig, onModeChange, onConfigChange }) {
  const colOptions = rawColumns.map(c => c.name);

  const set = (key, val) => onConfigChange({ ...geoConfig, [key]: val });

  return (
    <div className="gc-root">
      {/* Selector de modo */}
      <div className="gc-modes">
        {MODES.map(mode => (
          <button
            key={mode.id}
            type="button"
            className={`gc-mode-btn${geoMode === mode.id ? ' gc-mode-btn--active' : ''}`}
            onClick={() => onModeChange(mode.id)}
          >
            <span className="gc-mode-icon">{mode.icon}</span>
            <span className="gc-mode-label">{mode.label}</span>
          </button>
        ))}
      </div>

      {/* Descripción del modo seleccionado */}
      {geoMode && (
        <p className="gc-mode-desc">
          {MODES.find(m => m.id === geoMode)?.desc}
        </p>
      )}

      {/* Config: COORDS */}
      {geoMode === 'coords' && (
        <div className="gc-config-panel">
          <div className="gc-field-group">
            <label className="gc-label">Columna de Latitud</label>
            <select
              className="gc-select"
              value={geoConfig.lat_col || ''}
              onChange={e => set('lat_col', e.target.value)}
            >
              <option value="">— seleccionar —</option>
              {colOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="gc-field-group">
            <label className="gc-label">Columna de Longitud</label>
            <select
              className="gc-select"
              value={geoConfig.lon_col || ''}
              onChange={e => set('lon_col', e.target.value)}
            >
              <option value="">— seleccionar —</option>
              {colOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="gc-field-group">
            <label className="gc-label">SRID (sistema de referencia)</label>
            <select
              className="gc-select"
              value={geoConfig.srid || '4326'}
              onChange={e => set('srid', e.target.value)}
            >
              <option value="4326">WGS 84 (EPSG:4326) — GPS estándar</option>
              <option value="3857">Web Mercator (EPSG:3857)</option>
              <option value="21897">Bogotá / Colombia (EPSG:21897)</option>
            </select>
          </div>
        </div>
      )}

      {/* Config: JOIN */}
      {geoMode === 'join' && (
        <div className="gc-config-panel">
          <div className="gc-field-group">
            <label className="gc-label">Capa base</label>
            <select
              className="gc-select"
              value={geoConfig.base_layer || ''}
              onChange={e => set('base_layer', e.target.value)}
            >
              <option value="">— seleccionar —</option>
              {BASE_LAYERS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
          <div className="gc-field-group">
            <label className="gc-label">Columna del archivo (código/nombre)</label>
            <select
              className="gc-select"
              value={geoConfig.source_col || ''}
              onChange={e => set('source_col', e.target.value)}
            >
              <option value="">— seleccionar —</option>
              {colOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="gc-field-group">
            <label className="gc-label">Campo de la capa base</label>
            <input
              type="text"
              className="gc-input"
              placeholder="ej: codigo, nombre, id"
              value={geoConfig.target_col || ''}
              onChange={e => set('target_col', e.target.value)}
            />
          </div>
          <div className="gc-field-group">
            <label className="gc-label">Tipo de join</label>
            <select
              className="gc-select"
              value={geoConfig.join_type || 'exact'}
              onChange={e => set('join_type', e.target.value)}
            >
              <option value="exact">Exacto (=)</option>
              <option value="ilike">Texto aproximado (ILIKE)</option>
            </select>
          </div>
        </div>
      )}

      {/* Config: SPATIAL */}
      {geoMode === 'spatial' && (
        <div className="gc-config-panel">
          <div className="gc-hint">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Para intersección espacial, el archivo debe tener columnas de latitud y longitud que se usarán para crear puntos y cruzarlos con la capa base.
          </div>
          <div className="gc-field-group">
            <label className="gc-label">Columna de Latitud</label>
            <select className="gc-select" value={geoConfig.lat_col || ''} onChange={e => set('lat_col', e.target.value)}>
              <option value="">— seleccionar —</option>
              {colOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="gc-field-group">
            <label className="gc-label">Columna de Longitud</label>
            <select className="gc-select" value={geoConfig.lon_col || ''} onChange={e => set('lon_col', e.target.value)}>
              <option value="">— seleccionar —</option>
              {colOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="gc-field-group">
            <label className="gc-label">Capa base (heredar geometría)</label>
            <select className="gc-select" value={geoConfig.base_layer || ''} onChange={e => set('base_layer', e.target.value)}>
              <option value="">— seleccionar —</option>
              {BASE_LAYERS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
          <div className="gc-field-group">
            <label className="gc-label">Operación espacial</label>
            <select className="gc-select" value={geoConfig.spatial_op || 'within'} onChange={e => set('spatial_op', e.target.value)}>
              <option value="within">ST_Within (punto dentro del polígono)</option>
              <option value="intersects">ST_Intersects (punto toca el polígono)</option>
            </select>
          </div>
        </div>
      )}

      {/* Config: NONE */}
      {geoMode === 'none' && (
        <div className="gc-none-notice">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          Los datos se procesarán y guardarán sin geometría. Podrás agregar georreferenciación más adelante mediante reprocesamiento.
        </div>
      )}
    </div>
  );
}
