/**
 * SchemaManagerPage — Gestión de tablas entre schemas
 *
 * Muestra todas las tablas de raw / staging / public
 * con acciones para mover, renombrar y eliminar.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { tablesService } from '../services/api.js';
import './SchemaManagerPage.css';

// ─── Configuración visual por schema ─────────────────────────────────────────
const SCHEMA_META = {
  raw: {
    label:    'RAW',
    desc:     'Datos crudos recién subidos, sin transformar',
    color:    '#F59E0B',
    bg:       '#FFFBEB',
    border:   '#FDE68A',
    icon:     '📥',
    targets:  ['staging', 'public'],
  },
  staging: {
    label:    'STAGING',
    desc:     'Datos transformados y validados, pendientes de publicar',
    color:    '#F97316',
    bg:       '#FFF7ED',
    border:   '#FED7AA',
    icon:     '🔧',
    targets:  ['public', 'raw'],
  },
  public: {
    label:    'PÚBLICO',
    desc:     'Datos publicados disponibles en el mapa y la API',
    color:    '#10B981',
    bg:       '#ECFDF5',
    border:   '#A7F3D0',
    icon:     '🌐',
    targets:  ['staging'],
  },
};

const TARGET_LABELS = {
  raw:     { label: 'Mover a RAW',     color: '#D97706' },
  staging: { label: 'Mover a Staging', color: '#EA580C' },
  public:  { label: 'Publicar',        color: '#059669' },
};

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="sm-card sm-card--skeleton">
      <div className="sm-sk sm-sk--name" />
      <div className="sm-sk sm-sk--meta" />
      <div className="sm-sk sm-sk--actions" />
    </div>
  );
}

function TableCard({ table, onMove, onRename, onDrop }) {
  const [open,       setOpen]       = useState(false);
  const [renaming,   setRenaming]   = useState(false);
  const [newName,    setNewName]    = useState(table.tableName);
  const [busy,       setBusy]       = useState(false);

  const meta = SCHEMA_META[table.schema];
  const targets = meta?.targets || [];

  const handleMove = async (toSchema) => {
    if (busy) return;
    setBusy(true);
    try { await onMove(table.schema, table.tableName, toSchema); }
    finally { setBusy(false); }
  };

  const handleRename = async () => {
    if (!newName.trim() || newName === table.tableName || busy) return;
    setBusy(true);
    try {
      await onRename(table.schema, table.tableName, newName.trim());
      setRenaming(false);
    } finally { setBusy(false); }
  };

  const handleDrop = async () => {
    if (!window.confirm(
      `¿Eliminar definitivamente la tabla "${table.schema}.${table.tableName}"?\n\nEsta acción NO se puede deshacer.`
    )) return;
    if (busy) return;
    setBusy(true);
    try { await onDrop(table.schema, table.tableName); }
    finally { setBusy(false); }
  };

  return (
    <div className={`sm-card sm-card--${table.schema}`}>
      {/* Header */}
      <div className="sm-card__header">
        <div className="sm-card__info">
          <span className="sm-card__name" title={table.tableName}>
            {table.tableName}
          </span>
          {table.upload && (
            <span className="sm-card__origin">
              <span
                className="sm-card__origin-dot"
                style={{ background: table.upload.secretaria_color || '#94A3B8' }}
              />
              {table.upload.secretaria_nombre} — {table.upload.nombre_archivo}
            </span>
          )}
        </div>
        <button
          className={`sm-expand-btn${open ? ' sm-expand-btn--open' : ''}`}
          onClick={() => setOpen(!open)}
          aria-label="Expandir"
        >▾</button>
      </div>

      {/* Meta pills */}
      <div className="sm-card__meta">
        <span className="sm-pill sm-pill--gray">{table.sizePretty}</span>
        <span className="sm-pill sm-pill--gray">{table.approxRows?.toLocaleString('es-CO') || '?'} filas</span>
        <span className="sm-pill sm-pill--gray">{table.columnCount} cols</span>
      </div>

      {/* Expanded: acciones */}
      {open && (
        <div className="sm-card__actions">
          {/* Mover */}
          {targets.map(target => {
            const cfg = TARGET_LABELS[target];
            return (
              <button
                key={target}
                className="sm-action-btn"
                style={{ '--btn-color': cfg.color }}
                onClick={() => handleMove(target)}
                disabled={busy}
              >
                {busy ? '⏳' : '→'} {cfg.label}
              </button>
            );
          })}

          {/* Renombrar */}
          {renaming ? (
            <div className="sm-rename-row">
              <input
                className="sm-rename-input"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRename()}
                autoFocus
              />
              <button className="sm-action-btn sm-action-btn--confirm" onClick={handleRename} disabled={busy}>
                ✓
              </button>
              <button className="sm-action-btn sm-action-btn--cancel" onClick={() => { setRenaming(false); setNewName(table.tableName); }}>
                ✕
              </button>
            </div>
          ) : (
            <button className="sm-action-btn sm-action-btn--ghost" onClick={() => setRenaming(true)}>
              ✎ Renombrar
            </button>
          )}

          {/* Eliminar */}
          <button className="sm-action-btn sm-action-btn--danger" onClick={handleDrop} disabled={busy}>
            🗑 Eliminar
          </button>
        </div>
      )}
    </div>
  );
}

