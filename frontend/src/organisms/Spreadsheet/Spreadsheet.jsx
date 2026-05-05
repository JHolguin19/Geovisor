import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { evalFormula, fmtCell, isFormula } from './formulaEngine.js';
import './Spreadsheet.css';

// ── Computed column functions ─────────────────────────────────────────────────

function efFn(y) {
  return row => {
    const fis = parseFloat(row[`meta_fisica_${y}`]);
    const pdm = parseFloat(row[`meta_pdm_${y}`]);
    if (!pdm || isNaN(fis)) return null;
    return Math.min(fis / pdm, 1) * 100;
  };
}

function avFisFn(row) {
  const pdm  = [2024,2025,2026,2027].map(y => parseFloat(row[`meta_pdm_${y}`]) || 0);
  const fis  = [2024,2025,2026,2027].map(y => parseFloat(row[`meta_fisica_${y}`]) || 0);
  const caps = [2024,2025,2026,2027].map((_, i) => pdm[i] > 0 ? Math.min(fis[i], pdm[i]) : fis[i]);
  const tipo = row.tipo_ponderado;
  const mc   = parseFloat(row.meta_cuatrienio);
  if (tipo === 'Acumulativo') {
    return mc > 0 ? Math.min(Math.max(...caps) / mc * 100, 100) : null;
  }
  const sumPdm = pdm.reduce((s, v) => s + v, 0);
  return sumPdm > 0 ? Math.min(caps.reduce((s, v) => s + v, 0) / sumPdm * 100, 100) : null;
}

// Annual Physical Progress = (Actual_Y / Meta_Cuatrienio) × 100
function avFisAnioFn(year) {
  return row => {
    const fis = parseFloat(row[`meta_fisica_${year}`]);
    const mc  = parseFloat(row.meta_cuatrienio);
    if (!mc || isNaN(fis)) return null;
    return fis / mc * 100;
  };
}

// Financial execution % = Comprometido / Apropiacion × 100
function finPctFn(year) {
  return row => {
    const a = parseFloat(row[`apropiacion_${year}`]);
    const c = parseFloat(row[`comprometido_${year}`]);
    if (!a || isNaN(c)) return null;
    return Math.min(c / a * 100, 100);
  };
}

// Color palette for % indicators
function effColor(v) {
  if (v == null) return '';
  if (v >= 80) return '#dcfce7';
  if (v >= 50) return '#fef9c3';
  return '#fee2e2';
}

// ── Physical column definitions ───────────────────────────────────────────────

