import { useState, useEffect, useCallback, useContext } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { pdmService } from '../services/api';
import PdmOverviewTab from './pdm/PdmOverviewTab';
import PdmSecretariasTab from './pdm/PdmSecretariasTab';
import PdmMetasTab from './pdm/PdmMetasTab';
import MetaModal from './pdm/MetaModal';
import './PdmPage.css';

const TABS = [
  { id: 'overview',    label: 'Resumen general' },
  { id: 'secretarias', label: 'Por secretaría' },
  { id: 'metas',       label: 'Detalle de metas' },
];

const LIMIT = 50;

export default function PdmPage() {
  const { logout } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const [tab, setTab]  = useState('overview');

  const [overview,    setOverview]    = useState(null);
  const [ovLoading,   setOvLoading]   = useState(true);
  const [secretarias, setSecretarias] = useState([]);
  const [pilares,     setPilares]     = useState([]);

  const [metas,       setMetas]       = useState([]);
  const [total,       setTotal]       = useState(0);
  const [tblLoading,  setTblLoading]  = useState(false);
  const [secFiltro,   setSecFiltro]   = useState(searchParams.get('secretaria') || '');
  const [pilarFiltro, setPilarFiltro] = useState('');
  const [busqueda,    setBusqueda]    = useState('');
  const [pagina,      setPagina]      = useState(1);
  const [modalId,     setModalId]     = useState(null);

  useEffect(() => {
    pdmService.getOverview()
      .then(setOverview)
      .catch(err => console.error('Error overview:', err))
      .finally(() => setOvLoading(false));
    pdmService.getPilares().then(setPilares);
    pdmService.getSecretarias().then(setSecretarias);
  }, []);

  const cargarMetas = useCallback(async () => {
    if (tab !== 'metas') return;
    setTblLoading(true);
    try {
      const params = { page: pagina, limit: LIMIT };
      if (secFiltro)   params.secretaria = secFiltro;
      if (pilarFiltro) params.pilar      = pilarFiltro;
      if (busqueda)    params.busqueda   = busqueda;
      const r = await pdmService.getMetas(params);
      setMetas(r.data);
      setTotal(r.total);
    } finally { setTblLoading(false); }
  }, [tab, secFiltro, pilarFiltro, busqueda, pagina]);

  useEffect(() => { cargarMetas(); }, [cargarMetas]);

  const resetPagina = (setter) => (val) => { setter(val); setPagina(1); };

  const goToMetas = (secretaria) => {
    setSecFiltro(secretaria);
    setPagina(1);
    setTab('metas');
  };

  return (
    <div className="pdm-page">
      <header className="pdm-header">
        <div className="pdm-header-left">
          <Link to="/dashboard" className="pdm-back-btn">← Dashboard</Link>
          <div className="pdm-header-title">
            <h1>Plan de Desarrollo Municipal 2024–2027</h1>
            <p>Santander de Quilichao · {overview?.global?.total_metas || '…'} metas de seguimiento</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Link to="/pdm/anual" className="pdm-a-link-btn">Seguimiento por año →</Link>
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
        {TABS.map(t => (
          <button key={t.id}
            className={`pdm-tab${tab === t.id ? ' pdm-tab--active' : ''}`}
            onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <main className="pdm-main">
        {tab === 'overview' && (
          ovLoading
            ? <div className="pdm-loading-full">Cargando datos del PDM…</div>
            : <PdmOverviewTab overview={overview} onAlertaClick={setModalId} />
        )}

        {tab === 'secretarias' && (
          <PdmSecretariasTab secretarias={secretarias} onSecretariaClick={goToMetas} />
        )}

        {tab === 'metas' && (
          <PdmMetasTab
            metas={metas} total={total} loading={tblLoading}
            secretarias={secretarias} pilares={pilares}
            secFiltro={secFiltro} pilarFiltro={pilarFiltro} busqueda={busqueda}
            onSecFiltro={resetPagina(setSecFiltro)}
            onPilarFiltro={resetPagina(setPilarFiltro)}
            onBusqueda={resetPagina(setBusqueda)}
            onLimpiar={() => { setSecFiltro(''); setPilarFiltro(''); setBusqueda(''); setPagina(1); }}
            pagina={pagina} totalPaginas={Math.ceil(total / LIMIT)}
            onPaginaAnterior={() => setPagina(p => p - 1)}
            onPaginaSiguiente={() => setPagina(p => p + 1)}
            onMetaClick={setModalId}
          />
        )}
      </main>

      {modalId && <MetaModal id={modalId} onClose={() => setModalId(null)} />}
    </div>
  );
}
