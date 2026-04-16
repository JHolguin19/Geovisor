import { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { etlService } from '../services/api.js';
import './DataPipelinePage.css';

// ─── CONSTANTES ───────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  legacy:     { label: 'Legacy',      color: '#9E9E9E', bg: '#F5F5F5',  column: 'production' },
  raw:        { label: 'En Ingesta',  color: '#F59E0B', bg: '#FFFBEB',  column: 'raw' },
  processing: { label: 'Procesando',  color: '#3B82F6', bg: '#EFF6FF',  column: 'staging' },
  staging:    { label: 'En Revisión', color: '#F97316', bg: '#FFF7ED',  column: 'staging' },
  validated:  { label: 'Validado',    color: '#8B5CF6', bg: '#F5F3FF',  column: 'staging' },
  production: { label: 'Publicado',   color: '#10B981', bg: '#ECFDF5',  column: 'production' },
  error:      { label: 'Error',       color: '#EF4444', bg: '#FEF2F2',  column: 'raw' },
};

const COLUMNS = [
  {
    id: 'raw',
    label: 'Ingesta',
    sublabel: 'Archivos recibidos',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
    ),
    statuses: ['raw', 'error', 'legacy'],
    accent: '#F59E0B',
  },
  {
    id: 'staging',
    label: 'Procesamiento',
    sublabel: 'Validación y georref.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    statuses: ['processing', 'staging', 'validated'],
    accent: '#F97316',
  },
  {
    id: 'production',
    label: 'Producción',
    sublabel: 'Disponible en el mapa',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
      </svg>
    ),
    statuses: ['production'],
    accent: '#10B981',
  },
];

