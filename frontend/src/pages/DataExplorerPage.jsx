import { useState, useEffect, useCallback, useContext } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { getSecretariaById } from '../config/secretarias';
import { uploadService, geodataService, tablesService } from '../services/api';
import './DataExplorerPage.css';

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function relativeDate(iso) {
  if (!iso) return '—';
  const d   = new Date(iso);
  const now = new Date();
  const mins = Math.floor((now - d) / 60000);
  if (mins < 1)  return 'Hace un momento';
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `Hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `Hace ${days}d`;
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fileIcon(tipo) {
  const map = { xlsx: 'XLS', xls: 'XLS', csv: 'CSV', json: 'JSON', geojson: 'GEO' };
  return map[tipo] || 'FILE';
}

const STATUS_CFG = {
  completado: { label: 'Completado', cls: 'success' },
  procesando: { label: 'Procesando', cls: 'warning' },
  error:      { label: 'Error',      cls: 'error'   },
  pendiente:  { label: 'Pendiente',  cls: 'warning' },
};

const SCHEMA_CFG = {
  raw:     { label: 'RAW',        color: '#6D28D9', bg: '#EDE9FE' },
  staging: { label: 'STAGING',    color: '#B45309', bg: '#FEF3C7' },
  public:  { label: 'PRODUCCIÓN', color: '#065F46', bg: '#D1FAE5' },
};

// Tipo SQL → chip de color
const TYPE_COLORS = {
  text:              { bg: '#DBEAFE', color: '#1E40AF' },
  character:         { bg: '#DBEAFE', color: '#1E40AF' },
  'character varying':{ bg: '#DBEAFE', color: '#1E40AF' },
  integer:           { bg: '#D1FAE5', color: '#065F46' },
  bigint:            { bg: '#D1FAE5', color: '#065F46' },
  smallint:          { bg: '#D1FAE5', color: '#065F46' },
  numeric:           { bg: '#FEF3C7', color: '#92400E' },
  'double precision':{ bg: '#FEF3C7', color: '#92400E' },
  real:              { bg: '#FEF3C7', color: '#92400E' },
  boolean:           { bg: '#F3E8FF', color: '#6B21A8' },
  date:              { bg: '#FFE4E6', color: '#9F1239' },
  timestamp:         { bg: '#FFE4E6', color: '#9F1239' },
  'timestamp without time zone': { bg: '#FFE4E6', color: '#9F1239' },
  'timestamp with time zone':    { bg: '#FFE4E6', color: '#9F1239' },
  jsonb:             { bg: '#E0F2FE', color: '#0369A1' },
  json:              { bg: '#E0F2FE', color: '#0369A1' },
  geometry:          { bg: '#F0FDF4', color: '#166534', border: '1px solid #86EFAC' },
  USER_DEFINED:      { bg: '#F0FDF4', color: '#166534', border: '1px solid #86EFAC' },
};

function typeChip(dataType) {
  const key = (dataType || '').toLowerCase();
  const cfg = TYPE_COLORS[key] || TYPE_COLORS[dataType] || { bg: '#F1F5F9', color: '#475569' };
  const label = key === 'character varying' ? 'VARCHAR'
    : key === 'double precision' ? 'FLOAT'
    : key === 'timestamp without time zone' ? 'TIMESTAMP'
    : key === 'timestamp with time zone' ? 'TIMESTAMPTZ'
    : key === 'user-defined' || dataType === 'USER-DEFINED' ? 'GEOMETRY'
    : (dataType || 'TEXT').toUpperCase();
  return (
    <span className="dex-type-chip" style={{ background: cfg.bg, color: cfg.color, border: cfg.border }}>
      {label}
    </span>
  );
}

/* ── Componente principal ─────────────────────────────────────────────────── */

export default function DataExplorerPage() {
  const { secretariaId } = useParams();
  const { user }         = useContext(AuthContext);
  const navigate         = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const secretaria  = getSecretariaById(secretariaId);
  const secColor    = secretaria?.color || '#1A5F9B';
  const isAdmin     = user?.role === 'admin' || user?.role === 'editor_geo';

  // Tab activo: 'historial' | 'pipeline'
  const initialTab = searchParams.get('tab') === 'pipeline' ? 'pipeline' : 'historial';
  const [activeTab, setActiveTab] = useState(initialTab);

  function switchTab(tab) {
    setActiveTab(tab);
    setSearchParams(tab === 'pipeline' ? { tab: 'pipeline' } : {});
  }

  /* ──────────────────── TAB HISTORIAL ──────────────────────────────────── */

  const [uploads,        setUploads]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState('');

  // preview expandido por card
  const [openId,         setOpenId]         = useState(null);
  const [previewData,    setPreviewData]    = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError,   setPreviewError]   = useState(null);

  // eliminación
  const [confirmId,      setConfirmId]      = useState(null);
  const [deletingId,     setDeletingId]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await uploadService.getHistory(secretariaId);
      setUploads(Array.isArray(data) ? data : (data.uploads ?? []));
    } catch { setUploads([]); }
    finally  { setLoading(false); }
  }, [secretariaId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setOpenId(null); setPreviewData(null); setConfirmId(null); }, [secretariaId]);

  const togglePreview = async (u) => {
    const id = u.id;
    if (openId === id) { setOpenId(null); setPreviewData(null); return; }
    setOpenId(id);
    setPreviewData(null);
    setPreviewError(null);
    const tabla = u.tabla_destino || u.tabla || u.table_name;
    if (!tabla || u.estado === 'error' || u.estado === 'pendiente') {
      setPreviewError('La tabla no está disponible para previsualizar.');
      return;
    }
    setPreviewLoading(true);
    try {
      const geo      = await geodataService.getPreview(tabla, { limit: 50 });
      const features = geo.features || [];
      if (!features.length) { setPreviewData({ columns: [], rows: [] }); return; }
      const allKeys = new Set();
      features.forEach(f => Object.keys(f.properties || {}).forEach(k => allKeys.add(k)));
      const columns = [...allKeys];
      const rows    = features.map(f => f.properties || {});
      setPreviewData({ columns, rows });
    } catch (err) {
      setPreviewError(err.response?.data?.error || err.message || 'Error al cargar vista previa.');
    } finally { setPreviewLoading(false); }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await uploadService.delete(id);
      setUploads(prev => prev.filter(u => u.id !== id));
      if (openId === id) { setOpenId(null); setPreviewData(null); }
      setConfirmId(null);
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Error al eliminar.');
    } finally { setDeletingId(null); }
  };

  const filtered = uploads.filter(u => {
    if (!search) return true;
    const s     = search.toLowerCase();
    const name  = (u.nombre_archivo || '').toLowerCase();
    const tabla = (u.tabla_destino  || '').toLowerCase();
    return name.includes(s) || tabla.includes(s);
  });

  /* ──────────────────── TAB PIPELINE ───────────────────────────────────── */

  const [schemas,       setSchemas]       = useState({ raw: [], staging: [], public: [] });
  const [schemasLoading, setSchemasLoading] = useState(false);
  const [schemasError,  setSchemasError]  = useState(null);
  const [pipeSearch,    setPipeSearch]    = useState('');

  // columnas expandidas: { 'raw.tabla_x': { loading, columns, error } }
  const [colsMap,       setColsMap]       = useState({});

  const loadSchemas = useCallback(async () => {
    setSchemasLoading(true);
    setSchemasError(null);
    try {
      const data = await tablesService.getSchemas();
      setSchemas(data.schemas || { raw: [], staging: [], public: [] });
    } catch (err) {
      setSchemasError(err.response?.data?.error || err.message || 'Error al cargar schemas.');
    } finally {
      setSchemasLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'pipeline') loadSchemas();
  }, [activeTab, loadSchemas]);

  // Filtrar tablas por secretaría y búsqueda
  function filterTables(tables) {
    return tables.filter(t => {
      // Filtrar por secretaría del upload
      if (t.upload && t.upload.secretaria_id && t.upload.secretaria_id !== secretariaId) return false;
      if (!pipeSearch) return true;
      const s = pipeSearch.toLowerCase();
      return (t.tableName || '').toLowerCase().includes(s)
          || (t.upload?.nombre_archivo || '').toLowerCase().includes(s);
    });
  }

  // Toggle columnas de una tabla pipeline
  async function toggleCols(schema, tableName) {
    const key = `${schema}.${tableName}`;
    if (colsMap[key]) {
      // ya está abierto → cerrar
      setColsMap(prev => { const n = { ...prev }; delete n[key]; return n; });
      return;
    }
    setColsMap(prev => ({ ...prev, [key]: { loading: true, columns: null, error: null } }));
    try {
      const info = await tablesService.getInfo(schema, tableName);
      setColsMap(prev => ({ ...prev, [key]: { loading: false, columns: info.columns, rowCount: info.rowCount, error: null } }));
    } catch (err) {
      setColsMap(prev => ({ ...prev, [key]: { loading: false, columns: null, error: err.response?.data?.error || err.message } }));
    }
  }

  /* ──────────────────── GUARD ───────────────────────────────────────────── */

  if (!secretaria) {
    return (
      <div className="dex-error-page">
        <p>Secretaría no encontrada.</p>
        <button onClick={() => navigate('/dashboard')}>Volver</button>
      </div>
    );
  }

  /* ═══════════════════════ RENDER ═══════════════════════ */
  return (
    <div className="dex-page">

      {/* ── Header ── */}
      <header className="dex-header">
        <div className="dex-header-left">
          <div className="dex-header-brand">
            <img src="/logos/logocolombia.png" alt="Colombia" className="dex-logo" />
            <img src="/logos/alcaldia.png"     alt="Alcaldía" className="dex-logo" />
            <div className="dex-header-text">
              <div className="dex-entity">Alcaldía Municipal · Santander de Quilichao</div>
              <div className="dex-sec-name" style={{ color: secColor }}>
                {secretaria.name}
              </div>
            </div>
          </div>
        </div>
        <div className="dex-header-right">
          {user && (
            <span className="dex-user-badge">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="7" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
              {user.username} · {user.role}
            </span>
          )}
          <button className="dex-nav-btn" onClick={() => navigate(`/portal/${secretariaId}`)}>
            ← Portal
          </button>
          {isAdmin && (
            <button className="dex-nav-btn" onClick={() => navigate('/dashboard')}>
              ← Dashboard
            </button>
          )}
        </div>
      </header>
      <div className="dex-band" style={{ background: secColor }} />

      {/* ── Scroll container ── */}
      <div className="dex-scroll">
        <main className="dex-main">

          {/* Hero */}
          <div className="dex-hero">
            <div className="dex-hero-icon" style={{ background: secColor }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5"
                   strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <div>
              <h1 className="dex-title">Explorar Datos</h1>
              <p className="dex-subtitle">
                Gestiona los archivos cargados y el pipeline ETL de esta secretaría.
              </p>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="dex-tabs">
            <button
              className={`dex-tab${activeTab === 'historial' ? ' dex-tab--active' : ''}`}
              style={activeTab === 'historial' ? { borderBottomColor: secColor, color: secColor } : {}}
              onClick={() => switchTab('historial')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                   strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/>
                <polyline points="13 2 13 9 20 9"/>
              </svg>
              Archivos Cargados
              <span className="dex-tab-count">{uploads.length}</span>
            </button>
            <button
              className={`dex-tab${activeTab === 'pipeline' ? ' dex-tab--active' : ''}`}
              style={activeTab === 'pipeline' ? { borderBottomColor: '#6D28D9', color: '#6D28D9' } : {}}
              onClick={() => switchTab('pipeline')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                   strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                <path d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
              Pipeline de Datos
              {!schemasLoading && (
                <span className="dex-tab-count" style={{ background: '#EDE9FE', color: '#6D28D9' }}>
                  {(schemas.raw?.length || 0) + (schemas.staging?.length || 0) + (schemas.public?.length || 0)}
                </span>
              )}
            </button>
          </div>

          {/* ═══════ CONTENIDO TABS ═══════ */}

          {activeTab === 'historial' && (
            <>
              {/* ── Toolbar ── */}
              <div className="dex-toolbar">
                <div className="dex-search-box">
                  <svg className="dex-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input
                    className="dex-search-input"
                    type="text"
                    placeholder="Buscar por nombre o tabla..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  {search && (
                    <button className="dex-search-clear" onClick={() => setSearch('')}>✕</button>
                  )}
                </div>
                <div className="dex-toolbar-right">
                  <span className="dex-count">{filtered.length} archivo{filtered.length !== 1 ? 's' : ''}</span>
                  <Link to={`/portal/${secretariaId}/upload`} className="dex-upload-link" style={{ background: secColor }}>
                    + Subir archivo
                  </Link>
                </div>
              </div>

              {/* ── Lista uploads ── */}
              <section className="dex-section">
                {loading ? (
                  <div className="dex-state">
                    <span className="dex-spinner" style={{ borderTopColor: secColor }} />
                    Cargando archivos…
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="dex-state dex-state--empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"
                         width="48" height="48" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/>
                      <polyline points="13 2 13 9 20 9"/>
                    </svg>
                    <p>{search ? 'No se encontraron archivos con ese filtro.' : 'No hay archivos cargados para esta secretaría.'}</p>
                    <Link to={`/portal/${secretariaId}/upload`} className="dex-empty-link" style={{ color: secColor }}>
                      Subir el primer archivo →
                    </Link>
                  </div>
                ) : (
                  <div className="dex-list">
                    {filtered.map((u) => {
                      const id        = u.id;
                      const isOpen    = openId === id;
                      const isConfirm = confirmId === id;
                      const isDeleting = deletingId === id;
                      const nombre    = u.nombre_archivo || 'Sin nombre';
                      const tabla     = u.tabla_destino  || '—';
                      const tipo      = u.tipo_archivo   || nombre.split('.').pop() || '?';
                      const estado    = u.estado         || 'pendiente';
                      const filas     = u.filas_procesadas ?? null;
                      const errores   = u.filas_error    ?? 0;
                      const fecha     = u.created_at;
                      const tieneGeom = !!(u.columna_lat || u.tipo_geometria);
                      const statusCfg = STATUS_CFG[estado] || STATUS_CFG.pendiente;

                      return (
                        <div key={id} className={`dex-card${isOpen ? ' dex-card--open' : ''}${isConfirm ? ' dex-card--confirm' : ''}`}>
                          <div className="dex-card-row">
                            <button className="dex-card-header" onClick={() => { setConfirmId(null); togglePreview(u); }}>
                              <span className="dex-card-ext" style={{ background: secColor }}>
                                {fileIcon(tipo)}
                              </span>
                              <div className="dex-card-info">
                                <span className="dex-card-name">{nombre}</span>
                                <span className="dex-card-table"><code>{tabla}</code></span>
                              </div>
                              <div className="dex-card-stats">
                                <span className="dex-card-rows">
                                  {filas != null ? `${filas.toLocaleString('es-CO')} filas` : '—'}
                                </span>
                                {errores > 0 && (
                                  <span className="dex-card-errs">{errores} error{errores > 1 ? 'es' : ''}</span>
                                )}
                              </div>
                              <span className={`dex-badge dex-badge--${statusCfg.cls}`}>
                                {statusCfg.label}
                              </span>
                              <span className="dex-card-date">{relativeDate(fecha)}</span>
                              {u.usuario_nombre && (
                                <span className="dex-card-user">{u.usuario_nombre}</span>
                              )}
                              <svg className={`dex-card-chevron${isOpen ? ' dex-card-chevron--open' : ''}`}
                                   viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                   strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                                <polyline points="6 9 12 15 18 9"/>
                              </svg>
                            </button>

                            <div className="dex-card-actions">
                              {/* Botón procesar en pipeline */}
                              {estado === 'completado' && (
                                <button
                                  className="dex-action-btn dex-action-btn--pipeline"
                                  title="Procesar en Pipeline ETL"
                                  onClick={() => navigate(`/portal/${secretariaId}/process/${id}`)}
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                       strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                                    <path d="M4 6h16M4 12h16M4 18h16"/>
                                  </svg>
                                  <span>Pipeline</span>
                                </button>
                              )}
                              {tieneGeom && estado === 'completado' && (
                                <button
                                  className="dex-action-btn dex-action-btn--map"
                                  title="Ver en el mapa"
                                  onClick={() => navigate(`/mapa/${secretariaId}`)}
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                       strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                                    <circle cx="12" cy="12" r="9"/>
                                    <path d="M3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 010 18M12 3a15 15 0 000 18"/>
                                  </svg>
                                  <span>Mapa</span>
                                </button>
                              )}
                              <button
                                className="dex-action-btn dex-action-btn--delete"
                                title="Eliminar"
                                disabled={isDeleting}
                                onClick={() => setConfirmId(isConfirm ? null : id)}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                     strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                                  <polyline points="3 6 5 6 21 6"/>
                                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                                  <path d="M10 11v6M14 11v6"/>
                                  <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                                </svg>
                                <span>Eliminar</span>
                              </button>
                            </div>
                          </div>

                          {isConfirm && (
                            <div className="dex-confirm">
                              <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"
                                   strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                                <line x1="12" y1="9" x2="12" y2="13"/>
                                <line x1="12" y1="17" x2="12.01" y2="17"/>
                              </svg>
                              <span>
                                Se eliminará <strong>{nombre}</strong> y su tabla <code>{tabla}</code> de la base de datos.
                                Esta acción <strong>no se puede deshacer</strong>.
                              </span>
                              <div className="dex-confirm-btns">
                                <button
                                  className="dex-confirm-btn dex-confirm-btn--cancel"
                                  onClick={() => setConfirmId(null)}
                                  disabled={isDeleting}
                                >
                                  Cancelar
                                </button>
                                <button
                                  className="dex-confirm-btn dex-confirm-btn--delete"
                                  onClick={() => handleDelete(id)}
                                  disabled={isDeleting}
                                >
                                  {isDeleting ? 'Eliminando…' : 'Sí, eliminar'}
                                </button>
                              </div>
                            </div>
                          )}

                          {isOpen && (
                            <div className="dex-preview">
                              {previewLoading && (
                                <div className="dex-preview-state">
                                  <span className="dex-spinner dex-spinner--sm" style={{ borderTopColor: secColor }} />
                                  Cargando vista previa…
                                </div>
                              )}
                              {!previewLoading && previewError && (
                                <div className="dex-preview-state dex-preview-state--error">{previewError}</div>
                              )}
                              {!previewLoading && previewData && previewData.rows.length === 0 && (
                                <div className="dex-preview-state">La tabla no contiene registros.</div>
                              )}
                              {!previewLoading && previewData && previewData.rows.length > 0 && (
                                <>
                                  <div className="dex-preview-bar">
                                    <span className="dex-preview-count">
                                      Mostrando {previewData.rows.length} de {filas ?? '?'} registros
                                    </span>
                                    <span className="dex-preview-cols">
                                      {previewData.columns.length} columna{previewData.columns.length !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                  <div className="dex-preview-scroll">
                                    <table className="dex-table">
                                      <thead>
                                        <tr>
                                          <th className="dex-table-rownum">#</th>
                                          {previewData.columns.map(col => <th key={col}>{col}</th>)}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {previewData.rows.map((row, ri) => (
                                          <tr key={ri}>
                                            <td className="dex-table-rownum">{ri + 1}</td>
                                            {previewData.columns.map(col => (
                                              <td key={col}>
                                                <span className="dex-cell">
                                                  {row[col] != null ? String(row[col]) : ''}
                                                </span>
                                              </td>
                                            ))}
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}

          {activeTab === 'pipeline' && (
            <>
              {/* ── Toolbar pipeline ── */}
              <div className="dex-toolbar">
                <div className="dex-search-box">
                  <svg className="dex-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input
                    className="dex-search-input"
                    type="text"
                    placeholder="Buscar por nombre de tabla o archivo..."
                    value={pipeSearch}
                    onChange={e => setPipeSearch(e.target.value)}
                  />
                  {pipeSearch && (
                    <button className="dex-search-clear" onClick={() => setPipeSearch('')}>✕</button>
                  )}
                </div>
                <div className="dex-toolbar-right">
                  {isAdmin && (
                    <button className="dex-upload-link" style={{ background: '#6D28D9' }}
                      onClick={() => navigate('/pipeline/schemas')}>
                      Gestionar schemas →
                    </button>
                  )}
                </div>
              </div>

              {schemasLoading && (
                <div className="dex-state">
                  <span className="dex-spinner" style={{ borderTopColor: '#6D28D9' }} />
                  Cargando pipeline…
                </div>
              )}
              {schemasError && (
                <div className="dex-state dex-state--empty">
                  <p style={{ color: '#DC2626' }}>{schemasError}</p>
                  <button className="dex-empty-link" style={{ color: '#6D28D9' }} onClick={loadSchemas}>
                    Reintentar
                  </button>
                </div>
              )}

              {!schemasLoading && !schemasError && (
                <div className="dex-pipeline-sections">
                  {['raw', 'staging', 'public'].map(schemaKey => {
                    const cfg    = SCHEMA_CFG[schemaKey];
                    const tables = filterTables(schemas[schemaKey] || []);
                    return (
                      <section key={schemaKey} className="dex-schema-section">
                        <div className="dex-schema-header">
                          <span className="dex-schema-badge" style={{ background: cfg.bg, color: cfg.color }}>
                            {cfg.label}
                          </span>
                          <span className="dex-schema-count">
                            {tables.length} tabla{tables.length !== 1 ? 's' : ''}
                          </span>
                        </div>

                        {tables.length === 0 ? (
                          <div className="dex-schema-empty">
                            Sin tablas {pipeSearch ? 'con ese filtro' : 'en este schema'}.
                          </div>
                        ) : (
                          <div className="dex-pipe-list">
                            {tables.map(t => {
                              const key    = `${schemaKey}.${t.tableName}`;
                              const colInfo = colsMap[key];
                              const isColOpen = !!colInfo;

                              return (
                                <div key={key} className={`dex-pipe-card${isColOpen ? ' dex-pipe-card--open' : ''}`}>
                                  <button className="dex-pipe-card-header" onClick={() => toggleCols(schemaKey, t.tableName)}>
                                    {/* Icono schema */}
                                    <span className="dex-pipe-schema-dot" style={{ background: cfg.color }} />

                                    {/* Info tabla */}
                                    <div className="dex-card-info">
                                      <span className="dex-card-name">
                                        <code>{t.tableName}</code>
                                      </span>
                                      {t.upload?.nombre_archivo && (
                                        <span className="dex-card-table">
                                          {fileIcon((t.upload.nombre_archivo || '').split('.').pop())} {t.upload.nombre_archivo}
                                        </span>
                                      )}
                                    </div>

                                    {/* Stats */}
                                    <div className="dex-card-stats">
                                      <span className="dex-card-rows">{t.approxRows?.toLocaleString('es-CO') ?? '?'} filas</span>
                                      <span className="dex-card-rows" style={{ color: '#64748B' }}>{t.columnCount} cols</span>
                                      {t.sizePretty && (
                                        <span className="dex-card-rows" style={{ color: '#94A3B8' }}>{t.sizePretty}</span>
                                      )}
                                    </div>

                                    {/* ETL status badge */}
                                    {t.upload?.etl_status && (
                                      <span className="dex-badge dex-badge--etl"
                                        style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.color }}>
                                        {t.upload.etl_status}
                                      </span>
                                    )}

                                    <svg className={`dex-card-chevron${isColOpen ? ' dex-card-chevron--open' : ''}`}
                                         viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                         strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                                      <polyline points="6 9 12 15 18 9"/>
                                    </svg>
                                  </button>

                                  {/* Acciones rápidas */}
                                  <div className="dex-card-actions">
                                    {t.upload?.id && (
                                      <button
                                        className="dex-action-btn dex-action-btn--pipeline"
                                        title="Ir al ProcessingPage"
                                        onClick={() => navigate(`/portal/${secretariaId}/process/${t.upload.id}`)}
                                      >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                             strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                                          <path d="M4 6h16M4 12h16M4 18h16"/>
                                        </svg>
                                        <span>Procesar</span>
                                      </button>
                                    )}
                                  </div>

                                  {/* ── Mapeo de columnas ── */}
                                  {isColOpen && (
                                    <div className="dex-cols-panel">
                                      {colInfo.loading && (
                                        <div className="dex-preview-state">
                                          <span className="dex-spinner dex-spinner--sm" style={{ borderTopColor: cfg.color }} />
                                          Leyendo columnas…
                                        </div>
                                      )}
                                      {colInfo.error && (
                                        <div className="dex-preview-state dex-preview-state--error">{colInfo.error}</div>
                                      )}
                                      {colInfo.columns && (
                                        <>
                                          <div className="dex-cols-header">
                                            <span className="dex-cols-title">
                                              Mapeo de columnas — {colInfo.columns.length} campos
                                              {colInfo.rowCount != null && ` · ${colInfo.rowCount.toLocaleString('es-CO')} registros`}
                                            </span>
                                          </div>
                                          <div className="dex-cols-table-wrap">
                                            <table className="dex-cols-table">
                                              <thead>
                                                <tr>
                                                  <th>#</th>
                                                  <th>Columna</th>
                                                  <th>Tipo</th>
                                                  <th>Nullable</th>
                                                  <th>Default</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {colInfo.columns.map((col, i) => (
                                                  <tr key={col.column_name}>
                                                    <td className="dex-table-rownum">{i + 1}</td>
                                                    <td>
                                                      <span className="dex-col-name">{col.column_name}</span>
                                                    </td>
                                                    <td>{typeChip(col.data_type)}</td>
                                                    <td>
                                                      <span className={`dex-nullable${col.is_nullable === 'YES' ? ' dex-nullable--yes' : ' dex-nullable--no'}`}>
                                                        {col.is_nullable === 'YES' ? 'Sí' : 'No'}
                                                      </span>
                                                    </td>
                                                    <td>
                                                      <span className="dex-cell dex-cell--default">
                                                        {col.column_default || '—'}
                                                      </span>
                                                    </td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>
              )}
            </>
          )}

        </main>
      </div>
    </div>
  );
}
