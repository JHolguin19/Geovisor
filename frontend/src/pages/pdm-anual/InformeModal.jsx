import { useState } from 'react';
import { pdmAnualService } from '../../services/api';

export default function InformeModal({ year, onClose }) {
  const [comentarios, setComentarios]   = useState('');
  const [texto, setTexto]               = useState('');
  const [step, setStep]                 = useState('form');   // form | loading | result
  const [pdfLoading, setPdfLoading]     = useState(false);
  const [error, setError]               = useState(null);

  const handleGenerar = async () => {
    setStep('loading');
    setError(null);
    try {
      const { texto: t } = await pdmAnualService.generarInforme(year, comentarios);
      setTexto(t);
      setStep('result');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error al generar el informe');
      setStep('form');
    }
  };

  const handleDescargarPDF = async () => {
    setPdfLoading(true);
    try {
      await pdmAnualService.descargarInformePDF(year, texto, comentarios);
    } catch (err) {
      setError('Error al generar el PDF: ' + err.message);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="pdm-overlay" onClick={onClose}>
      <div
        className="pdm-modal"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 780, width: '95vw' }}
      >
        <button className="pdm-modal-close" onClick={onClose}>×</button>

        <div className="pdm-modal-header">
          <div className="pdm-modal-meta-num">IA · GPT-4o</div>
          <h2 className="pdm-modal-title">Informe Ejecutivo PDM — Año {year}</h2>
        </div>

        <div style={{ padding: '20px 22px' }}>

          {/* PASO: FORM */}
          {step === 'form' && (
            <>
              <p style={{ fontSize: 13, color: '#4b5563', marginBottom: 14 }}>
                El sistema analizará todos los datos del Plan de Desarrollo Municipal {year} y generará
                un informe ejecutivo con OpenAI GPT-4o. Puedes añadir comentarios o contexto adicional
                antes de generarlo.
              </p>

              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                Comentarios adicionales <span style={{ fontWeight: 400 }}>(opcional)</span>
              </label>
              <textarea
                value={comentarios}
                onChange={e => setComentarios(e.target.value)}
                placeholder="Ej: Incluir análisis especial de los programas de infraestructura vial. El corte es a junio 2026..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: 13,
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  color: '#374151',
                  boxSizing: 'border-box',
                }}
              />

              {error && (
                <div style={{
                  marginTop: 12, padding: '10px 14px', background: '#fef2f2',
                  border: '1px solid #fca5a5', borderRadius: 8, color: '#dc2626', fontSize: 13,
                }}>
                  {error}
                </div>
              )}

              <div className="pdm-a-upload-actions" style={{ marginTop: 20 }}>
                <button className="pdm-a-btn pdm-a-btn--cancel" onClick={onClose}>
                  Cancelar
                </button>
                <button className="pdm-a-btn pdm-a-btn--primary" onClick={handleGenerar}>
                  Generar informe
                </button>
              </div>
            </>
          )}

          {/* PASO: LOADING */}
          {step === 'loading' && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div className="pdm-spinner" style={{ margin: '0 auto 20px' }} />
              <p style={{ fontSize: 14, color: '#4b5563', marginBottom: 8 }}>
                Analizando datos del PDM {year}…
              </p>
              <p style={{ fontSize: 12, color: '#9ca3af' }}>
                Esto puede tomar hasta 60 segundos. No cierres esta ventana.
              </p>
            </div>
          )}

          {/* PASO: RESULT */}
          {step === 'result' && (
            <>
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '18px 20px',
                maxHeight: 480,
                overflowY: 'auto',
                fontSize: 13,
                lineHeight: 1.7,
                color: '#374151',
                whiteSpace: 'pre-wrap',
                fontFamily: 'inherit',
              }}>
                {texto}
              </div>

              {error && (
                <div style={{
                  marginTop: 12, padding: '10px 14px', background: '#fef2f2',
                  border: '1px solid #fca5a5', borderRadius: 8, color: '#dc2626', fontSize: 13,
                }}>
                  {error}
                </div>
              )}

              <div className="pdm-a-upload-actions" style={{ marginTop: 16 }}>
                <button
                  className="pdm-a-btn pdm-a-btn--cancel"
                  onClick={() => { setTexto(''); setStep('form'); setError(null); }}
                >
                  ← Volver
                </button>
                <button
                  className="pdm-a-btn pdm-a-btn--primary"
                  onClick={handleDescargarPDF}
                  disabled={pdfLoading}
                >
                  {pdfLoading ? 'Generando PDF…' : 'Descargar PDF'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
