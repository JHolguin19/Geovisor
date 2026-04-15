import { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { getSecretariaById } from '../config/secretarias';
import { uploadService } from '../services/api';
import './UploadPage.css';

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function formatBytes(b) {
  if (b < 1024)        return `${b} B`;
  if (b < 1048576)     return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

function fileExt(name) {
  return name.slice(name.lastIndexOf('.') + 1).toUpperCase();
}

const ACCEPTED = '.xlsx,.xls,.csv,.json,.geojson';

/* ── Indicador de pasos ───────────────────────────────────────────────────── */
const STEPS = ['Archivo', 'Vista previa', 'Georreferenciación', 'Resultado'];

function StepBar({ current }) {
  return (
    <div className="upw-stepbar">
      {STEPS.map((label, i) => {
        const done    = i < current;
        const active  = i === current;
        return (
          <div key={i} className={`upw-step ${active ? 'upw-step--active' : ''} ${done ? 'upw-step--done' : ''}`}>
            <span className="upw-step-num">
              {done ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                     strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : i + 1}
            </span>
            <span className="upw-step-label">{label}</span>
            {i < STEPS.length - 1 && <span className="upw-step-line" />}
          </div>
        );
      })}
    </div>
  );
}

/* ── Mini tabla de preview ────────────────────────────────────────────────── */
function PreviewTable({ columns, rows }) {
  return (
    <div className="upw-preview-wrap">
      <table className="upw-preview-table">
        <thead>
          <tr>
            {columns.map(c => <th key={c}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map(c => (
                <td key={c}>
                  <span className="upw-preview-cell">
                    {row[c] != null ? String(row[c]) : <em className="upw-null">vacío</em>}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Historial ────────────────────────────────────────────────────────────── */
const STATUS_CFG = {
  completado: { label: 'Completado', cls: 'success' },
  procesando: { label: 'Procesando', cls: 'warning' },
  error:      { label: 'Error',      cls: 'error' },
  pendiente:  { label: 'Pendiente',  cls: 'warning' },
};

function HistoryTable({ history, loadingHistory }) {
  if (loadingHistory) return <p className="upw-loading">Cargando historial…</p>;
  if (!history.length) return <p className="upw-empty">No hay cargas registradas para esta secretaría.</p>;

  return (
    <div className="upload-table-wrap">
      <table className="upload-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Archivo</th>
            <th>Tabla destino</th>
            <th>Filas</th>
            <th>Georreferenciación</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {history.map((row, i) => {
            const cfg   = STATUS_CFG[row.estado] || STATUS_CFG.pendiente;
            const fecha = row.created_at || row.fecha;
            return (
              <tr key={row.id ?? i}>
                <td>{fecha ? new Date(fecha).toLocaleString('es-CO') : '—'}</td>
                <td className="upw-td-file">{row.nombre_archivo || row.archivo || '—'}</td>
                <td><code>{row.tabla_destino || row.tabla || '—'}</code></td>
                <td>{row.filas_procesadas ?? row.filas ?? '—'}</td>
                <td>
                  {row.columna_lat
                    ? <span className="upw-georef-tag upw-georef-tag--coords">Coordenadas</span>
                    : row.mensaje_error?.includes('cruce') || row.tabla_destino?.includes('join')
                      ? <span className="upw-georef-tag upw-georef-tag--join">Cruce</span>
                      : <span className="upw-georef-tag upw-georef-tag--none">Sin georref.</span>
                  }
                </td>
                <td><span className={`upload-badge upload-badge--${cfg.cls}`}>{cfg.label}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL
   ═══════════════════════════════════════════════════════════════════════════ */

export default function UploadPage() {
  const { secretariaId } = useParams();
  const { user }         = useContext(AuthContext);
  const navigate         = useNavigate();
  const fileInputRef     = useRef(null);

  const secretaria = getSecretariaById(secretariaId);
  const secColor   = secretaria?.color || '#1A5F9B';
  const isAdmin    = user?.role === 'admin' || user?.role === 'editor_geo';

  /* ── Estado wizard ── */
  const [step,      setStep]     = useState(0);    // 0=file 1=preview 2=config 3=result
  const [file,      setFile]     = useState(null);
  const [dragOver,  setDragOver] = useState(false);

  /* ── Análisis ── */
  const [analyzing,      setAnalyzing]      = useState(false);
  const [analysis,       setAnalysis]       = useState(null); // {columns, preview, detected_lat, detected_lon, has_coords, total_rows}
  const [analysisError,  setAnalysisError]  = useState(null);

  /* ── Configuración georref ── */
  const [tableName,  setTableName] = useState('');
  const [geoMode,    setGeoMode]   = useState('auto'); // 'auto'|'coords'|'join'|'none'
  const [latCol,     setLatCol]    = useState('');
  const [lonCol,     setLonCol]    = useState('');

  /* ── Cruce de atributos ── */
  const [baseLayers,      setBaseLayers]      = useState([]);
  const [joinLayer,       setJoinLayer]       = useState('');
  const [joinLayerFields, setJoinLayerFields] = useState([]);
  const [joinFieldExcel,  setJoinFieldExcel]  = useState('');
  const [joinFieldLayer,  setJoinFieldLayer]  = useState('');
  const [joinGeomType,    setJoinGeomType]    = useState('centroid');
  const [loadingFields,   setLoadingFields]   = useState(false);
  const [fieldsError,     setFieldsError]     = useState(null);

  /* ── Upload ── */
  const [uploading,    setUploading]   = useState(false);
  const [result,       setResult]      = useState(null);
  const [uploadError,  setUploadError] = useState(null);

  /* ── Historial ── */
  const [history,        setHistory]        = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  /* ── Cargar historial ── */
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const data = await uploadService.getHistory(secretariaId);
      setHistory(Array.isArray(data) ? data : (data.uploads ?? []));
    } catch { setHistory([]); }
    finally   { setLoadingHistory(false); }
  }, [secretariaId]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  /* ── Cargar capas base ── */
  useEffect(() => {
    uploadService.getBaseLayers()
      .then(d => setBaseLayers(d.layers || []))
      .catch(() => setBaseLayers([]));
  }, []);

  /* ── Cargar campos de capa base al seleccionar ── */
  useEffect(() => {
    if (!joinLayer) { setJoinLayerFields([]); setFieldsError(null); return; }
    setLoadingFields(true);
    setFieldsError(null);
    setJoinLayerFields([]);
    setJoinFieldLayer('');
    uploadService.getBaseLayerFields(joinLayer)
      .then(d => {
        const fields = d.fields || [];
        setJoinLayerFields(fields);
        if (fields.length === 0) {
          setFieldsError('La capa no tiene columnas disponibles o no existe en la base de datos. Escribe el nombre del campo manualmente.');
        }
      })
      .catch(err => {
        setJoinLayerFields([]);
        setFieldsError(
          err.response?.data?.error ||
          err.message ||
          'No se pudieron cargar los campos. Escribe el nombre del campo manualmente.'
        );
      })
      .finally(() => setLoadingFields(false));
  }, [joinLayer]);

  /* ── Seleccionar archivo ── */
  const selectFile = async (f) => {
    setFile(f);
    setAnalysis(null);
    setAnalysisError(null);
    setResult(null);
    setUploadError(null);
    setStep(1);

    setAnalyzing(true);
    try {
      const data = await uploadService.analyzeFile(f);
      setAnalysis(data);
      // Pre-rellenar modo según detección
      if (data.has_coords) {
        setGeoMode('coords');
        setLatCol(data.detected_lat || '');
        setLonCol(data.detected_lon || '');
      } else {
        setGeoMode('join');
      }
    } catch (err) {
      setAnalysisError(err.response?.data?.error || err.message || 'Error al analizar el archivo');
    } finally {
      setAnalyzing(false);
    }
  };

  const clearFile = () => {
    setFile(null); setStep(0);
    setAnalysis(null); setAnalysisError(null);
    setResult(null); setUploadError(null);
    setTableName(''); setLatCol(''); setLonCol('');
    setJoinLayer(''); setJoinFieldExcel(''); setJoinFieldLayer('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* ── Drag & Drop ── */
  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) selectFile(f);
  };

  /* ── Resolver modo efectivo ── */
  const effectiveMode = () => {
    if (geoMode === 'auto') return analysis?.has_coords ? 'coords' : 'none';
    return geoMode;
  };

  /* ── Validar paso 2 ── */
  const canSubmit = () => {
    const mode = effectiveMode();
    if (mode === 'coords') return !!(latCol && lonCol);
    if (mode === 'join')   return !!(joinLayer && joinFieldExcel && joinFieldLayer);
    return true; // 'none'
  };

  /* ── Submit ── */
  const handleSubmit = async () => {
    if (!file || !analysis) return;
    setUploading(true);
    setUploadError(null);
    const mode = effectiveMode();
    try {
      const data = await uploadService.upload(file, {
        secretaria_id:    secretariaId,
        table_name:       tableName,
        lat_column:       mode === 'coords' ? latCol : undefined,
        lon_column:       mode === 'coords' ? lonCol : undefined,
        geo_mode:         mode,
        join_layer:       mode === 'join' ? joinLayer       : undefined,
        join_field_excel: mode === 'join' ? joinFieldExcel  : undefined,
        join_field_layer: mode === 'join' ? joinFieldLayer  : undefined,
        join_geom_type:   mode === 'join' ? joinGeomType    : undefined,
      });
      setResult(data);
      setStep(3);
      loadHistory();
    } catch (err) {
      setUploadError(err.response?.data?.error || err.message || 'Error al subir el archivo.');
    } finally {
      setUploading(false);
    }
  };

  if (!secretaria) {
    return (
      <div className="upload-error-page">
        <p>Secretaría no encontrada.</p>
        <button onClick={() => navigate('/dashboard')}>Volver</button>
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */
  return (
    <div className="upload-page">

      {/* ── Header ── */}
      <header className="upload-header" style={{ '--sec-color': secColor }}>
        <div className="upload-header-left">
          <div className="upload-header-brand">
            <img src="/logos/logocolombia.png" alt="Colombia" className="upload-logo" />
            <img src="/logos/alcaldia.png"     alt="Alcaldía" className="upload-logo" />
            <div className="upload-header-text">
              <div className="upload-entity">Alcaldía Municipal · Santander de Quilichao</div>
              <div className="upload-secretaria-name" style={{ color: secColor }}>
                {secretaria.name}
              </div>
            </div>
          </div>
        </div>
        <div className="upload-header-right">
          {user && (
            <span className="upload-user-badge">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="7" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
              {user.username} · {user.role}
            </span>
          )}
          <button className="upload-back-btn" onClick={() => navigate(`/portal/${secretariaId}`)}>
            ← Portal
          </button>
          {isAdmin && (
            <button className="upload-back-btn" onClick={() => navigate('/dashboard')}>
              ← Dashboard
            </button>
          )}
        </div>
      </header>
      <div className="upload-band" style={{ background: secColor }} />

      <main className="upload-main">

        {/* Hero */}
        <div className="upload-hero">
          <div className="upload-hero-icon" style={{ background: secColor }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5"
                 strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <div>
            <h1 className="upload-title">Subir Datos</h1>
            <p className="upload-subtitle">
              Carga archivos Excel o CSV y georreferéncialos por coordenadas o por cruce con capas base.
            </p>
          </div>
        </div>

        {/* ── Wizard ── */}
        <div className="upw-card">

          {/* Step bar */}
          <StepBar current={step} />

          {/* ══════════════════ STEP 0: SELECCIONAR ARCHIVO ══════════════════ */}
          {step === 0 && (
            <div className="upw-body">
              <div
                className={`upload-dropzone${dragOver ? ' upload-dropzone--over' : ''}`}
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileInputRef.current?.click()}
              >
                <svg className="upload-dropzone-icon" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <p className="upload-dropzone-text">
                  Arrastra tu archivo aquí o <span style={{ color: secColor }}>haz clic para seleccionar</span>
                </p>
                <p className="upload-dropzone-hint">Formatos: .xlsx · .xls · .csv · .json · .geojson</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED}
                  className="upload-file-input"
                  onChange={(e) => e.target.files[0] && selectFile(e.target.files[0])}
                />
              </div>
            </div>
          )}

          {/* ══════════════════ STEP 1: VISTA PREVIA ══════════════════ */}
          {step === 1 && (
            <div className="upw-body">
              {/* Info del archivo */}
              <div className="upload-file-info">
                <span className="upload-file-ext">{fileExt(file?.name || '')}</span>
                <div className="upload-file-meta">
                  <span className="upload-file-name">{file?.name}</span>
                  <span className="upload-file-size">{formatBytes(file?.size)}</span>
                </div>
                <button type="button" className="upload-file-clear" onClick={clearFile} title="Quitar archivo">✕</button>
              </div>

              {/* Analizando */}
              {analyzing && (
                <div className="upw-analyzing">
                  <span className="upload-spinner" style={{ borderTopColor: secColor }} />
                  Analizando archivo…
                </div>
              )}

              {/* Error de análisis */}
              {analysisError && (
                <div className="upload-result upload-result--error">
                  <strong>No se pudo analizar el archivo:</strong> {analysisError}
                </div>
              )}

              {/* Resultados del análisis */}
              {analysis && !analyzing && (
                <>
                  {/* Stats rápidos */}
                  <div className="upw-stats-row">
                    <div className="upw-stat">
                      <span className="upw-stat-val">{analysis.total_rows.toLocaleString('es-CO')}</span>
                      <span className="upw-stat-lbl">filas</span>
                    </div>
                    <div className="upw-stat">
                      <span className="upw-stat-val">{analysis.columns.length}</span>
                      <span className="upw-stat-lbl">columnas</span>
                    </div>
                    <div className="upw-stat">
                      {analysis.has_coords ? (
                        <>
                          <span className="upw-stat-val upw-stat-val--ok">✓</span>
                          <span className="upw-stat-lbl">Coordenadas detectadas</span>
                        </>
                      ) : (
                        <>
                          <span className="upw-stat-val upw-stat-val--warn">—</span>
                          <span className="upw-stat-lbl">Sin coordenadas</span>
                        </>
                      )}
                    </div>
                    {analysis.has_coords && (
                      <div className="upw-stat upw-stat--cols">
                        <code>{analysis.detected_lat}</code>
                        <span style={{ color: 'var(--text-light)' }}>·</span>
                        <code>{analysis.detected_lon}</code>
                      </div>
                    )}
                  </div>

                  {/* Columnas */}
                  <div className="upw-cols-list">
                    {analysis.columns.map(c => (
                      <span
                        key={c}
                        className={`upw-col-chip${
                          c === analysis.detected_lat || c === analysis.detected_lon
                            ? ' upw-col-chip--geo' : ''
                        }`}
                      >
                        {c}
                      </span>
                    ))}
                  </div>

                  {/* Muestra de datos */}
                  <p className="upw-section-sub">Muestra de datos (primeras {analysis.preview.length} filas)</p>
                  <PreviewTable columns={analysis.columns} rows={analysis.preview} />
                </>
              )}

              {/* Navegación */}
              <div className="upw-nav">
                <button className="upload-btn upload-btn--secondary" onClick={clearFile}>
                  ← Cambiar archivo
                </button>
                <button
                  className="upload-btn upload-btn--primary"
                  style={{ background: secColor }}
                  disabled={!analysis || analyzing}
                  onClick={() => setStep(2)}
                >
                  Configurar georreferenciación →
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════ STEP 2: GEORREFERENCIACIÓN ══════════════════ */}
          {step === 2 && (
            <div className="upw-body">
              <h3 className="upw-section-title">¿Cómo deseas georreferenciar los datos?</h3>

              {/* Selector de modo */}
              <div className="upw-mode-grid">
                {[
                  {
                    id: 'coords',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                           strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
                        <circle cx="12" cy="12" r="3"/>
                        <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                      </svg>
                    ),
                    label:       'Por coordenadas',
                    description: 'El archivo contiene columnas de latitud y longitud. Se generan puntos directamente.',
                    available:   true,
                  },
                  {
                    id: 'join',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                           strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
                        <rect x="2"  y="3"  width="9" height="7" rx="1"/>
                        <rect x="13" y="3"  width="9" height="7" rx="1"/>
                        <rect x="2"  y="14" width="9" height="7" rx="1"/>
                        <path d="M16.5 10v4M11 6.5h2M11 17.5h2M13 17.5h3.5V14"/>
                      </svg>
                    ),
                    label:       'Por cruce con capa base',
                    description: 'Los datos tienen un campo (barrio, predio, código) para cruzar con una capa geográfica existente.',
                    available:   true,
                  },
                  {
                    id: 'none',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                           strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
                        <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/>
                        <polyline points="13 2 13 9 20 9"/>
                      </svg>
                    ),
                    label:       'Solo almacenar datos',
                    description: 'Guardar los datos sin geometría (no se visualizarán en el mapa).',
                    available:   true,
                  },
                ].map(opt => (
                  <button
                    key={opt.id}
                    className={`upw-mode-card${geoMode === opt.id ? ' upw-mode-card--selected' : ''}`}
                    style={geoMode === opt.id ? { borderColor: secColor } : {}}
                    onClick={() => setGeoMode(opt.id)}
                    type="button"
                  >
                    <span className="upw-mode-icon" style={geoMode === opt.id ? { color: secColor } : {}}>
                      {opt.icon}
                    </span>
                    <span className="upw-mode-label">{opt.label}</span>
                    <span className="upw-mode-desc">{opt.description}</span>
                    {analysis?.has_coords && opt.id === 'coords' && (
                      <span className="upw-mode-badge" style={{ background: secColor }}>Auto-detectado</span>
                    )}
                  </button>
                ))}
              </div>

              {/* ── Config: coordenadas ── */}
              {geoMode === 'coords' && (
                <div className="upw-config-block">
                  <p className="upw-config-hint">Selecciona las columnas que contienen las coordenadas geográficas.</p>
                  <div className="upload-config-grid">
                    <div className="upload-field">
                      <label className="upload-label">Columna Latitud *</label>
                      <select className="upload-input" value={latCol} onChange={e => setLatCol(e.target.value)}>
                        <option value="">— Seleccionar —</option>
                        {analysis?.columns.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="upload-field">
                      <label className="upload-label">Columna Longitud *</label>
                      <select className="upload-input" value={lonCol} onChange={e => setLonCol(e.target.value)}>
                        <option value="">— Seleccionar —</option>
                        {analysis?.columns.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="upload-field">
                      <label className="upload-label">Nombre de tabla</label>
                      <input
                        className="upload-input"
                        type="text"
                        placeholder="Se genera automáticamente"
                        value={tableName}
                        onChange={e => setTableName(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Config: cruce ── */}
              {geoMode === 'join' && (
                <div className="upw-config-block">
                  <p className="upw-config-hint">
                    Selecciona la capa base y los campos de unión. El sistema asignará la geometría
                    de la capa base a cada fila del Excel donde el campo coincida.
                  </p>
                  <div className="upw-join-grid">
                    {/* Capa base */}
                    <div className="upload-field">
                      <label className="upload-label">Capa base *</label>
                      <select
                        className="upload-input"
                        value={joinLayer}
                        onChange={e => setJoinLayer(e.target.value)}
                      >
                        <option value="">— Seleccionar capa —</option>
                        {baseLayers.map(l => (
                          <option key={l.table_name} value={l.table_name}>
                            {l.label}{l.user_upload ? ' (subida)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Campo del Excel */}
                    <div className="upload-field">
                      <label className="upload-label">Campo del Excel *</label>
                      <select
                        className="upload-input"
                        value={joinFieldExcel}
                        onChange={e => setJoinFieldExcel(e.target.value)}
                        disabled={!analysis}
                      >
                        <option value="">— Seleccionar campo —</option>
                        {analysis?.columns.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    {/* Campo de la capa */}
                    <div className="upload-field">
                      <label className="upload-label">
                        Campo de la capa *
                        {loadingFields && <span className="upw-loading-inline"> cargando…</span>}
                        {!loadingFields && joinLayer && joinLayerFields.length > 0 && (
                          <span className="upw-loading-inline"> {joinLayerFields.length} campos</span>
                        )}
                      </label>

                      {/* Mostrar select si hay campos, input manual si no hay */}
                      {loadingFields ? (
                        <div className="upw-fields-loading">
                          <span className="upw-spinner-inline" />
                          Consultando columnas de la capa…
                        </div>
                      ) : !joinLayer ? (
                        <input
                          className="upload-input"
                          type="text"
                          placeholder="Selecciona primero una capa base"
                          disabled
                        />
                      ) : joinLayerFields.length > 0 ? (
                        <select
                          className="upload-input"
                          value={joinFieldLayer}
                          onChange={e => setJoinFieldLayer(e.target.value)}
                        >
                          <option value="">— Seleccionar campo —</option>
                          {joinLayerFields.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      ) : (
                        /* Fallback: la capa no está en la DB o no tiene columnas accesibles */
                        <input
                          className="upload-input"
                          type="text"
                          placeholder="Escribe el nombre del campo (ej: nombre, codigo)"
                          value={joinFieldLayer}
                          onChange={e => setJoinFieldLayer(e.target.value)}
                        />
                      )}

                      {/* Error al cargar campos */}
                      {fieldsError && !loadingFields && (
                        <span className="upw-fields-error">{fieldsError}</span>
                      )}
                    </div>

                    {/* Tipo de geometría resultante */}
                    <div className="upload-field">
                      <label className="upload-label">Geometría resultante</label>
                      <select
                        className="upload-input"
                        value={joinGeomType}
                        onChange={e => setJoinGeomType(e.target.value)}
                      >
                        <option value="centroid">Centroide del polígono (punto)</option>
                        <option value="polygon">Polígono completo</option>
                      </select>
                    </div>

                    {/* Nombre tabla */}
                    <div className="upload-field">
                      <label className="upload-label">Nombre de tabla</label>
                      <input
                        className="upload-input"
                        type="text"
                        placeholder="Se genera automáticamente"
                        value={tableName}
                        onChange={e => setTableName(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Info del cruce */}
                  {joinLayer && joinFieldExcel && joinFieldLayer && (
                    <div className="upw-join-preview">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                           strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      El campo <code>{joinFieldExcel}</code> del Excel se cruzará con <code>{joinFieldLayer}</code> de{' '}
                      <strong>{baseLayers.find(l => l.table_name === joinLayer)?.label || joinLayer}</strong>.
                      Filas sin coincidencia quedarán sin geometría.
                    </div>
                  )}
                </div>
              )}

              {/* ── Config: ninguna ── */}
              {geoMode === 'none' && (
                <div className="upw-config-block">
                  <p className="upw-config-hint">Los datos se almacenarán en PostgreSQL sin geometría asociada.</p>
                  <div className="upload-config-grid" style={{ gridTemplateColumns: '1fr' }}>
                    <div className="upload-field">
                      <label className="upload-label">Nombre de tabla</label>
                      <input
                        className="upload-input"
                        type="text"
                        placeholder="Se genera automáticamente"
                        value={tableName}
                        onChange={e => setTableName(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Error de upload */}
              {uploadError && (
                <div className="upload-result upload-result--error">
                  <strong>Error:</strong> {uploadError}
                </div>
              )}

              {/* Navegación */}
              <div className="upw-nav">
                <button
                  className="upload-btn upload-btn--secondary"
                  onClick={() => setStep(1)}
                  disabled={uploading}
                >
                  ← Volver
                </button>
                <button
                  className="upload-btn upload-btn--primary"
                  style={{ background: secColor }}
                  disabled={uploading || !canSubmit()}
                  onClick={handleSubmit}
                >
                  {uploading ? (
                    <>
                      <span className="upload-spinner" />
                      Procesando…
                    </>
                  ) : 'Subir archivo →'}
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════ STEP 3: RESULTADO ══════════════════ */}
          {step === 3 && result && (
            <div className="upw-body">
              <div className="upw-result-card upw-result-card--success">
                <div className="upw-result-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"
                       strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <h3 className="upw-result-title">{result.message}</h3>
              </div>

              {/* Stats del resultado */}
              <div className="upw-result-stats">
                <div className="upw-rstat">
                  <span className="upw-rstat-val">{(result.filas_procesadas ?? 0).toLocaleString('es-CO')}</span>
                  <span className="upw-rstat-lbl">Filas procesadas</span>
                </div>
                {result.filas_cruzadas != null && (
                  <div className="upw-rstat">
                    <span className="upw-rstat-val upw-rstat-val--ok">{result.filas_cruzadas.toLocaleString('es-CO')}</span>
                    <span className="upw-rstat-lbl">Con geometría (cruzadas)</span>
                  </div>
                )}
                {result.filas_sin_cruce != null && (
                  <div className="upw-rstat">
                    <span className="upw-rstat-val upw-rstat-val--warn">{result.filas_sin_cruce.toLocaleString('es-CO')}</span>
                    <span className="upw-rstat-lbl">Sin coincidencia</span>
                  </div>
                )}
                {result.filas_error > 0 && (
                  <div className="upw-rstat">
                    <span className="upw-rstat-val upw-rstat-val--err">{result.filas_error}</span>
                    <span className="upw-rstat-lbl">Errores</span>
                  </div>
                )}
                <div className="upw-rstat">
                  <span className="upw-rstat-val upw-rstat-val--geo">
                    {result.tiene_geometria ? '✓' : '—'}
                  </span>
                  <span className="upw-rstat-lbl">Georreferenciado</span>
                </div>
              </div>

              {/* Tabla creada */}
              <div className="upw-result-table-info">
                <span className="upw-result-table-lbl">Tabla creada:</span>
                <code>{result.tabla}</code>
              </div>

              {/* Advertencia sin coincidencias */}
              {result.filas_sin_cruce > 0 && result.filas_cruzadas === 0 && (
                <div className="upload-result upload-result--error" style={{ marginTop: 16 }}>
                  <strong>Aviso:</strong> Ninguna fila encontró coincidencia en la capa base.
                  Verifica que los valores del campo de cruce sean correctos.
                </div>
              )}
              {result.filas_sin_cruce > 0 && result.filas_cruzadas > 0 && (
                <div className="upload-result upload-result--warn" style={{ marginTop: 16 }}>
                  <strong>Aviso:</strong> {result.filas_sin_cruce} fila{result.filas_sin_cruce > 1 ? 's' : ''} no
                  encontraron coincidencia y quedarán sin geometría.
                </div>
              )}

              {/* Acciones */}
              <div className="upw-nav">
                <button className="upload-btn upload-btn--secondary" onClick={clearFile}>
                  Subir otro archivo
                </button>
                {(result.id || result.upload_id) && (
                  <button
                    className="upload-btn upload-btn--primary"
                    style={{ background: '#1E3A5F' }}
                    onClick={() => navigate(
                      `/portal/${secretariaId}/process/${result.id || result.upload_id}`
                    )}
                  >
                    Procesar en Pipeline ETL →
                  </button>
                )}
                {result.tiene_geometria && (
                  <button
                    className="upload-btn upload-btn--primary"
                    style={{ background: secColor }}
                    onClick={() => navigate(`/mapa/${secretariaId}`)}
                  >
                    Ver en el mapa →
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Historial ── */}
        <section className="upload-section" style={{ marginTop: 40 }}>
          <h2 className="upload-section-title">
            <span className="upload-section-dot" style={{ background: secColor }} />
            Historial de cargas
          </h2>
          <HistoryTable history={history} loadingHistory={loadingHistory} />
        </section>

      </main>
    </div>
  );
}
