import { useState, useEffect, useCallback, useContext } from 'react';
import { Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { pdmAnualService, pdmService } from '../services/api';
import AnualOverviewTab from './pdm-anual/AnualOverviewTab';
import AnualSecretariasTab from './pdm-anual/AnualSecretariasTab';
import AnualPilaresTab from './pdm-anual/AnualPilaresTab';
import AnualMetasTab from './pdm-anual/AnualMetasTab';
import AnualFinancieroTab from './pdm-anual/AnualFinancieroTab';
import AnualInformeTab from './pdm-anual/AnualInformeTab';
import PdmUploadModal from './pdm-anual/PdmUploadModal';
import InformeModal from './pdm-anual/InformeModal';
import MetaModal from './pdm/MetaModal';
import './PdmAnualPage.css';

const YEARS = [2024, 2025, 2026, 2027];
const TABS = [
  { id: 'resumen',      label: 'Resumen anual' },
  { id: 'financiero',   label: 'Análisis financiero' },
  { id: 'secretarias',  label: 'Por secretaría' },
  { id: 'pilares',      label: 'Por pilar' },
  { id: 'metas',        label: 'Detalle metas' },
  { id: 'informe',      label: 'Generar informe', adminOnly: true },
];
const LIMIT = 50;

export default function PdmAnualPage() {
  const { user, logout } = useContext(AuthContext);
  const canUpload = user && (user.role === 'admin' || user.role === 'editor_geo');

  const [year, setYear] = useState(2026);
  const [tab, setTab]   = useState('resumen');

  // Data
  const [overview, setOverview]       = useState(null);
  const [secretarias, setSecretarias] = useState([]);
  const [pilares, setPilares]         = useState([]);
  const [loading, setLoading]         = useState(true);

  // Metas tab
  const [metas, setMetas]             = useState([]);
  const [total, setTotal]             = useState(0);
  const [tblLoading, setTblLoading]   = useState(false);
  const [secFiltro, setSecFiltro]     = useState('');
  const [pilarFiltro, setPilarFiltro] = useState('');
  const [semaforoFiltro, setSemaforoFiltro] = useState('');
  const [busqueda, setBusqueda]       = useState('');
  const [pagina, setPagina]           = useState(1);

  // Modals
  const [modalId, setModalId]         = useState(null);
  const [showUpload, setShowUpload]   = useState(false);
  const [showInforme, setShowInforme] = useState(false);

  // Pilares list for filter (from cuatrienio)
  const [pilaresLista, setPilaresLista] = useState([]);

  // Comparativos cuatrienales
  const [divergencia, setDivergencia]             = useState([]);
  const [comparativo, setComparativo]             = useState([]);
  const [comparativoFinanciero, setComparativoFinanciero] = useState(null);

  // Load year data
  useEffect(() => {
    setLoading(true);
    setOverview(null);
    setSecretarias([]);
    setPilares([]);

    Promise.all([
      pdmAnualService.getYearOverview(year),
      pdmAnualService.getYearSecretarias(year),
      pdmAnualService.getYearPilares(year),
    ]).then(([ov, sec, pil]) => {
      setOverview(ov);
      setSecretarias(sec);
      setPilares(pil);
      if (!pilaresLista.length) setPilaresLista(pil);
    }).catch(err => console.error('Error PDM anual:', err))
      .finally(() => setLoading(false));
  }, [year]);

  // Load pilares lista once
  useEffect(() => {
    pdmService.getPilares().then(setPilaresLista);
  }, []);

  // Load comparativos once (cuatrienal, no dependen del año)
  useEffect(() => {
    pdmAnualService.getComparativo().then(setComparativo).catch(console.error);
    pdmAnualService.getComparativoFinanciero().then(setComparativoFinanciero).catch(console.error);
  }, []);

  // Load divergencia when year changes
  useEffect(() => {
    pdmAnualService.getDivergencia(year).then(setDivergencia).catch(() => setDivergencia([]));
  }, [year]);

  // Load metas
  const cargarMetas = useCallback(async () => {
    if (tab !== 'metas') return;
    setTblLoading(true);
    try {
      const params = { page: pagina, limit: LIMIT };
      if (secFiltro)      params.secretaria = secFiltro;
      if (pilarFiltro)    params.pilar = pilarFiltro;
      if (semaforoFiltro) params.semaforo = semaforoFiltro;
      if (busqueda)        params.busqueda = busqueda;
      const r = await pdmAnualService.getYearMetas(year, params);
      setMetas(r.data);
      setTotal(r.total);
    } finally { setTblLoading(false); }
  }, [tab, year, secFiltro, pilarFiltro, semaforoFiltro, busqueda, pagina]);

  useEffect(() => { cargarMetas(); }, [cargarMetas]);

  const resetPagina = (setter) => (val) => { setter(val); setPagina(1); };

  const goToMetas = (secretaria) => {
    setSecFiltro(secretaria);
    setPagina(1);
    setTab('metas');
  };

  const handleYearChange = (y) => {
    setYear(y);
    setSecFiltro('');
    setPilarFiltro('');
    setSemaforoFiltro('');
    setBusqueda('');
    setPagina(1);
  };

  return (
    <div className="pdm-a-page">
      <header className="pdm-header">
        <div className="pdm-header-left">
          <Link to="/pdm" className="pdm-back-btn">← Vista Cuatrienio</Link>
          <div className="pdm-header-title">
            <h1>Seguimiento PDM por Año</h1>
            <p>Santander de Quilichao · Año {year}</p>
          </div>
        </div>
        <div className="pdm-a-header-right">
          <div className="pdm-a-year-pills">
            {YEARS.map(y => (
              <button
                key={y}
                className={`pdm-a-pill${year === y ? ' pdm-a-pill--active' : ''}`}
                onClick={() => handleYearChange(y)}
              >
                {y}
              </button>
            ))}
          </div>
          {canUpload && (
            <Link to="/pdm/editor" className="pdm-a-btn pdm-a-btn--editor">
              Editor PDM
            </Link>
          )}
          {canUpload && (
            <button className="pdm-a-btn pdm-a-btn--upload" onClick={() => setShowUpload(true)}>
              Actualizar datos
            </button>
          )}
          <button className="btn-logout" onClick={logout}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Cerrar sesión
          </button>
        </div>
      </header>

      <div className="pdm-tabs">
        {TABS.filter(t => !t.adminOnly || canUpload).map(t => (
          <button key={t.id}
            className={`pdm-tab${tab === t.id ? ' pdm-tab--active' : ''}${t.id === 'informe' ? ' pdm-tab--informe' : ''}`}
            onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="pdm-a-scroll">
        <main className="pdm-main">
          {loading && <div className="pdm-loading-full">Cargando datos del año {year}…</div>}

          {!loading && tab === 'resumen' && (
            <AnualOverviewTab data={overview} year={year} divergencia={divergencia} comparativo={comparativo} onMetaClick={(id) => setModalId(id)} />
          )}

          {!loading && tab === 'financiero' && (
            <AnualFinancieroTab data={comparativoFinanciero} year={year} />
          )}

          {!loading && tab === 'secretarias' && (
            <AnualSecretariasTab data={secretarias} year={year} onSecretariaClick={goToMetas} />
          )}

          {!loading && tab === 'pilares' && (
            <AnualPilaresTab data={pilares} year={year} />
          )}

          {tab === 'informe' && (
            <AnualInformeTab year={year} />
          )}

          {tab === 'metas' && (
            <AnualMetasTab
              metas={metas} total={total} loading={tblLoading} year={year}
              overview={overview}
              secretarias={secretarias} pilares={pilaresLista}
              secFiltro={secFiltro} pilarFiltro={pilarFiltro}
              semaforoFiltro={semaforoFiltro} busqueda={busqueda}
              onSecFiltro={resetPagina(setSecFiltro)}
              onPilarFiltro={resetPagina(setPilarFiltro)}
              onSemaforoFiltro={resetPagina(setSemaforoFiltro)}
              onBusqueda={resetPagina(setBusqueda)}
              onLimpiar={() => { setSecFiltro(''); setPilarFiltro(''); setSemaforoFiltro(''); setBusqueda(''); setPagina(1); }}
              pagina={pagina} totalPaginas={Math.ceil(total / LIMIT)}
              onPaginaAnterior={() => setPagina(p => p - 1)}
              onPaginaSiguiente={() => setPagina(p => p + 1)}
              onMetaClick={setModalId}
            />
          )}
        </main>
      </div>

      {showInforme && <InformeModal year={year} onClose={() => setShowInforme(false)} />}

      {modalId && <MetaModal id={modalId} year={year} onClose={() => setModalId(null)} />}

      {showUpload && (
        <PdmUploadModal
          year={year}
          onClose={() => setShowUpload(false)}
          onSuccess={() => {
            // Reload data after upload
            setLoading(true);
            Promise.all([
              pdmAnualService.getYearOverview(year),
              pdmAnualService.getYearSecretarias(year),
              pdmAnualService.getYearPilares(year),
            ]).then(([ov, sec, pil]) => {
              setOverview(ov);
              setSecretarias(sec);
              setPilares(pil);
            }).finally(() => {
              setLoading(false);
              if (tab === 'metas') cargarMetas();
            });
          }}
        />
      )}
    </div>
  );
}
