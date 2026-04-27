import { useState } from 'react';
import { pdmAnualService } from '../../services/api';

export default function AnualInformeTab({ year }) {
  const [comentarios, setComentarios] = useState('');
  const [texto, setTexto]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [pdfLoading, setPdfLoading]   = useState(false);
  const [error, setError]             = useState(null);
  const [generated, setGenerated]     = useState(false);

  const handleGenerar = async () => {
    setLoading(true);
    setError(null);
    setTexto('');
    setGenerated(false);
    try {
      const { texto: t } = await pdmAnualService.generarInforme(year, comentarios);
      setTexto(t);
      setGenerated(true);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error al generar el informe');
    } finally {
      setLoading(false);
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
    <div className="pdm-informe-tab">
      <section className="pdm-section">
        <h2 className="pdm-section-h">Informe ejecutivo IA — Año {year}</h2>
        <p className="pdm-section-sub">
          El sistema analiza todos los datos del PDM {year} y genera un informe ejecutivo con GPT-4o.
          Incluye: resumen ejecutivo, avance físico y financiero, análisis por secretaría y pilar,
          alertas y recomendaciones.
        </p>

        {/* Comentarios */}
        <div className="pdm-informe-form">
          <label className="pdm-informe-label">
            Comentarios o contexto adicional <span className="pdm-informe-opt">(opcional)</span>
          </label>
          <textarea
            className="pdm-informe-textarea"
            value={comentarios}
            onChange={e => setComentarios(e.target.value)}
            disabled={loading}
            rows={4}
            placeholder={`Ej: El corte es a junio de ${year}. Enfatizar en programas de infraestructura vial. Hay retrasos en el sector rural por lluvias…`}
          />
          <div className="pdm-informe-actions">
            {generated && (
              <button
                className="pdm-a-btn pdm-a-btn--cancel"
                onClick={() => { setTexto(''); setGenerated(false); setError(null); }}
                disabled={loading}
              >
                Limpiar
              </button>
            )}
            <button
              className="pdm-a-btn pdm-a-btn--informe"
              onClick={handleGenerar}
              disabled={loading}
            >
              {loading ? 'Generando informe…' : generated ? 'Regenerar informe' : 'Generar informe'}
            </button>
            {generated && (
              <button
                className="pdm-a-btn pdm-a-btn--pdf"
                onClick={handleDescargarPDF}
                disabled={pdfLoading || loading}
              >
                {pdfLoading ? 'Generando PDF…' : 'Descargar PDF'}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="pdm-informe-error">{error}</div>
        )}
      </section>

      {/* Loading */}
      {loading && (
        <section className="pdm-section">
          <div className="pdm-informe-loading">
            <div className="pdm-spinner" />
            <p>Analizando datos del PDM {year} con GPT-4o…</p>
            <small>Esto puede tomar hasta 60 segundos.</small>
          </div>
        </section>
      )}

      {/* Resultado */}
      {generated && texto && (
        <section className="pdm-section">
          <div className="pdm-informe-result-header">
            <h3 className="pdm-section-h" style={{ margin: 0 }}>Informe generado</h3>
            <button
              className="pdm-a-btn pdm-a-btn--pdf"
              onClick={handleDescargarPDF}
              disabled={pdfLoading}
            >
              {pdfLoading ? 'Generando PDF…' : 'Descargar PDF'}
            </button>
          </div>
          <div className="pdm-informe-texto">
            {texto}
          </div>
        </section>
      )}
    </div>
  );
}
