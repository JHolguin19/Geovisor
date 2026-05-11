import { useState, useEffect, useCallback, useContext } from 'react';
import { Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { pdmEditorService } from '../services/api';
import Spreadsheet from '../organisms/Spreadsheet/Spreadsheet';
import './PdmEditorPage.css';

export default function PdmEditorPage() {
  const { user } = useContext(AuthContext);
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState(null);

  useEffect(() => {
    setLoading(true);
    pdmEditorService.getGrid()
      .then(data => {
        setRows(data.rows ?? []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.error ?? 'Error cargando el grid');
        setLoading(false);
      });
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSave = useCallback(async (changes) => {
    setSaving(true);
    try {
      const result = await pdmEditorService.save(changes);
      if (result.updatedRows?.length) {
        // Merge updated rows back into state
        setRows(prev => prev.map(r => {
          const u = result.updatedRows.find(ur => ur.meta_num === r.meta_num);
          return u ? { ...r, ...u } : r;
        }));
        // Also notify Spreadsheet to clear pending
        if (handleSave._updateRows) handleSave._updateRows(result.updatedRows);
      }
      const { updated = 0, errors = [] } = result;
      if (errors.length) {
        showToast(`${updated} guardado(s), ${errors.length} error(es)`, 'warn');
      } else {
        showToast(`${updated} cambio(s) guardado(s) correctamente`);
      }
    } catch (err) {
      showToast(err.response?.data?.error ?? 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  }, []);

  return (
    <div className="pdme">
      {/* ── Header ── */}
      <div className="pdme__header">
        <div className="pdme__header-left">
          <Link to="/pdm/anual" className="pdme__back">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" style={{verticalAlign:'-2px',marginRight:'4px'}}>
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd"/>
            </svg>
            PDM Anual
          </Link>
          <div className="pdme__title-group">
            <h1 className="pdme__title">Editor PDM</h1>
            <span className="pdme__subtitle">Plan de Desarrollo Municipal 2024–2027</span>
          </div>
          {rows.length > 0 && (
            <span className="pdme__badge">{rows.length} metas</span>
          )}
        </div>
        <div className="pdme__header-right">
          <div className="pdme__shortcuts-hint">
            <span>Enter / F2 editar</span>
            <span>Tab avanzar</span>
            <span>Ctrl+V pegar Excel</span>
          </div>
          <div className="pdme__user-pill">
            <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor" style={{opacity:0.7}}>
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
            </svg>
            {user?.username}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="pdme__body">
        {loading && (
          <div className="pdme__loading">
            <div className="pdme__spinner" />
            <div>
              <div className="pdme__loading-title">Cargando base de datos PDM…</div>
              <div className="pdme__loading-sub">Recuperando {' '}metas del Plan de Desarrollo Municipal</div>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="pdme__error">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style={{flexShrink:0,marginTop:'1px'}}>
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
            <div><strong>No se pudo cargar el editor:</strong> {error}</div>
          </div>
        )}

        {!loading && !error && (
          <Spreadsheet
            rows={rows}
            onSave={handleSave}
            saving={saving}
          />
        )}
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className={`pdme__toast pdme__toast--${toast.type}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