export const COLUMNS = [
  // ── Frozen ──────────────────────────────────────────────────────────────────
  { key: 'meta_num',         label: '#',          width: 46,  frozen: true, editable: false, group: '' },
  { key: 'secretaria',       label: 'Secretaría', width: 118, frozen: true, editable: false, group: '' },
  { key: 'nom_pilar',        label: 'Pilar',      width: 72,  frozen: true, editable: false, group: '' },
  { key: 'descripcion_meta', label: 'Meta',       width: 230, frozen: true, editable: false, group: '', wrap: true },

  // ── General ─────────────────────────────────────────────────────────────────
  { key: 'tipo_ponderado',  label: 'Tipo',    width: 80, editable: false, group: 'General' },
  { key: 'meta_cuatrienio', label: 'Meta 4A', width: 78, editable: true, type: 'number', group: 'General' },

  // ── 2024 ────────────────────────────────────────────────────────────────────
  { key: 'meta_pdm_2024',   label: 'Programado',  width: 80, editable: true,  type: 'number', group: '2024' },
  { key: 'meta_fisica_2024',label: 'Realizado',   width: 80, editable: true,  type: 'number', group: '2024',
    cellStyle: (row, eff) => ({ background: effColor(eff?.['_ef_2024']) }) },
  { key: '_ef_2024',    label: 'Ef.%',        width: 58, editable: false, group: '2024',
    computed: efFn(2024), format: 'pct1',
    cellStyle: (_, v) => ({ background: effColor(v), fontWeight: 600 }) },
  { key: '_avfis_2024', label: 'Av.Fís.Año%', width: 72, editable: false, group: '2024',
    computed: avFisAnioFn(2024), format: 'pct1',
    cellStyle: (_, v) => ({ background: effColor(v), fontWeight: 600 }) },

  // ── 2025 ────────────────────────────────────────────────────────────────────
  { key: 'meta_pdm_2025',   label: 'Programado',  width: 80, editable: true,  type: 'number', group: '2025' },
  { key: 'meta_fisica_2025',label: 'Realizado',   width: 80, editable: true,  type: 'number', group: '2025' },
  { key: '_ef_2025',    label: 'Ef.%',        width: 58, editable: false, group: '2025',
    computed: efFn(2025), format: 'pct1',
    cellStyle: (_, v) => ({ background: effColor(v), fontWeight: 600 }) },
  { key: '_avfis_2025', label: 'Av.Fís.Año%', width: 72, editable: false, group: '2025',
    computed: avFisAnioFn(2025), format: 'pct1',
    cellStyle: (_, v) => ({ background: effColor(v), fontWeight: 600 }) },

  // ── 2026 ────────────────────────────────────────────────────────────────────
  { key: 'meta_pdm_2026',   label: 'Programado',  width: 80, editable: true,  type: 'number', group: '2026' },
  { key: 'meta_fisica_2026',label: 'Realizado',   width: 80, editable: true,  type: 'number', group: '2026' },
  { key: '_ef_2026',    label: 'Ef.%',        width: 58, editable: false, group: '2026',
    computed: efFn(2026), format: 'pct1',
    cellStyle: (_, v) => ({ background: effColor(v), fontWeight: 600 }) },
  { key: '_avfis_2026', label: 'Av.Fís.Año%', width: 72, editable: false, group: '2026',
    computed: avFisAnioFn(2026), format: 'pct1',
    cellStyle: (_, v) => ({ background: effColor(v), fontWeight: 600 }) },

  // ── 2027 ────────────────────────────────────────────────────────────────────
  { key: 'meta_pdm_2027',   label: 'Programado',  width: 80, editable: true,  type: 'number', group: '2027' },
  { key: 'meta_fisica_2027',label: 'Realizado',   width: 80, editable: true,  type: 'number', group: '2027' },
  { key: '_ef_2027',    label: 'Ef.%',        width: 58, editable: false, group: '2027',
    computed: efFn(2027), format: 'pct1',
    cellStyle: (_, v) => ({ background: effColor(v), fontWeight: 600 }) },
  { key: '_avfis_2027', label: 'Av.Fís.Año%', width: 72, editable: false, group: '2027',
    computed: avFisAnioFn(2027), format: 'pct1',
    cellStyle: (_, v) => ({ background: effColor(v), fontWeight: 600 }) },

  // ── Resumen ──────────────────────────────────────────────────────────────────
  { key: '_av_fis', label: 'Av. Físico', width: 76, editable: false, group: 'Resumen',
    computed: avFisFn, format: 'pct1',
    cellStyle: (_, v) => ({ background: effColor(v), fontWeight: 700 }) },
  { key: 'cumplimiento_cuatrienio', label: 'Cumpl. 4A', width: 76, editable: false, group: 'Resumen',
    format: 'pct1' },

  // ── Notas ────────────────────────────────────────────────────────────────────
  { key: 'observaciones_2025', label: 'Obs. 2025',  width: 170, editable: true, type: 'text', group: 'Notas', wrap: true },
  { key: 'compromisos_2025',   label: 'Comp. 2025', width: 170, editable: true, type: 'text', group: 'Notas', wrap: true },
  { key: 'observaciones_2026', label: 'Obs. 2026',  width: 170, editable: true, type: 'text', group: 'Notas', wrap: true },
  { key: 'compromisos_2026',   label: 'Comp. 2026', width: 170, editable: true, type: 'text', group: 'Notas', wrap: true },
];

// ── Financial columns (shown when showFinancial = true) ───────────────────────

export const FIN_COLUMNS = [2024, 2025, 2026, 2027].flatMap(y => [
  { key: `apropiacion_${y}`,  label: 'Apropiación',  width: 92, editable: false, type: 'number', group: `${y} Fin` },
  { key: `comprometido_${y}`, label: 'Comprometido', width: 92, editable: false, type: 'number', group: `${y} Fin` },
  { key: `_pctfin_${y}`,      label: '% Ejec.',      width: 58, editable: false, group: `${y} Fin`,
    computed: finPctFn(y), format: 'pct1',
    cellStyle: (_, v) => ({ background: effColor(v), fontWeight: 600 }) },
]);

