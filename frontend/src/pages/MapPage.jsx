import { useState, useCallback, useContext, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../organisms/Header/Header';
import LayerPanel from '../organisms/LayerPanel';
import MapViewer from '../organisms/MapViewer';
import StatsPanel from '../organisms/StatsPanel';
import MapToolbar from '../organisms/MapToolbar/MapToolbar';
import SearchPanel from '../organisms/SearchPanel/SearchPanel';
import SelectionResults from '../organisms/SelectionResults/SelectionResults';
import SisbenPanel from '../organisms/SisbenPanel';
import SisbenHeatmapPanel from '../organisms/SisbenHeatmapPanel';
import SisbenUbaPanel from '../organisms/SisbenUbaPanel';
import AlumbradoPanel from '../organisms/AlumbradoPanel/AlumbradoPanel';
import IpmLegendPanel from '../organisms/IpmLegendPanel/IpmLegendPanel';
import VeredasPanel from '../organisms/VeredasPanel/VeredasPanel';
import DelitosPanel from '../organisms/DelitosPanel/DelitosPanel';
import MapContext from '../context/MapContext';
import { getSecretariaById } from '../config/secretarias';
import { useLayerPrefetch } from '../features/map/hooks/useLayerPrefetch';
import './MapPage.css';

function MapPageInner() {
  const { secretariaId = 'sig' } = useParams();
  const secretaria = getSecretariaById(secretariaId);

  // Pre-carga GeoJSON de todas las capas en background al entrar al mapa
  useLayerPrefetch(secretariaId);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const { activeLayers, setActiveLayers, setDelitosConfig, selectionResults, setSelectionResults, clearTools } = useContext(MapContext);

  // Auto-activar capa de delitos al entrar en /mapa/gobierno
  useEffect(() => {
    if (secretariaId === 'gobierno' && !activeLayers.has('delitos_barrios_2025')) {
      setActiveLayers(prev => new Set([...prev, 'delitos_barrios_2025']));
      setDelitosConfig({ anio: '2025', tipoDelito: null, vizMode: 'heatmap' });
    }
  }, [secretariaId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sincronizar delitosConfig cuando cambia la capa activa de delitos
  useEffect(() => {
    const arr = [...activeLayers];
    const delitosActive = arr.filter(id => id.startsWith('delitos_'));
    if (delitosActive.length === 0) return;
    const last = delitosActive[delitosActive.length - 1];
    if (last === 'delitos_barrios_2024') {
      setDelitosConfig(prev => ({ ...prev, anio: '2024', tipoDelito: null }));
    } else if (last === 'delitos_barrios_2025') {
      setDelitosConfig(prev => ({ ...prev, anio: '2025', tipoDelito: null }));
    } else if (last === 'delitos_homicidios') {
      setDelitosConfig(prev => ({ ...prev, anio: null, tipoDelito: 'HOMICIDIO' }));
    }
  }, [activeLayers, setDelitosConfig]);

  const toggleSidebar  = useCallback(() => setSidebarOpen(p => !p), []);
  const closeSidebar   = useCallback(() => setSidebarOpen(false), []);

  const handleCloseSelection = useCallback(() => {
    setSelectionResults(null);
    clearTools();
  }, [setSelectionResults, clearTools]);

  return (
    <div className="map-page">
      <Header
        onToggleSidebar={toggleSidebar}
        secretariaName={secretaria?.shortName}
        secretariaColor={secretaria?.color}
      />
      <div className="map-body">
        {sidebarOpen && <div className="sidebar-backdrop" onClick={closeSidebar} />}
        <LayerPanel
          isOpen={sidebarOpen}
          onClose={closeSidebar}
          secretariaId={secretariaId}
        />
        <main className="map-main">
          <MapViewer />
          <MapToolbar onSearchToggle={() => setSearchOpen(p => !p)} />
          {searchOpen && <SearchPanel onClose={() => setSearchOpen(false)} />}
          <StatsPanel />
          <SisbenPanel />
          <SisbenHeatmapPanel />
          <SisbenUbaPanel />
          <AlumbradoPanel />
          <IpmLegendPanel />
          <VeredasPanel />
          <DelitosPanel />
          <SelectionResults results={selectionResults} onClose={handleCloseSelection} />
        </main>
      </div>
    </div>
  );
}

export default function MapPage() {
  return <MapPageInner />;
}
