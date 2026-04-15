/**
 * ValidationPanel — Panel de revisión post-procesamiento
 *
 * Muestra: stats de calidad, log de errores, preview de datos,
 *          botones Aprobar (publicar) y Rechazar.
 *
 * Props:
 *   jobId      : string | number
 *   stats      : { total, ok, warnings, errors, with_geom, without_geom, quality_pct, matched, unmatched }
 *   errorLog   : [{ _row_id, _status, _status_detail, ...fields }]
 *   uploadInfo : { nombre_archivo, ... }
 *   onApprove  : () => void
 *   onReject   : (reason: string) => void
 *   approving  : boolean
 */

import { useState } from 'react';
import DataPreview from '../DataPreview/DataPreview.jsx';
import './ValidationPanel.css';

function QualityRing({ pct = 0 }) {
  const r = 32;
  const circ = 2 * Math.PI * r;
  const fill = (pct / 100) * circ;
  const color = pct >= 90 ? '#10B981' : pct >= 70 ? '#F59E0B' : '#EF4444';

  return (
    <svg width="84" height="84" viewBox="0 0 84 84" className="vp-ring">
      <circle cx="42" cy="42" r={r} fill="none" stroke="#E2E8F0" strokeWidth="8" />
      <circle
        cx="42" cy="42" r={r}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeDasharray={`${fill} ${circ - fill}`}
        strokeLinecap="round"
        transform="rotate(-90 42 42)"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      <text x="42" y="47" textAnchor="middle" fontSize="15" fontWeight="700" fill={color}>
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

function StatCard({ label, value, color, icon }) {
  return (
    <div className="vp-stat-card">
      <span className="vp-stat-icon" style={{ color }}>{icon}</span>
      <span className="vp-stat-value" style={{ color }}>{typeof value === 'number' ? value.toLocaleString('es-CO') : value}</span>
      <span className="vp-stat-label">{label}</span>
    </div>
  );
}

export default function ValidationPanel({
  jobId,
  stats = {},
  errorLog = [],
  uploadInfo,
  onApprove,
  onReject,
  approving,
}) {
  const [rejectMode, setRejectMode] = useState(false);
  const [reason,     setReason]     = useState('');
  const [tab,        setTab]        = useState('preview'); // preview | errors

  const qualityPct = stats.quality_pct ?? (
    stats.total > 0 ? Math.round((stats.ok / stats.total) * 100) : 0
  );

  const handleReject = () => {
    if (!reason.trim()) return;
    onReject(reason.trim());
  };

  return (
    <div className="vp-root">
      {/* ── Quality overview ── */}
      <div className="vp-overview">
        <div className="vp-quality-block">
          <QualityRing pct={qualityPct} />
          <div>
            <div className="vp-quality-label">Calidad general</div>
            <div className="vp-quality-sub">
              {qualityPct >= 90
                ? 'Excelente — datos listos para publicar'
                : qualityPct >= 70
                ? 'Aceptable — revisa los avisos antes de publicar'
                : 'Baja — se recomienda corregir errores'}
            </div>
          </div>
        </div>

        <div className="vp-stats-grid">
          <StatCard label="Total filas"  value={stats.total    ?? 0} color="#0F172A"  icon="📊" />
          <StatCard label="OK"           value={stats.ok       ?? 0} color="#047857"  icon="✓" />
          <StatCard label="Avisos"       value={stats.warnings ?? 0} color="#D97706"  icon="⚠" />
          <StatCard label="Errores"      value={stats.errors   ?? 0} color="#DC2626"  icon="✕" />
          <StatCard label="Con geometría"    value={stats.with_geom    ?? 0} color="#2563EB" icon="📍" />
          <StatCard label="Sin geometría"    value={stats.without_geom ?? 0} color="#64748B" icon="○" />
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="vp-tabs">
        <button
          className={`vp-tab${tab === 'preview' ? ' vp-tab--active' : ''}`}
          onClick={() => setTab('preview')}
        >
          Vista previa de datos
        </button>
        {errorLog.length > 0 && (
          <button
            className={`vp-tab${tab === 'errors' ? ' vp-tab--active' : ''}`}
            onClick={() => setTab('errors')}
          >
            Log de errores
            <span className="vp-tab-badge">{errorLog.length}</span>
          </button>
        )}
      </div>

      {/* ── Tab content ── */}
      <div className="vp-tab-content">
        {tab === 'preview' && (
          <DataPreview jobId={jobId} pageSize={50} />
        )}

        {tab === 'errors' && (
          <div className="vp-error-log">
            <div className="vp-error-log__table-wrap">
              <table className="vp-error-table">
                <thead>
                  <tr>
                    <th>Fila</th>
                    <th>Estado</th>
                    <th>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {errorLog.map((row, i) => (
                    <tr key={row._row_id ?? i} className={`vp-err-row vp-err-row--${row._status}`}>
                      <td className="vp-err-num">{row._row_id ?? i + 1}</td>
                      <td>
                        <span className={`vp-err-badge vp-err-badge--${row._status}`}>
                          {row._status?.toUpperCase()}
                        </span>
                      </td>
                      <td className="vp-err-detail">{row._status_detail || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Actions ── */}
      {!rejectMode ? (
        <div className="vp-actions">
          <button
            className="vp-btn vp-btn--reject"
            onClick={() => setRejectMode(true)}
            disabled={approving}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            Rechazar
          </button>
          <button
            className="vp-btn vp-btn--approve"
            onClick={onApprove}
            disabled={approving}
          >
            {approving ? (
              <>
                <span className="vp-spinner" />
                Publicando...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Aprobar y publicar
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="vp-reject-form">
          <h4 className="vp-reject-form__title">¿Por qué se rechaza este dataset?</h4>
          <textarea
            className="vp-reject-textarea"
            rows={3}
            placeholder="Describe el motivo del rechazo (requerido)"
            value={reason}
            onChange={e => setReason(e.target.value)}
            autoFocus
          />
          <div className="vp-reject-actions">
            <button className="vp-btn vp-btn--ghost" onClick={() => setRejectMode(false)}>
              Cancelar
            </button>
            <button
              className="vp-btn vp-btn--reject"
              onClick={handleReject}
              disabled={!reason.trim()}
            >
              Confirmar rechazo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
