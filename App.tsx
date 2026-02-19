
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Map from './components/Map';
import AirportDetails from './components/AirportDetails';
import FuelLogToggle from './components/FuelLogToggle';
import GlobalNotesFeed from './components/GlobalNotesFeed';
import { AIRPORT_DATABASE } from './constants';
import { fetchFuelMapData } from './services/aviationService';
import { Menu, X, CloudFog, WifiOff } from 'lucide-react';
import { Airport, CardType } from './types';

const App: React.FC = () => {
  const [airports, setAirports] = useState<Airport[]>(AIRPORT_DATABASE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // New State for Global Notes Panel
  const [showGlobalNotes, setShowGlobalNotes] = useState(false);
  
  // G-AIRMET State
  const [showAirmet, setShowAirmet] = useState(false);

  // Initial Fetch for Live Fuel Data
  useEffect(() => {
    const loadLiveFuelData = async () => {
        if (!navigator.onLine) return;
        
        try {
            console.log("Fetching live fuel map data...");
            const liveData = await fetchFuelMapData();
            
            if (liveData && liveData.length > 0) {
                // Merge live data into existing static database
                const updatedAirports = AIRPORT_DATABASE.map(staticAirport => {
                    const match = liveData.find(l => l.id === staticAirport.id);
                    
                    if (match) {
                        // Normalize card type string to Enum
                        let cardType = staticAirport.cardRules.primary;
                        const cardStr = (match.card || '').toLowerCase();
                        
                        if (cardStr.includes('white')) cardType = CardType.WHITE_CARD;
                        else if (cardStr.includes('avfuel') || cardStr.includes('black')) cardType = CardType.AVFUEL;
                        else if (cardStr.includes('pcard') || cardStr.includes('us bank')) cardType = CardType.PCARD;
                        
                        // Merge fields
                        return {
                            ...staticAirport,
                            fbo: match.fbo || staticAirport.fbo,
                            cardRules: {
                                ...staticAirport.cardRules,
                                primary: cardType,
                                notes: match.note || staticAirport.cardRules.notes
                            }
                        };
                    }
                    return staticAirport;
                });
                
                setAirports(updatedAirports);
                console.log("Fuel Map data updated from live sheet.");
            }
        } catch (e) {
            console.error("Failed to merge live fuel data", e);
        }
    };

    loadLiveFuelData();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setIsSidebarOpen(true);
      else setIsSidebarOpen(false);
    };

    const handleOnlineStatus = () => setIsOnline(navigator.onLine);

    window.addEventListener('resize', handleResize);
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
    
    handleResize(); 
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, []);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setShowGlobalNotes(false); // Close global notes if opening an airport
    if (isMobile) setIsSidebarOpen(false);
  };

  const handleOpenGlobalNotes = () => {
      setShowGlobalNotes(true);
      setSelectedId(null); // Close airport details if opening global notes
      if (isMobile) setIsSidebarOpen(false);
  };

  const selectedAirport = airports.find(a => a.id === selectedId);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100">
      
      {/* Offline Banner */}
      {!isOnline && (
        <div className="absolute top-0 left-0 right-0 bg-red-600 text-white z-[2000] text-center text-xs font-bold py-1 flex items-center justify-center gap-2">
            <WifiOff size={14} />
            <span>OFFLINE MODE ACTIVE - Displaying cached data</span>
        </div>
      )}
      
      {/* Mobile Toggle Button */}
      {isMobile && !isSidebarOpen && !selectedId && !showGlobalNotes && (
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className={`absolute top-4 left-4 z-[1000] p-3 bg-white rounded-full shadow-lg text-slate-700 hover:bg-slate-50 ${!isOnline ? 'mt-6' : ''}`}
        >
          <Menu size={24} />
        </button>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-[1100] transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } ${!isOnline ? 'pt-6 md:pt-0' : ''}`}>
         <div className="h-full w-80 md:w-96 relative">
            {isMobile && (
                 <button 
                 onClick={() => setIsSidebarOpen(false)}
                 className="absolute top-2 right-2 p-2 bg-slate-800 text-white rounded-full z-50"
               >
                 <X size={20} />
               </button>
            )}
           <Sidebar 
            airports={airports} 
            selectedId={selectedId} 
            onSelect={handleSelect}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            onOpenGlobalNotes={handleOpenGlobalNotes}
          />
         </div>
      </div>
      
      {/* Mobile Overlay */}
      {isMobile && isSidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[1050]" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Main Content Area */}
      <div className={`flex-1 relative flex flex-col h-full ${!isOnline ? 'pt-6' : ''}`}>
        {/* The Map */}
        <div className="absolute inset-0 z-0">
          <Map 
            airports={airports} 
            selectedId={selectedId} 
            onSelect={handleSelect}
            showAirmet={showAirmet}
          />
        </div>

        {/* Quick Fuel Log Toggle */}
        <FuelLogToggle currentAirportId={selectedId} />

        {/* Toolbar */}
        <div className="absolute top-4 right-4 z-[1000] flex items-start gap-2">
          
          {/* G-AIRMET Control */}
          <button 
              onClick={() => setShowAirmet(!showAirmet)}
              className={`flex items-center gap-2 font-bold py-2 px-4 rounded shadow-md border border-slate-200 transition-all active:scale-95 ${
                showAirmet ? 'bg-purple-600 text-white border-purple-600' : 'bg-white hover:bg-slate-50 text-slate-800'
              }`}
            >
              <CloudFog size={18} className={showAirmet ? 'text-white' : 'text-purple-500'} />
              <span>G-AIRMET</span>
            </button>
        </div>

        {/* Airport Details Panel */}
        {selectedAirport && (
            <div className={`absolute z-[1000] bg-white shadow-2xl 
                md:top-4 md:right-4 md:bottom-4 md:w-96 md:rounded-xl md:border md:border-slate-200
                inset-x-0 bottom-0 top-10 rounded-t-2xl md:inset-auto
                ${isMobile ? 'animate-slide-in-up' : 'animate-slide-in-right'}
            `}>
                <AirportDetails 
                    airport={selectedAirport} 
                    onClose={() => setSelectedId(null)} 
                />
            </div>
        )}

        {/* Global Notes Panel */}
        {showGlobalNotes && (
             <div className={`absolute z-[1000] bg-white shadow-2xl 
                md:top-4 md:right-4 md:bottom-4 md:w-96 md:rounded-xl md:border md:border-slate-200
                inset-x-0 bottom-0 top-10 rounded-t-2xl md:inset-auto
                ${isMobile ? 'animate-slide-in-up' : 'animate-slide-in-right'}
            `}>
                <GlobalNotesFeed 
                    onClose={() => setShowGlobalNotes(false)} 
                    onSelectAirport={handleSelect}
                />
            </div>
        )}
      </div>
    </div>
  );
};

export default App;
