/**
 * ProcessingPage — Wizard de procesamiento ETL
 *
 * 4 pasos:
 *   1. PREVIEW    — Vista previa de los datos raw + columnas detectadas
 *   2. COLUMNS    — Mapeo de columnas origen → destino + tipo SQL
 *   3. GEOREF     — Configuración de georreferenciación
 *   4. REVIEW     — Resultados en staging: tabla + mini-mapa + aprobar/rechazar
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { uploadService, etlService } from '../services/api.js';
import ColumnMapper   from '../organisms/ColumnMapper/ColumnMapper.jsx';
import GeoConfig      from '../organisms/GeoConfig/GeoConfig.jsx';
import DataPreview    from '../organisms/DataPreview/DataPreview.jsx';
import ValidationPanel from '../organisms/ValidationPanel/ValidationPanel.jsx';
import './ProcessingPage.css';

// ─── CONSTANTES ───────────────────────────────────────────────────────────────

const STEPS = [
  { id: 'preview',  label: 'Vista Previa',     icon: '👁️' },
  { id: 'columns',  label: 'Columnas',          icon: '📋' },
  { id: 'georef',   label: 'Georreferenciación',icon: '🗺️' },
  { id: 'review',   label: 'Revisión',          icon: '✅' },
];

// ─── COMPONENTE STEP INDICATOR ─────────────────────────────────────────────

function StepIndicator({ currentStep, steps }) {
  const currentIdx = steps.findIndex(s => s.id === currentStep);
  return (
    <div className="step-indicator">
      {steps.map((step, idx) => {
        const state = idx < currentIdx ? 'done' : idx === currentIdx ? 'active' : 'pending';
        return (
          <div key={step.id} className={`step-item step-item--${state}`}>
            <div className="step-circle">
              {state === 'done'
                ? <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12"><path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/></svg>
                : <span>{idx + 1}</span>
              }
            </div>
            <span className="step-label">{step.label}</span>
            {idx < steps.length - 1 && <div className="step-connector" />}
          </div>
        );
      })}
    </div>
  );
}

// ─── PASO 1: PREVIEW RAW ─────────────────────────────────────────────────────

function StepPreview({ uploadInfo, onNext }) {
  if (!uploadInfo) return <div className="pp-loading">Cargando información del archivo...</div>;

  const { nombre_archivo, tipo_archivo, created_at, rawMeta } = uploadInfo;
  const columns = rawMeta?.columns_json || [];
  const totalRows = rawMeta?.total_rows || 0;

  return (
    <div className="pp-step">
      <div className="pp-step__header">
        <h2>Vista previa del archivo</h2>
        <p>Revisa la información detectada antes de continuar con el procesamiento.</p>
      </div>

      {/* Ficha del archivo */}
      <div className="file-card">
        <div className="file-card__icon">
          {tipo_archivo === 'csv' ? '📋' : ['excel','xlsx','xls'].includes(tipo_archivo) ? '📊' : '🗺️'}
        </div>
        <div className="file-card__info">
          <h3>{nombre_archivo}</h3>
          <div className="file-card__meta">
            <span className="file-meta-pill">{tipo_archivo?.toUpperCase()}</span>
            <span className="file-meta-pill file-meta-pill--blue">{totalRows.toLocaleString('es-CO')} filas</span>
            <span className="file-meta-pill file-meta-pill--gray">{columns.length} columnas</span>
            <span className="file-meta-pill file-meta-pill--gray">
              {new Date(created_at).toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* Columnas detectadas */}
      <div className="pp-section">
        <h3 className="pp-section__title">Columnas detectadas</h3>
        <div className="cols-grid">
          {columns.map(col => (
            <div key={col.name} className={`col-chip col-chip--${col.detected_type.toLowerCase()}`}>
              <span className="col-chip__type">{col.detected_type}</span>
              <span className="col-chip__name">{col.name}</span>
              {col.sample?.length > 0 && (
                <span className="col-chip__sample">ej: {col.sample[0]}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="pp-actions">
        <button className="pp-btn pp-btn--primary" onClick={onNext}>
          Continuar con mapeo de columnas
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── PASO 4: REVIEW (wrapper del ValidationPanel) ─────────────────────────────

function StepReview({ jobId, jobStats, errorLog, uploadInfo, onApprove, onReject, approving }) {
  return (
    <div className="pp-step">
      <div className="pp-step__header">
        <h2>Revisión de resultados</h2>
        <p>Revisa los datos procesados, verifica la calidad y decide si publicar o rechazar.</p>
      </div>
      <ValidationPanel
        jobId={jobId}
        stats={jobStats}
        errorLog={errorLog}
        uploadInfo={uploadInfo}
        onApprove={onApprove}
        onReject={onReject}
        approving={approving}
      />
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function ProcessingPage() {
  const { secretariaId, uploadId } = useParams();
  const navigate  = useNavigate();
  const location  = useLocation();
  const reviewMode = location.state?.reviewMode || false;
  const existingJobId = location.state?.jobId || null;

  // Estado del wizard
  const [currentStep, setCurrentStep]   = useState(reviewMode ? 'review' : 'preview');
  const [uploadInfo,  setUploadInfo]    = useState(null);
  const [columnMapping, setColumnMapping] = useState([]);
  const [geoMode,     setGeoMode]       = useState('none');
  const [geoConfig,   setGeoConfig]     = useState({});
  const [processing,  setProcessing]    = useState(false);
  const [approving,   setApproving]     = useState(false);
  const [jobResult,   setJobResult]     = useState(null);
  const [error,       setError]         = useState(null);

  // ── Cargar info del upload ──
  const loadUploadInfo = useCallback(async () => {
    try {
      // Obtener historial y buscar este upload
      const histRes = await etlService.getHistory({ limit: 200 });
      const item = histRes.data?.items?.find(i => i.upload_id === parseInt(uploadId, 10));

      if (!item) {
        setError('No se encontró el archivo en el sistema.');
        return;
      }

      // Obtener metadata raw
      let rawMeta = null;
      try {
        const jobRes = existingJobId
          ? await etlService.getJob(existingJobId)
          : null;
        // Si tiene job, intentar obtener metadata del raw via job
        if (item.etl_status !== 'legacy') {
          // rawMeta vendrá del historial con columns_json en job_stats
          rawMeta = {
            columns_json: item.job_stats?.columns || [],
            total_rows: item.job_stats?.total || 0,
          };
        }
      } catch { /* no raw meta aún */ }

      // Si es raw nuevo, usar la metadata disponible
      if (!rawMeta || !rawMeta.columns_json?.length) {
        // Intentar obtener columnas del historial de uploads normal
        rawMeta = { columns_json: [], total_rows: 0 };
      }

      setUploadInfo({ ...item, rawMeta });

      // Si hay job existente en review mode, cargar su resultado
      if (reviewMode && (existingJobId || item.job_id)) {
        const jid = existingJobId || item.job_id;
        const jobRes = await etlService.getJob(jid);
        setJobResult({
          jobId: jid,
          stats: jobRes.data?.stats || jobRes.data?.job_stats || {},
          errorLog: [],
        });
      }
    } catch (e) {
      setError('Error cargando información del archivo: ' + e.message);
    }
  }, [uploadId, existingJobId, reviewMode]);

  useEffect(() => { loadUploadInfo(); }, [loadUploadInfo]);

  // ── Iniciar procesamiento ──
  const handleProcess = async () => {
    if (!columnMapping.length) {
      setError('Debes mapear al menos una columna antes de procesar.');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const result = await etlService.process({
        uploadId:      parseInt(uploadId, 10),
        geoMode,
        geoConfig,
        columnMapping,
        validationRules: [],
      });

      setJobResult({
        jobId:    result.data?.jobId,
        stats:    result.data?.stats,
        errorLog: result.data?.errorLog || [],
      });
      setCurrentStep('review');
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Error durante el procesamiento');
    } finally {
      setProcessing(false);
    }
  };

  // ── Aprobar y publicar ──
  const handleApprove = async () => {
    if (!jobResult?.jobId) return;
    setApproving(true);
    try {
      await etlService.promote(jobResult.jobId, {
        create_layer: true,
        layer_name: uploadInfo?.nombre_archivo,
      });
      navigate('/pipeline', { replace: true });
    } catch (e) {
      setError(e.response?.data?.error || e.message);
      setApproving(false);
    }
  };

  // ── Rechazar ──
  const handleReject = async (reason) => {
    if (!jobResult?.jobId) return;
    try {
      await etlService.reject(jobResult.jobId, reason);
      navigate('/pipeline', { replace: true });
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  };

  // ── Navegación entre pasos ──
  const goTo = (step) => {
    setError(null);
    setCurrentStep(step);
  };

  const stepIdx = STEPS.findIndex(s => s.id === currentStep);

  return (
    <div className="processing-page">
      {/* ── HEADER ── */}
      <div className="pp-header">
        <button className="pp-back" onClick={() => navigate('/pipeline')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Volver al Pipeline
        </button>
        <div className="pp-header__title">
          <h1>Procesamiento de datos</h1>
          {uploadInfo && (
            <span className="pp-header__file">{uploadInfo.nombre_archivo}</span>
          )}
        </div>
      </div>

      {/* ── STEP INDICATOR ── */}
      <StepIndicator currentStep={currentStep} steps={STEPS} />

      {/* ── ERROR GLOBAL ── */}
      {error && (
        <div className="pp-error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* ── CONTENIDO DEL PASO ── */}
      <div className="pp-content">
        {currentStep === 'preview' && (
          <StepPreview
            uploadInfo={uploadInfo}
            onNext={() => goTo('columns')}
          />
        )}

        {currentStep === 'columns' && (
          <div className="pp-step">
            <div className="pp-step__header">
              <h2>Mapeo de columnas</h2>
              <p>Selecciona qué columnas incluir y define su tipo de dato. Las columnas mapeadas se incluirán en el dataset final.</p>
            </div>
            <ColumnMapper
              rawColumns={uploadInfo?.rawMeta?.columns_json || []}
              mapping={columnMapping}
              onChange={setColumnMapping}
            />
            <div className="pp-actions pp-actions--split">
              <button className="pp-btn pp-btn--ghost" onClick={() => goTo('preview')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
                Atrás
              </button>
              <button
                className="pp-btn pp-btn--primary"
                disabled={columnMapping.length === 0}
                onClick={() => goTo('georef')}
              >
                Continuar con georreferenciación
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>
          </div>
        )}

        {currentStep === 'georef' && (
          <div className="pp-step">
            <div className="pp-step__header">
              <h2>Configuración de georreferenciación</h2>
              <p>Indica cómo ubicar geográficamente los datos. Puedes usar coordenadas, cruzar con una capa base o guardar sin geometría.</p>
            </div>
            <GeoConfig
              rawColumns={uploadInfo?.rawMeta?.columns_json || []}
              geoMode={geoMode}
              geoConfig={geoConfig}
              onModeChange={setGeoMode}
              onConfigChange={setGeoConfig}
            />
            <div className="pp-actions pp-actions--split">
              <button className="pp-btn pp-btn--ghost" onClick={() => goTo('columns')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
                Atrás
              </button>
              <button
                className="pp-btn pp-btn--primary pp-btn--process"
                onClick={handleProcess}
                disabled={processing}
              >
                {processing ? (
                  <>
                    <span className="pp-spinner" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                    Iniciar procesamiento
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {currentStep === 'review' && jobResult && (
          <StepReview
            jobId={jobResult.jobId}
            jobStats={jobResult.stats}
            errorLog={jobResult.errorLog}
            uploadInfo={uploadInfo}
            onApprove={handleApprove}
            onReject={handleReject}
            approving={approving}
          />
        )}
      </div>
    </div>
  );
}
