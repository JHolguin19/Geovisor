/**
 * ColumnMapper — Mapeo de columnas origen → destino + tipo SQL
 *
 * Props:
 *   rawColumns  : [{ name, detected_type, sample }]
 *   mapping     : [{ source, target, type, include }]
 *   onChange    : (newMapping) => void
 */

import { useState, useEffect } from 'react';
import './ColumnMapper.css';

const SQL_TYPES = [
  { value: 'text',    label: 'TEXT' },
  { value: 'integer', label: 'INTEGER' },
  { value: 'bigint',  label: 'BIGINT' },
  { value: 'numeric', label: 'NUMERIC' },
  { value: 'boolean', label: 'BOOLEAN' },
  { value: 'date',    label: 'DATE' },
  { value: 'timestamp', label: 'TIMESTAMP' },
];

const TYPE_COLOR = {
  text: '#64748B', integer: '#7C3AED', bigint: '#7C3AED',
  numeric: '#0369A1', boolean: '#D97706', date: '#047857',
  timestamp: '#0891B2',
};

function toSnakeCase(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export default function ColumnMapper({ rawColumns = [], mapping = [], onChange }) {
  const [rows, setRows] = useState([]);

  // Inicializar filas desde rawColumns cuando cambian
  useEffect(() => {
    if (!rawColumns.length) return;

    // Si ya hay mapping, conservarlo; si no, crear desde rawColumns
    if (mapping.length > 0) {
      setRows(mapping);
      return;
    }

    const initial = rawColumns.map(col => ({
      source:  col.name,
      target:  toSnakeCase(col.name),
      type:    col.detected_type?.toLowerCase() || 'text',
      include: true,
      sample:  col.sample?.[0] ?? '',
    }));
    setRows(initial);
    onChange(initial.filter(r => r.include));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawColumns]);

  const updateRow = (idx, field, value) => {
    const next = rows.map((r, i) =>
      i === idx ? { ...r, [field]: value } : r
    );
    setRows(next);
    onChange(next.filter(r => r.include));
  };

  const toggleAll = (checked) => {
    const next = rows.map(r => ({ ...r, include: checked }));
    setRows(next);
    onChange(next.filter(r => r.include));
  };

  const includedCount = rows.filter(r => r.include).length;
  const allChecked    = rows.length > 0 && includedCount === rows.length;
  const someChecked   = includedCount > 0 && !allChecked;

  if (!rawColumns.length) {
    return (
      <div className="cm-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
        <p>No se detectaron columnas en el archivo.</p>
      </div>
    );
  }

  return (
    <div className="cm-root">
      <div className="cm-toolbar">
        <span className="cm-toolbar__count">
          <strong>{includedCount}</strong> de {rows.length} columnas seleccionadas
        </span>
        <div className="cm-toolbar__actions">
          <button className="cm-link-btn" onClick={() => toggleAll(true)}>Seleccionar todo</button>
          <span className="cm-sep">·</span>
          <button className="cm-link-btn" onClick={() => toggleAll(false)}>Deseleccionar todo</button>
        </div>
      </div>

      <div className="cm-table-wrap">
        <table className="cm-table">
          <thead>
            <tr>
              <th className="cm-th cm-th--check">
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={el => { if (el) el.indeterminate = someChecked; }}
                  onChange={e => toggleAll(e.target.checked)}
                  className="cm-checkbox"
                />
              </th>
              <th className="cm-th">Columna origen</th>
              <th className="cm-th">Nombre destino (SQL)</th>
              <th className="cm-th">Tipo</th>
              <th className="cm-th">Muestra</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.source} className={`cm-row${!row.include ? ' cm-row--disabled' : ''}`}>
                <td className="cm-td cm-td--check">
                  <input
                    type="checkbox"
                    checked={row.include}
                    onChange={e => updateRow(idx, 'include', e.target.checked)}
                    className="cm-checkbox"
                  />
                </td>
                <td className="cm-td cm-td--source">
                  <span className="cm-source-name">{row.source}</span>
                </td>
                <td className="cm-td">
                  <input
                    type="text"
                    value={row.target}
                    onChange={e => updateRow(idx, 'target', toSnakeCase(e.target.value))}
                    disabled={!row.include}
                    className="cm-input"
                    placeholder="nombre_columna"
                    spellCheck={false}
                  />
                </td>
                <td className="cm-td">
                  <div className="cm-type-select-wrap">
                    <span
                      className="cm-type-dot"
                      style={{ background: TYPE_COLOR[row.type] || '#94A3B8' }}
                    />
                    <select
                      value={row.type}
                      onChange={e => updateRow(idx, 'type', e.target.value)}
                      disabled={!row.include}
                      className="cm-select"
                    >
                      {SQL_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </td>
                <td className="cm-td cm-td--sample">
                  <span className="cm-sample">{row.sample ?? '—'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
