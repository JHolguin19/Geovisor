/**
 * DataPreview — Tabla paginada de preview de staging con coloreado por _status
 *
 * Props:
 *   jobId    : string | number
 *   pageSize : number (default 50)
 */

import { useState, useEffect, useCallback } from 'react';
import { etlService } from '../../services/api.js';
import './DataPreview.css';

const STATUS_STYLE = {
  ok:      { label: 'OK',       color: '#047857', bg: '#ECFDF5' },
  warning: { label: 'AVISO',    color: '#D97706', bg: '#FFFBEB' },
  error:   { label: 'ERROR',    color: '#DC2626', bg: '#FEF2F2' },
};

export default function DataPreview({ jobId, pageSize = 50 }) {
  const [rows,    setRows]    = useState([]);
  const [columns, setColumns] = useState([]);
  const [page,    setPage]    = useState(1);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [filter,  setFilter]  = useState('all'); // all | ok | warning | error

  const totalPages = Math.ceil(total / pageSize);

  const load = useCallback(async (pg) => {
    if (!jobId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await etlService.getPreview(jobId, {
        page: pg,
        limit: pageSize,
        status: filter !== 'all' ? filter : undefined,
      });
      const data = res.data;
      setRows(data.rows || []);
      setTotal(data.total || 0);

      // Extraer columnas de la primera fila (excluir control columns para mostrar)
      if (data.rows?.length && !columns.length) {
        const allCols = Object.keys(data.rows[0]);
        const displayCols = allCols.filter(c => !c.startsWith('_'));
        setColumns(displayCols);
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [jobId, filter, pageSize, columns.length]);

  useEffect(() => {
    setPage(1);
    setColumns([]);
  }, [jobId, filter]);

  useEffect(() => {
    load(page);
  }, [load, page]);

  if (!jobId) return null;

  return (
    <div className="dp-root">
      {/* Toolbar */}
      <div className="dp-toolbar">
        <span className="dp-total">{total.toLocaleString('es-CO')} filas</span>
        <div className="dp-filter-pills">
          {['all', 'ok', 'warning', 'error'].map(f => (
            <button
              key={f}
              className={`dp-pill${filter === f ? ' dp-pill--active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'Todas' : STATUS_STYLE[f]?.label || f}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="dp-error">{error}</div>
      )}

      {/* Skeleton / Table */}
      {loading ? (
        <div className="dp-skeleton">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="dp-skeleton-row">
              <div className="dp-skeleton-cell dp-skeleton-cell--sm" />
              <div className="dp-skeleton-cell" />
              <div className="dp-skeleton-cell" />
              <div className="dp-skeleton-cell dp-skeleton-cell--sm" />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="dp-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
          <p>No hay filas para este filtro</p>
        </div>
      ) : (
        <div className="dp-table-wrap">
          <table className="dp-table">
            <thead>
              <tr>
                <th className="dp-th dp-th--status">#</th>
                <th className="dp-th dp-th--status">Estado</th>
                {columns.map(col => (
                  <th key={col} className="dp-th">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const status = row._status || 'ok';
                const style  = STATUS_STYLE[status] || STATUS_STYLE.ok;
                const rowNum = (page - 1) * pageSize + idx + 1;
                return (
                  <tr
                    key={row._row_id ?? idx}
                    className="dp-row"
                    style={status !== 'ok' ? { background: style.bg } : undefined}
                    title={row._status_detail || ''}
                  >
                    <td className="dp-td dp-td--num">{rowNum}</td>
                    <td className="dp-td">
                      <span
                        className="dp-status-badge"
                        style={{ color: style.color, background: style.bg, border: `1px solid ${style.color}33` }}
                      >
                        {style.label}
                      </span>
                    </td>
                    {columns.map(col => (
                      <td key={col} className="dp-td">
                        <span className="dp-cell-val">
                          {row[col] == null ? <span className="dp-null">null</span> : String(row[col])}
                        </span>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="dp-pagination">
          <button
            className="dp-page-btn"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            ‹ Anterior
          </button>
          <span className="dp-page-info">
            Página {page} de {totalPages}
          </span>
          <button
            className="dp-page-btn"
            disabled={page >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          >
            Siguiente ›
          </button>
        </div>
      )}
    </div>
  );
}
