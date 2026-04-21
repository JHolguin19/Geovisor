import { useState, useRef } from 'react';
import { pdmAnualService } from '../../services/api';

export default function PdmUploadModal({ year, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef();

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    if (f && /\.xlsx?$/i.test(f.name)) setFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const res = await pdmAnualService.uploadPdm(file, year);
      setResult(res);
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="pdm-overlay" onClick={onClose}>
      <div className="pdm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <button className="pdm-modal-close" onClick={onClose}>×</button>

        <div className="pdm-modal-header">
          <div className="pdm-modal-meta-num">ACTUALIZAR DATOS</div>
          <h2 className="pdm-modal-title">Cargar Excel PDM — Año {year}</h2>
        </div>

        <div style={{ padding: '20px 22px' }}>
          {!result ? (
            <>
              <div
                className="pdm-a-dropzone"
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  style={{ display: 'none' }}
                  onChange={e => setFile(e.target.files?.[0] || null)}
                />
                {file ? (
                  <div className="pdm-a-file-info">
                    <span className="pdm-a-file-icon">📊</span>
                    <span className="pdm-a-file-name">{file.name}</span>
                    <span className="pdm-a-file-size">{(file.size / 1024).toFixed(0)} KB</span>
                  </div>
                ) : (
                  <div className="pdm-a-drop-hint">
                    <span>📁</span>
                    <p>Arrastra un archivo Excel o haz clic para seleccionar</p>
                    <small>.xlsx — Misma estructura que la tabla pdm_metas</small>
                  </div>
                )}
              </div>

              {error && <div className="pdm-a-upload-error">{error}</div>}

              <div className="pdm-a-upload-actions">
                <button className="pdm-a-btn pdm-a-btn--cancel" onClick={onClose} disabled={uploading}>
                  Cancelar
                </button>
                <button
                  className="pdm-a-btn pdm-a-btn--primary"
                  onClick={handleUpload}
                  disabled={!file || uploading}
                >
                  {uploading ? 'Procesando…' : 'Confirmar carga'}
                </button>
              </div>
            </>
          ) : (
            <div className="pdm-a-upload-result">
              <h3>Resultado de la carga</h3>
              <div className="pdm-a-result-grid">
                <div className="pdm-a-result-card" style={{ borderLeftColor: 'var(--pdm-green)' }}>
                  <div className="pdm-a-result-num">{result.actualizados}</div>
                  <div>Actualizados</div>
                </div>
                <div className="pdm-a-result-card" style={{ borderLeftColor: 'var(--pdm-gray)' }}>
                  <div className="pdm-a-result-num">{result.sin_cambios}</div>
                  <div>Sin cambios</div>
                </div>
                <div className="pdm-a-result-card" style={{ borderLeftColor: 'var(--pdm-red)' }}>
                  <div className="pdm-a-result-num">{result.errores?.length || 0}</div>
                  <div>Errores</div>
                </div>
              </div>
              {result.errores?.length > 0 && (
                <div className="pdm-a-error-list">
                  <h4>Detalle de errores:</h4>
                  {result.errores.slice(0, 10).map((e, i) => (
                    <div key={i} className="pdm-a-error-row">
                      Fila {e.fila}: {e.error}
                    </div>
                  ))}
                  {result.errores.length > 10 && <p>…y {result.errores.length - 10} más</p>}
                </div>
              )}
              <div className="pdm-a-upload-actions">
                <button className="pdm-a-btn pdm-a-btn--primary" onClick={onClose}>Cerrar</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