const FILE_ICONS = {
  excel: '📊', xlsx: '📊', xls: '📊',
  csv:   '📋',
  json:  '🗺️', geojson: '🗺️',
  default: '📁',
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function getFileIcon(tipo) {
  return FILE_ICONS[tipo?.toLowerCase()] || FILE_ICONS.default;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatRows(stats) {
  if (!stats) return null;
  const total = stats.total || 0;
  if (total === 0) return null;
  return total.toLocaleString('es-CO') + ' filas';
}

// ─── SUBCOMPONENTES ───────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.legacy;
  return (
    <span className="pipeline-badge" style={{ '--badge-color': cfg.color, '--badge-bg': cfg.bg }}>
      <span className="pipeline-badge__dot" />
      {cfg.label}
    </span>
  );
}

function StatPill({ status, count, active, onClick }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.legacy;
  return (
    <button
      className={`stat-pill ${active ? 'stat-pill--active' : ''}`}
      style={{ '--pill-color': cfg.color }}
      onClick={onClick}
    >
      <span className="stat-pill__count">{count}</span>
      <span className="stat-pill__label">{cfg.label}</span>
    </button>
  );
}

function PipelineCard({ item, onPromote, onReject }) {
  const navigate = useNavigate();
  const cfg = STATUS_CONFIG[item.etl_status] || STATUS_CONFIG.legacy;
  const stats = item.job_stats;
  const rowCount = formatRows(stats);

  const handleProcess = () => {
    navigate(`/portal/${item.secretaria_id}/process/${item.upload_id}`);
  };
  const handleReview = () => {
    navigate(`/portal/${item.secretaria_id}/process/${item.upload_id}`, {
      state: { reviewMode: true, jobId: item.job_id },
    });
  };
  const handleViewData = () => {
    navigate(`/portal/${item.secretaria_id}/datos`);
  };

  return (
    <article
      className="pipeline-card"
      style={{ '--card-accent': cfg.color }}
    >
      <header className="pipeline-card__header">
        <span className="pipeline-card__icon">{getFileIcon(item.tipo_archivo)}</span>
        <div className="pipeline-card__meta">
          <h3 className="pipeline-card__filename" title={item.nombre_archivo}>
            {item.nombre_archivo}
          </h3>
          <span
            className="pipeline-card__secretaria"
            style={{ color: item.secretaria_color || '#1E3A5F' }}
          >
            {item.secretaria_nombre || item.secretaria_id}
          </span>
        </div>
        <StatusBadge status={item.etl_status} />
      </header>

      <div className="pipeline-card__body">
        {rowCount && (
          <span className="pipeline-card__rows">
            <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12">
              <path d="M0 2a2 2 0 012-2h12a2 2 0 012 2v1H0V2zM0 5h16v2H0V5zm0 4h16v2H0V9zm0 4h16v1a2 2 0 01-2 2H2a2 2 0 01-2-2v-1z"/>
            </svg>
            {rowCount}
          </span>
        )}
        {stats?.quality_pct != null && item.etl_status !== 'raw' && (
          <span className="pipeline-card__quality">
            {stats.quality_pct}% calidad
          </span>
        )}
        <span className="pipeline-card__date">{formatDate(item.created_at)}</span>
      </div>

      {/* Quality bar for staging items */}
      {stats?.quality_pct != null && item.etl_status === 'staging' && (
        <div className="pipeline-card__progress">
          <div
            className="pipeline-card__progress-fill"
            style={{ width: `${stats.quality_pct}%`, '--progress-color': cfg.color }}
          />
        </div>
      )}

      <footer className="pipeline-card__actions">
        {item.etl_status === 'raw' && (
          <button className="card-btn card-btn--primary" onClick={handleProcess}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            Procesar
          </button>
        )}

        {['staging', 'validated', 'completado'].includes(item.etl_status) && (
          <>
            <button className="card-btn card-btn--review" onClick={handleReview}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              Revisar
            </button>
            {item.job_id && (
              <button className="card-btn card-btn--publish" onClick={() => onPromote(item.job_id, item)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Publicar
              </button>
            )}
          </>
        )}

        {item.etl_status === 'error' && (
          <button className="card-btn card-btn--retry" onClick={handleProcess}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
            </svg>
            Reintentar
          </button>
        )}

        {item.etl_status === 'production' && (
          <button className="card-btn card-btn--view" onClick={handleViewData}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            Ver datos
          </button>
        )}
      </footer>
    </article>
  );
}

function KanbanColumn({ column, items, onPromote, onReject }) {
  const colItems = items.filter(i => STATUS_CONFIG[i.etl_status]?.column === column.id);

  return (
    <div className="kanban-column">
      <div className="kanban-column__header" style={{ '--col-accent': column.accent }}>
        <div className="kanban-column__icon">{column.icon}</div>
        <div className="kanban-column__titles">
          <h2 className="kanban-column__label">{column.label}</h2>
          <span className="kanban-column__sublabel">{column.sublabel}</span>
        </div>
        <span className="kanban-column__count">{colItems.length}</span>
      </div>

      <div className="kanban-column__body">
        {colItems.length === 0 ? (
          <div className="kanban-empty">
            <span className="kanban-empty__icon">📭</span>
            <span className="kanban-empty__text">Sin datasets aquí</span>
          </div>
        ) : (
          colItems.map(item => (
            <PipelineCard
              key={item.upload_id}
              item={item}
              onPromote={onPromote}
              onReject={onReject}
            />
          ))
        )}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="pipeline-card pipeline-card--skeleton">
      <div className="skel skel--title" />
      <div className="skel skel--sub" />
      <div className="skel skel--bar" />
    </div>
  );
}

function TableView({ items }) {
  const navigate = useNavigate();
  return (
    <div className="pipeline-table-wrap">
      <table className="pipeline-table">
        <thead>
          <tr>
            <th>Archivo</th>
            <th>Secretaría</th>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Estado ETL</th>
            <th>Calidad</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.upload_id}>
              <td>
                <span className="table-filename">
                  {getFileIcon(item.tipo_archivo)} {item.nombre_archivo}
                </span>
              </td>
              <td>
                <span style={{ color: item.secretaria_color || '#1E3A5F', fontWeight: 600, fontSize: '0.82rem' }}>
                  {item.secretaria_nombre || item.secretaria_id}
                </span>
              </td>
              <td>{formatDate(item.created_at)}</td>
              <td><span className="table-tipo">{item.tipo_archivo}</span></td>
              <td><StatusBadge status={item.etl_status} /></td>
              <td>
                {item.job_stats?.quality_pct != null
                  ? `${item.job_stats.quality_pct}%`
                  : '—'}
              </td>
              <td>
                {['raw', 'error'].includes(item.etl_status) && (
                  <button
                    className="table-action"
                    onClick={() => navigate(`/portal/${item.secretaria_id}/process/${item.upload_id}`)}
                  >
                    Procesar
                  </button>
                )}
                {['staging', 'validated'].includes(item.etl_status) && (
                  <button
                    className="table-action"
                    onClick={() => navigate(`/portal/${item.secretaria_id}/process/${item.upload_id}`, {
                      state: { reviewMode: true, jobId: item.job_id },
                    })}
                  >
                    Revisar
                  </button>
                )}
                {item.etl_status === 'production' && (
                  <button
                    className="table-action table-action--view"
                    onClick={() => navigate(`/portal/${item.secretaria_id}/datos`)}
                  >
                    Ver datos
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function DataPipelinePage() {
  const { user }   = useContext(AuthContext);
  const navigate   = useNavigate();
  const isPrivileged = ['admin', 'editor_geo'].includes(user?.role);

  const [items,        setItems]        = useState([]);
  const [stats,        setStats]        = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [view,         setView]         = useState('kanban'); // 'kanban' | 'table'
  const [statusFilter, setStatusFilter] = useState(null);
  const [search,       setSearch]       = useState('');
  const [promoting,    setPromoting]    = useState(null);
  const [error,        setError]        = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [histRes, statsRes] = await Promise.all([
        etlService.getHistory({ limit: 100 }),
        etlService.getStats(),
      ]);
      setItems(histRes.data?.items || []);
      setStats(statsRes.data || {});
      setError(null);
    } catch (e) {
      setError('No se pudo cargar el pipeline. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePromote = async (jobId, item) => {
    if (!window.confirm(`¿Publicar "${item.nombre_archivo}" en producción?`)) return;
    setPromoting(jobId);
    try {
      await etlService.promote(jobId, { create_layer: true, layer_name: item.nombre_archivo });
      await fetchData();
    } catch (e) {
      alert('Error al publicar: ' + (e.response?.data?.error || e.message));
    } finally {
      setPromoting(null);
    }
  };

  const handleReject = async (jobId) => {
    const reason = window.prompt('Motivo del rechazo (opcional):');
    if (reason === null) return; // cancelled
    try {
      await etlService.reject(jobId, reason);
      await fetchData();
    } catch (e) {
      alert('Error: ' + (e.response?.data?.error || e.message));
    }
  };

  // Filtros aplicados
  const filtered = items.filter(item => {
    if (statusFilter && item.etl_status !== statusFilter) return false;
    if (search && !item.nombre_archivo?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalItems = stats
    ? Object.values(stats).reduce((a, b) => (typeof b === 'number' ? a + b : a), 0) - (stats.total || 0)
    : 0;

  return (
    <div className="pipeline-page">
      <div className="pipeline-scroll">
      {/* ── MIGAS DE PAN ── */}
      <nav className="pipeline-breadcrumb">
        <button className="breadcrumb-link" onClick={() => navigate('/dashboard')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          Dashboard
        </button>
        <span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-current">Pipeline de Datos</span>
      </nav>

      {/* ── ENCABEZADO ── */}
      <div className="pipeline-page__head">
        <div className="pipeline-page__title-group">
          <div className="pipeline-page__icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="6" height="18" rx="1"/>
              <rect x="9" y="8" width="6" height="13" rx="1"/>
              <rect x="16" y="5" width="6" height="16" rx="1"/>
            </svg>
          </div>
          <div>
            <h1 className="pipeline-page__title">Pipeline de Datos</h1>
            <p className="pipeline-page__subtitle">
              Gestión de datos geoespaciales —{' '}
              {isPrivileged ? 'Vista global' : user?.secretaria}
            </p>
          </div>
        </div>

        <div className="pipeline-page__controls">
          <button
            className="view-toggle"
            onClick={() => navigate('/pipeline/schemas')}
            title="Gestionar tablas entre schemas"
            style={{ marginRight: '0.5rem', color: '#1E3A5F', borderColor: '#BFDBFE', background: '#EFF6FF' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
              <ellipse cx="12" cy="5" rx="9" ry="3"/>
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
            </svg>
            Schemas
          </button>
          <button
            className={`view-toggle ${view === 'kanban' ? 'view-toggle--active' : ''}`}
            onClick={() => setView('kanban')}
            title="Vista Kanban"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <rect x="3" y="3" width="5" height="18" rx="1"/>
              <rect x="10" y="3" width="5" height="18" rx="1"/>
              <rect x="17" y="3" width="5" height="18" rx="1"/>
            </svg>
          </button>
          <button
            className={`view-toggle ${view === 'table' ? 'view-toggle--active' : ''}`}
            onClick={() => setView('table')}
            title="Vista tabla"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <button className="refresh-btn" onClick={fetchData} title="Actualizar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── ERROR ── */}
      {error && (
        <div className="pipeline-error">
          <span>⚠️ {error}</span>
          <button onClick={fetchData}>Reintentar</button>
        </div>
      )}

      {/* ── STATS PILLS ── */}
      {stats && (
        <div className="stats-bar">
          {Object.entries(STATUS_CONFIG).map(([key]) => {
            const count = stats[key] || 0;
            if (count === 0 && key === 'legacy') return null;
            return (
              <StatPill
                key={key}
                status={key}
                count={count}
                active={statusFilter === key}
                onClick={() => setStatusFilter(statusFilter === key ? null : key)}
              />
            );
          })}
          {statusFilter && (
            <button className="clear-filter" onClick={() => setStatusFilter(null)}>
              ✕ Limpiar filtro
            </button>
          )}
        </div>
      )}

      {/* ── BARRA DE FILTROS ── */}
      <div className="filter-bar">
        <div className="filter-bar__search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Buscar por nombre de archivo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="filter-bar__input"
          />
          {search && (
            <button className="filter-bar__clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>

        <div className="filter-bar__info">
          {!loading && (
            <span className="filter-bar__count">
              {filtered.length} dataset{filtered.length !== 1 ? 's' : ''}
              {statusFilter || search ? ` de ${items.length} total` : ''}
            </span>
          )}
        </div>
      </div>

      {/* ── CONTENIDO ── */}
      {loading ? (
        <div className="kanban-board-wrap">
          <div className="kanban-board">
            {COLUMNS.map(col => (
              <div className="kanban-column" key={col.id}>
                <div className="kanban-column__header" style={{ '--col-accent': col.accent }}>
                  <div className="kanban-column__icon">{col.icon}</div>
                  <div className="kanban-column__titles">
                    <h2 className="kanban-column__label">{col.label}</h2>
                    <span className="kanban-column__sublabel">{col.sublabel}</span>
                  </div>
                </div>
                <div className="kanban-column__body">
                  <SkeletonCard /><SkeletonCard /><SkeletonCard />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="pipeline-empty">
          <div className="pipeline-empty__illustration">
            <svg viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="10" y="20" width="30" height="60" rx="4" fill="#E5E7EB" stroke="#D1D5DB" strokeWidth="1.5"/>
              <rect x="45" y="35" width="30" height="45" rx="4" fill="#E5E7EB" stroke="#D1D5DB" strokeWidth="1.5"/>
              <rect x="80" y="28" width="30" height="52" rx="4" fill="#E5E7EB" stroke="#D1D5DB" strokeWidth="1.5"/>
              <circle cx="60" cy="50" r="14" fill="#F9FAFB" stroke="#9CA3AF" strokeWidth="1.5" strokeDasharray="3 2"/>
              <path d="M55 50h10M60 45v10" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h3 className="pipeline-empty__title">Sin datos en el pipeline</h3>
          <p className="pipeline-empty__text">
            {search || statusFilter
              ? 'No hay resultados con los filtros actuales.'
              : 'Aún no se han subido archivos. Dirígete al portal de tu secretaría para comenzar.'}
          </p>
          {(search || statusFilter) && (
            <button className="pipeline-empty__btn" onClick={() => { setSearch(''); setStatusFilter(null); }}>
              Limpiar filtros
            </button>
          )}
        </div>
      ) : view === 'kanban' ? (
        <div className="kanban-board-wrap">
          <div className="kanban-board">
            {COLUMNS.map(col => (
              <KanbanColumn
                key={col.id}
                column={col}
                items={filtered}
                onPromote={handlePromote}
                onReject={handleReject}
              />
            ))}
          </div>
        </div>
      ) : (
        <TableView items={filtered} />
      )}
      </div>{/* /pipeline-scroll */}
    </div>
  );
}