// ── Column letter helpers (base COLUMNS only, for formula evaluation) ─────────
const COL_LETTER_MAP = {};
function toColLetters(n) {
  let s = '';
  n++;
  while (n > 0) { n--; s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26); }
  return s;
}
COLUMNS.forEach((_, i) => { COL_LETTER_MAP[toColLetters(i)] = COLUMNS[i].key; });

// ── Helpers ───────────────────────────────────────────────────────────────────

function getEffectiveRow(row, pending) {
  if (!pending.size) return row;
  const overrides = {};
  for (const [k, v] of pending) {
    const [mNum, field] = k.split('__');
    if (String(row.meta_num) === mNum) overrides[field] = v;
  }
  return Object.keys(overrides).length ? { ...row, ...overrides } : row;
}

function getCellRawValue(col, effectiveRow, rawFormulas) {
  if (col.computed) return col.computed(effectiveRow);
  if (col.key.startsWith('_')) return null;
  const fKey = `${effectiveRow.meta_num}__${col.key}`;
  if (rawFormulas.has(fKey)) return rawFormulas.get(fKey);
  return effectiveRow[col.key] ?? null;
}

function getCellDisplayValue(col, effectiveRow, rawFormulas) {
  const raw = getCellRawValue(col, effectiveRow, rawFormulas);
  if (raw === null || raw === undefined || raw === '') return '';
  if (isFormula(raw)) {
    const val = evalFormula(raw, effectiveRow, colLetter => {
      const k = COL_LETTER_MAP[colLetter.toUpperCase()];
      return k ? Number(effectiveRow[k]) || 0 : 0;
    });
    return fmtCell(val, col.format);
  }
  if (col.format) return fmtCell(raw, col.format);
  if (col.type === 'number') {
    const n = parseFloat(raw);
    return isNaN(n) ? '' : n.toLocaleString('es-CO', { maximumFractionDigits: 2 });
  }
  return String(raw);
}

// ── Spreadsheet component ─────────────────────────────────────────────────────

