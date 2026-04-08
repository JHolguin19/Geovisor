import { useState, useCallback, useContext } from 'react';
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
import MapContext from '../context/MapContext';
import { getSecretariaById } from '../config/secretarias';
import './MapPage.css';

function MapPageInner() {
  const { secretariaId = 'sig' } = useParams();
  const secretaria = getSecretariaById(secretariaId);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const { selectionResults, setSelectionResults, clearTools } = useContext(MapContext);

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
          <SelectionResults results={selectionResults} onClose={handleCloseSelection} />
        </main>
      </div>
    </div>
  );
}

export default function MapPage() {
  return <MapPageInner />;
}