function SchemaColumn({ schemaKey, tables, loading, onMove, onRename, onDrop }) {
  const meta = SCHEMA_META[schemaKey];

  return (
    <div className="sm-column" style={{ '--schema-color': meta.color, '--schema-bg': meta.bg, '--schema-border': meta.border }}>
      {/* Column header */}
      <div className="sm-col-header">
        <span className="sm-col-icon">{meta.icon}</span>
        <div>
          <h3 className="sm-col-title">{meta.label}</h3>
          <p className="sm-col-desc">{meta.desc}</p>
        </div>
        <span className="sm-col-count">{tables.length}</span>
      </div>

      {/* Cards */}
      <div className="sm-col-body">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
          : tables.length === 0
          ? <div className="sm-empty">Sin tablas en este schema</div>
          : tables.map(t => (
            <TableCard
              key={`${t.schema}.${t.tableName}`}
              table={t}
              onMove={onMove}
              onRename={onRename}
              onDrop={onDrop}
            />
          ))
        }
      </div>
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────

export default function SchemaManagerPage() {
  const navigate = useNavigate();
  const [schemas,  setSchemas]  = useState({ raw: [], staging: [], public: [] });
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [toast,    setToast]    = useState(null);
  const [search,   setSearch]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await tablesService.getSchemas();
      setSchemas(data.schemas || { raw: [], staging: [], public: [] });
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg, type = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleMove = async (fromSchema, fromTable, toSchema) => {
    try {
      await tablesService.move({ fromSchema, fromTable, toSchema });
      showToast(`✓ Tabla movida a ${toSchema}`, 'ok');
      load();
    } catch (e) {
      showToast(e.response?.data?.error || e.message, 'error');
    }
  };

  const handleRename = async (schema, oldName, newName) => {
    try {
      await tablesService.rename({ schema, oldName, newName });
      showToast(`✓ Tabla renombrada a "${newName}"`, 'ok');
      load();
    } catch (e) {
      showToast(e.response?.data?.error || e.message, 'error');
    }
  };

  const handleDrop = async (schema, tableName) => {
    try {
      await tablesService.drop(schema, tableName);
      showToast(`✓ Tabla "${tableName}" eliminada`, 'ok');
      load();
    } catch (e) {
      showToast(e.response?.data?.error || e.message, 'error');
    }
  };

  // Filtrar por búsqueda
  const filter = (tables) =>
    search
      ? tables.filter(t =>
          t.tableName.toLowerCase().includes(search.toLowerCase()) ||
          t.upload?.nombre_archivo?.toLowerCase().includes(search.toLowerCase())
        )
      : tables;

  return (
    <div className="sm-page">
      <div className="sm-scroll">
      {/* Header */}
      <div className="sm-header">
        <button className="sm-back" onClick={() => navigate('/pipeline')}>
          ← Volver al Pipeline
        </button>
        <div className="sm-header__title">
          <h1>Gestión de Tablas</h1>
          <p>Mueve, renombra o elimina tablas entre los schemas del pipeline de datos.</p>
        </div>
        <button className="sm-refresh" onClick={load} title="Actualizar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="sm-toolbar">
        <input
          type="search"
          className="sm-search"
          placeholder="Buscar tabla o archivo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <span className="sm-total">
          {Object.values(schemas).flat().length} tablas en total
        </span>
      </div>

      {/* Error */}
      {error && <div className="sm-error">{error}</div>}

      {/* Kanban columns */}
      <div className="sm-board-wrap">
        <div className="sm-board">
          {['raw', 'staging', 'public'].map(key => (
            <SchemaColumn
              key={key}
              schemaKey={key}
              tables={filter(schemas[key] || [])}
              loading={loading}
              onMove={handleMove}
              onRename={handleRename}
              onDrop={handleDrop}
            />
          ))}
        </div>
      </div>

      </div>{/* /sm-scroll */}

      {/* Toast (fuera del scroll para que quede fijo) */}
      {toast && (
        <div className={`sm-toast sm-toast--${toast.type}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