export default function Spreadsheet({ rows: initialRows, onSave, saving }) {
  const [rows, setRows]             = useState(initialRows);
  const [pending, setPending]       = useState(new Map());
  const [rawFormulas, setRawFormulas] = useState(new Map());
  const [selected, setSelected]     = useState(null);
  const [editing, setEditing]       = useState(null);
  const [editVal, setEditVal]       = useState('');
  const [formulaBar, setFormulaBar] = useState('');
  const [filter, setFilter]         = useState('');
  const [secFilter, setSecFilter]   = useState('');
  const [showFinancial, setShowFinancial] = useState(false);

  const editInputRef = useRef(null);
  const fbarRef      = useRef(null);
  const tbodyRef     = useRef(null);

  // Sync rows from props
  useEffect(() => { setRows(initialRows); }, [initialRows]);

  // Active column set
  const visibleCols = useMemo(
    () => showFinancial ? [...COLUMNS, ...FIN_COLUMNS] : COLUMNS,
    [showFinancial]
  );

  // ── Filtered rows ───────────────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    let r = rows;
    if (secFilter) r = r.filter(row => row.secretaria === secFilter);
    if (filter) {
      const q = filter.toLowerCase();
      r = r.filter(row =>
        String(row.meta_num).includes(q) ||
        (row.descripcion_meta ?? '').toLowerCase().includes(q) ||
        (row.secretaria ?? '').toLowerCase().includes(q)
      );
    }
    return r;
  }, [rows, filter, secFilter]);

  const secretarias = useMemo(() => [...new Set(rows.map(r => r.secretaria))].sort(), [rows]);

  // ── Selection helpers ───────────────────────────────────────────────────────
  const getColLetter = ci => toColLetters(ci);
  const getCellName  = (ri, ci) => `${getColLetter(ci)}${ri + 1}`;

  const updateFormulaBar = useCallback((ri, ci) => {
    const row = filteredRows[ri];
    if (!row) return;
    const col = visibleCols[ci];
    if (!col || col.computed) { setFormulaBar(''); return; }
    const fKey = `${row.meta_num}__${col.key}`;
    const formula = rawFormulas.get(fKey);
    if (formula) { setFormulaBar(formula); return; }
    const pVal = pending.get(fKey);
    const raw = pVal !== undefined ? pVal : (row[col.key] ?? '');
    setFormulaBar(raw === null ? '' : String(raw));
  }, [filteredRows, rawFormulas, pending, visibleCols]);

  const selectCell = useCallback((ri, ci) => {
    setSelected({ ri, ci });
    setEditing(null);
    updateFormulaBar(ri, ci);
  }, [updateFormulaBar]);

  // ── Edit helpers ─────────────────────────────────────────────────────────────
  const commitEdit = useCallback((ri, ci, value) => {
    const row = filteredRows[ri];
    if (!row) return;
    const col = visibleCols[ci];
    if (!col?.editable) return;
    const fKey = `${row.meta_num}__${col.key}`;

    if (isFormula(value)) {
      const evaluated = evalFormula(value, getEffectiveRow(row, pending), colLetter => {
        const k = COL_LETTER_MAP[colLetter.toUpperCase()];
        return k ? Number(getEffectiveRow(row, pending)[k]) || 0 : 0;
      });
      setRawFormulas(prev => new Map(prev).set(fKey, value));
      setPending(prev => new Map(prev).set(fKey, evaluated));
    } else {
      setRawFormulas(prev => { const m = new Map(prev); m.delete(fKey); return m; });
      setPending(prev => new Map(prev).set(fKey, value));
    }
    setEditing(null);
    setFormulaBar(value);
  }, [filteredRows, pending, visibleCols]);

  const startEdit = useCallback((ri, ci, initialChar = null) => {
    const col = visibleCols[ci];
    if (!col?.editable) return;
    const row = filteredRows[ri];
    if (!row) return;
    const fKey = `${row.meta_num}__${col.key}`;
    const formula = rawFormulas.get(fKey);
    const pVal = pending.get(fKey);
    let startVal;
    if (initialChar !== null) {
      startVal = initialChar === 'Delete' ? '' : initialChar;
    } else {
      startVal = formula ?? (pVal !== undefined ? String(pVal) : String(row[col.key] ?? ''));
    }
    setEditing({ ri, ci });
    setEditVal(startVal);
    setTimeout(() => { editInputRef.current?.focus(); editInputRef.current?.select(); }, 0);
  }, [filteredRows, rawFormulas, pending, visibleCols]);

  // ── Keyboard navigation ──────────────────────────────────────────────────────
  const moveSelection = useCallback((dri, dci) => {
    setSelected(prev => {
      if (!prev) return { ri: 0, ci: 0 };
      const ri = Math.max(0, Math.min(filteredRows.length - 1, prev.ri + dri));
      const ci = Math.max(0, Math.min(visibleCols.length - 1, prev.ci + dci));
      updateFormulaBar(ri, ci);
      return { ri, ci };
    });
  }, [filteredRows.length, visibleCols.length, updateFormulaBar]);

  const handleKeyDown = useCallback((e) => {
    if (editing) return;
    if (!selected) return;
    const { ri, ci } = selected;

    switch (e.key) {
      case 'ArrowUp':    e.preventDefault(); moveSelection(-1, 0); break;
      case 'ArrowDown':  e.preventDefault(); moveSelection(1, 0);  break;
      case 'ArrowLeft':  e.preventDefault(); moveSelection(0, -1); break;
      case 'ArrowRight': e.preventDefault(); moveSelection(0, 1);  break;
      case 'Tab':
        e.preventDefault();
        e.shiftKey ? moveSelection(0, -1) : moveSelection(0, 1);
        break;
      case 'Enter':
        if (visibleCols[ci]?.editable) startEdit(ri, ci);
        else moveSelection(1, 0);
        break;
      case 'F2':
        e.preventDefault();
        if (visibleCols[ci]?.editable) startEdit(ri, ci);
        break;
      case 'Delete':
      case 'Backspace':
        if (visibleCols[ci]?.editable) startEdit(ri, ci, 'Delete');
        break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && visibleCols[ci]?.editable) {
          startEdit(ri, ci, e.key);
        }
    }
  }, [editing, selected, moveSelection, startEdit, visibleCols]);

  const handleEditKeyDown = useCallback((e) => {
    if (!editing) return;
    const { ri, ci } = editing;
    if (e.key === 'Escape') {
      setEditing(null);
      updateFormulaBar(ri, ci);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit(ri, ci, editVal);
      moveSelection(1, 0);
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      commitEdit(ri, ci, editVal);
      e.shiftKey ? moveSelection(0, -1) : moveSelection(0, 1);
    }
  }, [editing, editVal, commitEdit, moveSelection, updateFormulaBar]);

  // ── Formula bar submit ────────────────────────────────────────────────────────
  const handleFormulaBarKeyDown = (e) => {
    if (!selected) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit(selected.ri, selected.ci, formulaBar);
    }
    if (e.key === 'Escape') {
      updateFormulaBar(selected.ri, selected.ci);
    }
  };

  // ── Bulk paste from Excel (Ctrl+V on grid) ────────────────────────────────────
  const handlePaste = useCallback((e) => {
    if (!selected) return;
    const text = e.clipboardData?.getData('text/plain');
    if (!text) return;
    // Only intercept multi-cell paste (has tabs or multiple lines)
    const isMultiCell = text.includes('\t') || text.split(/\r?\n/).filter(Boolean).length > 1;
    if (!isMultiCell) return;
    e.preventDefault();
    const pasteRows = text.split(/\r?\n/).filter(r => r !== '');
    const newPending = new Map(pending);
    pasteRows.forEach((rowText, dri) => {
      const vals = rowText.split('\t');
      vals.forEach((val, dci) => {
        const ri = selected.ri + dri;
        const ci = selected.ci + dci;
        if (ri >= filteredRows.length || ci >= visibleCols.length) return;
        const col = visibleCols[ci];
        if (!col?.editable) return;
        const row = filteredRows[ri];
        if (!row) return;
        newPending.set(`${row.meta_num}__${col.key}`, val.trim());
      });
    });
    setPending(newPending);
  }, [selected, filteredRows, visibleCols, pending]);

  // ── Save / Discard ────────────────────────────────────────────────────────────
  const handleSave = () => {
    const changes = [];
    for (const [fKey, value] of pending) {
      const [meta_num, field] = fKey.split('__');
      changes.push({ meta_num: Number(meta_num), field, value });
    }
    onSave?.(changes);
  };

  const handleDiscard = () => {
    setPending(new Map());
    setRawFormulas(new Map());
    if (selected) updateFormulaBar(selected.ri, selected.ci);
  };

  // Update rows externally (after save)
  const updateRows = useCallback((updatedRows) => {
    setRows(prev => prev.map(r => {
      const u = updatedRows.find(ur => ur.meta_num === r.meta_num);
      return u ? { ...r, ...u } : r;
    }));
    setPending(new Map());
    setRawFormulas(new Map());
  }, []);

  useEffect(() => {
    if (onSave) onSave._updateRows = updateRows;
  }, [onSave, updateRows]);

  // ── Frozen column positions ───────────────────────────────────────────────────
  const frozenLeft = useMemo(() => {
    let left = 0;
    return visibleCols.map(col => {
      if (!col.frozen) return null;
      const l = left;
      left += col.width;
      return l;
    });
  }, [visibleCols]);

  // ── Render ────────────────────────────────────────────────────────────────────
  const hasPending = pending.size > 0;

  return (
    <div className="sps">

      {/* ── Toolbar ── */}
      <div className="sps__toolbar">
        <div className="sps__toolbar-left">
          <span className="sps__cell-name">{selected ? getCellName(selected.ri, selected.ci) : ''}</span>
          <input
            ref={fbarRef}
            className="sps__fbar"
            value={formulaBar}
            placeholder="Valor o fórmula (ej: =meta_pdm_2025*0.8)"
            onChange={e => setFormulaBar(e.target.value)}
            onKeyDown={handleFormulaBarKeyDown}
            onFocus={() => {
              if (selected && visibleCols[selected.ci]?.editable) setEditing(null);
            }}
          />
        </div>
        <div className="sps__toolbar-right">
          <input
            className="sps__filter"
            placeholder="Buscar meta…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
          <select className="sps__filter" value={secFilter} onChange={e => setSecFilter(e.target.value)}>
            <option value="">Todas las secretarías</option>
            {secretarias.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            className={`sps__btn ${showFinancial ? 'sps__btn--fin-active' : 'sps__btn--fin'}`}
            onClick={() => setShowFinancial(f => !f)}
            title="Mostrar / ocultar columnas financieras por año"
          >
            {showFinancial ? '$ Ocultar financiero' : '$ Ver financiero'}
          </button>
          {hasPending && (
            <>
              <span className="sps__pending-badge">{pending.size} cambio{pending.size > 1 ? 's' : ''}</span>
              <button className="sps__btn sps__btn--discard" onClick={handleDiscard}>Descartar</button>
              <button className="sps__btn sps__btn--save" onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Grid ── */}
      <div
        className="sps__grid-wrap"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
      >
        <table className="sps__table">
          {/* Group header row */}
          <thead>
            <tr className="sps__group-row">
              {visibleCols.map((col, ci) => {
                const showLabel = ci === 0
                  || col.group !== visibleCols[ci - 1].group
                  || col.frozen !== visibleCols[ci - 1].frozen;
                return (
                  <th
                    key={`g-${ci}`}
                    className={`sps__th-group${col.frozen ? ' sps__cell--frozen' : ''}${col.group ? ` sps__group--${col.group.replace(/\s/g,'').toLowerCase()}` : ''}`}
                    style={col.frozen
                      ? { left: frozenLeft[ci], zIndex: 3, width: col.width, minWidth: col.width }
                      : { width: col.width, minWidth: col.width }}
                  >
                    {showLabel && !col.frozen ? col.group : ''}
                  </th>
                );
              })}
            </tr>
            {/* Column header row */}
            <tr className="sps__header-row">
              {visibleCols.map((col, ci) => (
                <th
                  key={`h-${ci}`}
                  className={`sps__th${col.frozen ? ' sps__cell--frozen' : ''}${col.editable ? ' sps__th--editable' : ''}`}
                  style={col.frozen
                    ? { left: frozenLeft[ci], zIndex: 3, width: col.width, minWidth: col.width }
                    : { width: col.width, minWidth: col.width }}
                  onClick={() => { if (!col.frozen) selectCell(0, ci); }}
                >
                  {toColLetters(ci)}<br/>
                  <span className="sps__th-label">{col.label}</span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody ref={tbodyRef}>
            {filteredRows.map((row, ri) => {
              const effectiveRow = getEffectiveRow(row, pending);

              // Pre-compute all derived values for this row
              const derived = {};
              visibleCols.forEach(col => {
                if (col.computed) derived[col.key] = col.computed(effectiveRow);
              });

              return (
                <tr key={row.id || row.meta_num} className={`sps__row${ri % 2 === 0 ? '' : ' sps__row--odd'}`}>
                  {visibleCols.map((col, ci) => {
                    const isSel    = selected?.ri === ri && selected?.ci === ci;
                    const isEdit   = editing?.ri  === ri && editing?.ci  === ci;
                    const fKey     = `${row.meta_num}__${col.key}`;
                    const isChanged = pending.has(fKey);

                    // Display value
                    let displayVal;
                    if (col.computed) {
                      const v = derived[col.key];
                      displayVal = v != null ? fmtCell(v, col.format) : '—';
                    } else {
                      displayVal = getCellDisplayValue(col, effectiveRow, rawFormulas);
                    }

                    // Computed value for cellStyle (raw number)
                    const computedVal  = col.computed ? derived[col.key] : null;
                    const extraStyle   = col.cellStyle
                      ? col.cellStyle(effectiveRow, computedVal ?? (col.format ? parseFloat(displayVal) : null))
                      : {};

                    return (
                      <td
                        key={`${ri}-${ci}`}
                        className={[
                          'sps__cell',
                          col.frozen    ? 'sps__cell--frozen'   : '',
                          col.editable  ? 'sps__cell--editable' : '',
                          isSel         ? 'sps__cell--selected' : '',
                          isChanged     ? 'sps__cell--changed'  : '',
                          col.type === 'number' ? 'sps__cell--num' : '',
                          col.wrap      ? 'sps__cell--wrap'     : '',
                        ].filter(Boolean).join(' ')}
                        style={{
                          ...(col.frozen ? { left: frozenLeft[ci], zIndex: 2 } : {}),
                          width: col.width, minWidth: col.width,
                          ...extraStyle,
                        }}
                        onClick={() => selectCell(ri, ci)}
                        onDoubleClick={() => { if (col.editable) startEdit(ri, ci); }}
                      >
                        {isEdit ? (
                          <input
                            ref={editInputRef}
                            className="sps__edit-input"
                            value={editVal}
                            onChange={e => setEditVal(e.target.value)}
                            onKeyDown={handleEditKeyDown}
                            onBlur={() => { commitEdit(ri, ci, editVal); }}
                          />
                        ) : displayVal}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Status bar ── */}
      <div className="sps__status">
        <span>{filteredRows.length} / {rows.length} metas</span>
        {selected && <span>Celda: {getCellName(selected.ri, selected.ci)}</span>}
        {hasPending && <span className="sps__status--warn">{pending.size} cambio(s) pendiente(s)</span>}
        <span className="sps__status--hint">Ctrl+V para pegar desde Excel</span>
      </div>
    </div>
  );
}
