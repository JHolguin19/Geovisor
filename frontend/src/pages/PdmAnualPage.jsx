import { useState, useEffect, useCallback, useContext } from 'react';
import { Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { pdmAnualService, pdmService } from '../services/api';
import AnualOverviewTab from './pdm-anual/AnualOverviewTab';
import AnualSecretariasTab from './pdm-anual/AnualSecretariasTab';
import AnualPilaresTab from './pdm-anual/AnualPilaresTab';
import AnualMetasTab from './pdm-anual/AnualMetasTab';
import AnualTrayectoriaTab from './pdm-anual/AnualTrayectoriaTab';
import PdmUploadModal from './pdm-anual/PdmUploadModal';
import MetaModal from './pdm/MetaModal';
import './PdmAnualPage.css';

const YEARS = [2024, 2025, 2026, 2027];
const TABS = [
  { id: 'resumen',      label: 'Resumen anual' },
  { id: 'secretarias',  label: 'Por secretaría' },
  { id: 'pilares',      label: 'Por pilar' },
  { id: 'metas',        label: 'Detalle metas' },
  { id: 'seguimiento',  label: 'Seguimiento cuatrienal' },
];
const LIMIT = 50;

export default function PdmAnualPage() {
  const { user } = useContext(AuthContext);
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

  // Pilares list for filter (from cuatrienio)
  const [pilaresLista, setPilaresLista] = useState([]);

  // Trayectoria cuatrienal y divergencia
  const [trayectoria, setTrayectoria]     = useState(null);
  const [divergencia, setDivergencia]     = useState([]);
  const [comparativo, setComparativo]     = useState([]);
  const [exportLoading, setExportLoading] = useState(false);

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

  // Load trayectoria + comparativo once (cuatrienal, no dependen del año)
  useEffect(() => {
    pdmAnualService.getTrayectoria().then(setTrayectoria).catch(console.error);
    pdmAnualService.getComparativo().then(setComparativo).catch(console.error);
  }, []);

  // Load divergencia when year changes
  useEffect(() => {
    pdmAnualService.getDivergencia(year).then(setDivergencia).catch(() => setDivergencia([]));
  }, [year]);

  const handleExport = async () => {
    setExportLoading(true);
    try { await pdmAnualService.exportYear(year); }
    catch (e) { console.error('Export failed', e); }
    finally { setExportLoading(false); }
  };

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
            <button className="pdm-a-btn pdm-a-btn--upload" onClick={() => setShowUpload(true)}>
              Actualizar datos
            </button>
          )}
        </div>
      </header>

      <div className="pdm-tabs">
        {TABS.map(t => (
          <button key={t.id}
            className={`pdm-tab${tab === t.id ? ' pdm-tab--active' : ''}`}
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

          {!loading && tab === 'secretarias' && (
            <AnualSecretariasTab data={secretarias} year={year} onSecretariaClick={goToMetas} />
          )}

          {!loading && tab === 'pilares' && (
            <AnualPilaresTab data={pilares} year={year} />
          )}

          {!loading && tab === 'seguimiento' && (
            <AnualTrayectoriaTab
              data={trayectoria}
              onExport={handleExport}
              exportLoading={exportLoading}
            />
          )}

          {tab === 'metas' && (
            <AnualMetasTab
              metas={metas} total={total} loading={tblLoading} year={year}
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

      {modalId && <MetaModal id={modalId} onClose={() => setModalId(null)} />}

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
