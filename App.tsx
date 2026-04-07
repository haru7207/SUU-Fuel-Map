
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Map from './components/Map';
import AirportDetails from './components/AirportDetails';
import FuelLogToggle from './components/FuelLogToggle';
import GlobalNotesFeed from './components/GlobalNotesFeed';
import { AIRPORT_DATABASE } from './constants';
import { fetchFuelMapData, fetchAllWeather, fetchStationInfo, fetchAllNotamsWithGemini } from './services/aviationService';
import { Menu, X, CloudFog, WifiOff, Sun, Moon, Monitor, AlertTriangle } from 'lucide-react';
import { Airport, CardType, FuelType, WeatherData, NotamData } from './types';

const App: React.FC = () => {
  const [airports, setAirports] = useState<Airport[]>(AIRPORT_DATABASE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Theme State
  const [themeMode, setThemeMode] = useState<'day' | 'night' | 'auto'>(() => {
    return (localStorage.getItem('suu_theme_mode') as 'day' | 'night' | 'auto') || 'auto';
  });
  
  // New State for Global Notes Panel
  const [showGlobalNotes, setShowGlobalNotes] = useState(false);
  
  // G-AIRMET State
  const [showAirmet, setShowAirmet] = useState(false);

  // Weather State
  const [weatherMap, setWeatherMap] = useState<Record<string, WeatherData>>({});
  
  // NOTAM State
  const [notamMap, setNotamMap] = useState<Record<string, NotamData>>({});

  // Fuel Log State
  const [isFuelLogOpen, setIsFuelLogOpen] = useState(false);

  // Theme Effect
  useEffect(() => {
    localStorage.setItem('suu_theme_mode', themeMode);
    
    const updateTheme = () => {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = themeMode === 'auto' ? prefersDark : themeMode === 'night';
      
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    updateTheme();

    if (themeMode === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', updateTheme);
      return () => mediaQuery.removeEventListener('change', updateTheme);
    }
  }, [themeMode]);

    // Initial Fetch for Live Fuel Data and Weather
    useEffect(() => {
        const loadData = async () => {
            if (!navigator.onLine) return;
            
            let currentAirports = [...AIRPORT_DATABASE];
            
            try {
                console.log("Fetching live fuel map data...");
                const liveData = await fetchFuelMapData();
                
                if (liveData && liveData.length > 0) {
                    const newAirportsToFetch = [];
                    
                    for (const match of liveData) {
                        const existingIndex = currentAirports.findIndex(a => a.id === match.id);
                        
                        // Normalize card type string to Enum
                        let cardType = CardType.PCARD; // Default
                        if (existingIndex >= 0) cardType = currentAirports[existingIndex].cardRules.primary;
                        
                        const cardStr = (match.card || '').toLowerCase();
                        if (cardStr.includes('white')) cardType = CardType.WHITE_CARD;
                        else if (cardStr.includes('avfuel') || cardStr.includes('black')) cardType = CardType.AVFUEL;
                        else if (cardStr.includes('pcard') || cardStr.includes('us bank')) cardType = CardType.PCARD;
                        
                        if (existingIndex >= 0) {
                            // Merge fields for existing airport
                            currentAirports[existingIndex] = {
                                ...currentAirports[existingIndex],
                                fbo: match.fbo || currentAirports[existingIndex].fbo,
                                phone: match.contact || currentAirports[existingIndex].phone,
                                cardRules: {
                                    ...currentAirports[existingIndex].cardRules,
                                    primary: cardType,
                                    notes: match.note || currentAirports[existingIndex].cardRules.notes
                                }
                            };
                        } else {
                            // Queue new airport for fetching station info
                            newAirportsToFetch.push({ match, cardType });
                        }
                    }
                    
                    // Fetch station info for new airports
                    for (const { match, cardType } of newAirportsToFetch) {
                        let airportId = match.id;
                        // Some airports in the sheet might be 3 letters (e.g. ORD instead of KORD)
                        // The AWC API usually expects 4 letters for US airports (K + 3 letters)
                        if (airportId.length === 3 && /^[a-zA-Z]+$/.test(airportId)) {
                            airportId = 'K' + airportId;
                        }

                        const stationInfo = await fetchStationInfo(airportId);
                        if (stationInfo) {
                            // Determine fuel types from string if available
                            const fuelTypes: FuelType[] = [];
                            const fuelStr = (match.fueltype || '').toLowerCase();
                            if (fuelStr.includes('100ll') || fuelStr.includes('avgas')) fuelTypes.push(FuelType.LL100);
                            if (fuelStr.includes('jet')) fuelTypes.push(FuelType.JETA);
                            if (fuelTypes.length === 0) fuelTypes.push(FuelType.LL100, FuelType.JETA); // Default assumption
                            
                            currentAirports.push({
                                id: match.id, // Keep original ID from sheet for matching
                                weatherSource: airportId, // Use the 4-letter ID for weather if we modified it
                                name: stationInfo.name,
                                city: stationInfo.city,
                                state: stationInfo.state,
                                lat: stationInfo.lat,
                                lon: stationInfo.lon,
                                fbo: match.fbo || 'Unknown FBO',
                                phone: match.contact || 'N/A',
                                fuelTypes: fuelTypes,
                                runways: [],
                                frequencies: [],
                                cardRules: {
                                    primary: cardType,
                                    notes: match.note || ''
                                }
                            });
                            console.log(`Added new airport from live database: ${match.id}`);
                        } else {
                            console.warn(`Could not find station info for new airport: ${match.id}`);
                        }
                    }
                    
                    setAirports(currentAirports);
                    console.log("Fuel Map data updated from live sheet.");
                }
            } catch (e) {
                console.error("Failed to merge live fuel data", e);
            }

            // Now fetch weather for ALL airports (including newly added ones)
            try {
                console.log("Fetching weather for all airports...");
                const weatherData = await fetchAllWeather(currentAirports.map(a => a.weatherSource || a.id));
                setWeatherMap(weatherData);
            } catch (e) {
                console.error("Failed to fetch weather data", e);
            }

            // Fetch NOTAMs for ALL airports
            try {
                console.log("Fetching NOTAMs for all airports...");
                // We don't await this so it doesn't block the UI, it will update state when done
                fetchAllNotamsWithGemini(currentAirports.map(a => a.id)).then(notamData => {
                    setNotamMap(notamData);
                });
            } catch (e) {
                console.error("Failed to fetch NOTAM data", e);
            }
        };

        loadData();
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
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-900">
      
      {/* Offline Banner */}
      {!isOnline && (
        <div className="absolute top-0 left-0 right-0 bg-red-600 text-white z-[2000] text-center text-xs font-bold py-1 flex items-center justify-center gap-2">
            <WifiOff size={14} />
            <span>OFFLINE MODE ACTIVE - Displaying cached data</span>
        </div>
      )}

      {/* Critical Weather Banner */}
      {selectedAirport && weatherMap[selectedAirport.weatherSource || selectedAirport.id] && 
       ['IFR', 'LIFR'].includes(weatherMap[selectedAirport.weatherSource || selectedAirport.id].flightCategory) && (
        <div className={`absolute ${!isOnline ? 'top-6' : 'top-0'} left-0 right-0 z-[1900] bg-red-600 text-white px-4 py-2 shadow-md flex items-center justify-center gap-2 animate-fade-in`}>
            <AlertTriangle size={18} className="animate-pulse" />
            <span className="text-sm font-bold uppercase tracking-wider">
                CRITICAL WEATHER: {weatherMap[selectedAirport.weatherSource || selectedAirport.id].flightCategory} Conditions at {selectedAirport.id}
            </span>
        </div>
      )}
      
      {/* Mobile Toggle Button */}
      {isMobile && !isSidebarOpen && !selectedId && !showGlobalNotes && (
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className={`absolute top-4 left-4 z-[1000] p-3 bg-white dark:bg-slate-800 rounded-full shadow-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 ${!isOnline ? 'mt-6' : ''}`}
        >
          <Menu size={24} />
        </button>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-[1100] transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } ${!isOnline ? 'pt-6 md:pt-0' : ''}`}>
         <div className="h-full w-80 md:w-96 relative">
           <Sidebar 
            airports={airports} 
            selectedId={selectedId} 
            onSelect={handleSelect}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            onOpenGlobalNotes={handleOpenGlobalNotes}
            themeMode={themeMode}
            setThemeMode={setThemeMode}
            isMobile={isMobile}
            onClose={() => setIsSidebarOpen(false)}
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
            weatherMap={weatherMap}
          />
        </div>

        {/* Quick Fuel Log Toggle */}
        <FuelLogToggle 
          currentAirportId={selectedId} 
          isOnline={isOnline} 
          isOpen={isFuelLogOpen}
          setIsOpen={setIsFuelLogOpen}
          isHidden={isMobile && (!!selectedId || showGlobalNotes || isSidebarOpen)}
        />

        {/* Toolbar */}
        <div className="absolute top-4 right-4 z-[1000] flex items-start gap-2">
          
          {/* G-AIRMET Control */}
          <button 
              onClick={() => setShowAirmet(!showAirmet)}
              className={`flex items-center gap-2 font-bold py-2 px-4 rounded shadow-md border border-slate-200 dark:border-slate-700 transition-all active:scale-95 ${
                showAirmet ? 'bg-purple-600 text-white border-purple-600' : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
              }`}
            >
              <CloudFog size={18} className={showAirmet ? 'text-white' : 'text-purple-500'} />
              <span>G-AIRMET</span>
            </button>
        </div>

        {/* Airport Details Panel */}
        {selectedAirport && (
            <div className={`absolute z-[1000] bg-white dark:bg-slate-900 shadow-2xl 
                md:top-4 md:right-4 md:bottom-4 md:w-96 md:rounded-xl md:border md:border-slate-200 dark:md:border-slate-700
                inset-x-0 bottom-0 top-10 rounded-t-2xl md:inset-auto
                ${isMobile ? 'animate-slide-in-up' : 'animate-slide-in-right'}
            `}>
                <AirportDetails 
                    airport={selectedAirport} 
                    onClose={() => setSelectedId(null)} 
                    onOpenFuelLog={() => setIsFuelLogOpen(true)}
                    weatherMap={weatherMap}
                    notamMap={notamMap}
                />
            </div>
        )}

        {/* Global Notes Panel */}
        {showGlobalNotes && (
             <div className={`absolute z-[1000] bg-white dark:bg-slate-900 shadow-2xl 
                md:top-4 md:right-4 md:bottom-4 md:w-96 md:rounded-xl md:border md:border-slate-200 dark:md:border-slate-700
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
