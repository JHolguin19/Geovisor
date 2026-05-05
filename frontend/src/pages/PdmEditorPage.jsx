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
          <Link to="/pdm/anual" className="pdme__back">← PDM Anual</Link>
          <h1 className="pdme__title">Editor PDM</h1>
          {rows.length > 0 && (
            <span className="pdme__badge">{rows.length} metas</span>
          )}
        </div>
        <div className="pdme__header-right">
          <span className="pdme__user">{user?.username}</span>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="pdme__body">
        {loading && (
          <div className="pdme__loading">
            <div className="pdme__spinner" />
            Cargando base de datos PDM…
          </div>
        )}

        {error && !loading && (
          <div className="pdme__error">
            <strong>Error:</strong> {error}
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
