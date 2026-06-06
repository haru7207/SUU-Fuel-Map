
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Sidebar from './components/Sidebar';
import Map from './components/Map';
import AirportDetails from './components/AirportDetails';
import FuelLogToggle from './components/FuelLogToggle';
import { FlightTimeCalculator } from './components/FlightTimeCalculator';
import { VORCheckLog } from './components/VORCheckLog';
import { PivotalAltitudeCalculator } from './components/PivotalAltitudeCalculator';
import { NightTimeCalculator } from './components/NightTimeCalculator';
import { HoldingCalculator } from './components/HoldingCalculator';
import { VaCalculator } from './components/VaCalculator';
import { ISACalculator } from './components/ISACalculator';
import { WindComponentsCalculator } from './components/WindComponentsCalculator';
import { AirportCheatSheet } from './components/AirportCheatSheet';
import { ReleaseNotesModal } from './components/ReleaseNotesModal';
import { AIRPORT_DATABASE } from './constants';
import { fetchFuelMapData, fetchAllWeather, fetchStationInfo, fetchAllNotamsWithGemini, fetchLiveFuelPricesWithGemini } from './services/aviationService';
import { Menu, X, CloudFog, WifiOff, Sun, Moon, Monitor, AlertTriangle, Clock, Briefcase, Target, FileSpreadsheet, Compass, Calculator, Radio, Plane, ThermometerSun, Wind, Layers, Fuel, Flame, ShieldAlert } from 'lucide-react';
import { E6BCalculator } from './components/E6BCalculator';
import LiveFleetTracker from './components/LiveFleetTracker';
import { Airport, CardType, FuelType, WeatherData, NotamData } from './types';

const App: React.FC = () => {
  const [airports, setAirports] = useState<Airport[]>(() => {
    try {
      const saved = localStorage.getItem('suu_cached_airports');
      return saved ? JSON.parse(saved) : AIRPORT_DATABASE;
    } catch {
      return AIRPORT_DATABASE;
    }
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Theme State
  const [themeMode, setThemeMode] = useState<'day' | 'night' | 'auto'>(() => {
    return (localStorage.getItem('suu_theme_mode') as 'day' | 'night' | 'auto') || 'auto';
  });

  // Base Map Type State
  const [baseMapType, setBaseMapType] = useState<'roadmap' | 'hybrid' | 'satellite' | 'terrain'>(() => {
    return (localStorage.getItem('suu_base_map_type') as 'roadmap' | 'hybrid' | 'satellite' | 'terrain') || 'roadmap';
  });

  useEffect(() => {
    localStorage.setItem('suu_base_map_type', baseMapType);
  }, [baseMapType]);
  
  // G-AIRMET State
  const [showAirmet, setShowAirmet] = useState(false);

  // Weather State
  const [weatherMap, setWeatherMap] = useState<Record<string, WeatherData>>(() => {
    try {
      const saved = localStorage.getItem('suu_cached_weather');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  
  // NOTAM State
  const [notamMap, setNotamMap] = useState<Record<string, NotamData>>(() => {
    try {
      const saved = localStorage.getItem('suu_cached_notams');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Cache persistence effects
  useEffect(() => {
    if (airports && airports.length > 0) {
      localStorage.setItem('suu_cached_airports', JSON.stringify(airports));
    }
  }, [airports]);

  useEffect(() => {
    if (weatherMap && Object.keys(weatherMap).length > 0) {
      localStorage.setItem('suu_cached_weather', JSON.stringify(weatherMap));
    }
  }, [weatherMap]);

  useEffect(() => {
    if (notamMap && Object.keys(notamMap).length > 0) {
      localStorage.setItem('suu_cached_notams', JSON.stringify(notamMap));
    }
  }, [notamMap]);

  // Fuel Log State
  const [isFuelLogOpen, setIsFuelLogOpen] = useState(false);
  const [isFlightTimeOpen, setIsFlightTimeOpen] = useState(false);
  const [isPivotalAltOpen, setIsPivotalAltOpen] = useState(false);
  const [isNightTimeOpen, setIsNightTimeOpen] = useState(false);
  const [isHoldingOpen, setIsHoldingOpen] = useState(false);
  const [isVaOpen, setIsVaOpen] = useState(false);
  const [isIsaOpen, setIsIsaOpen] = useState(false);
  const [isWindOpen, setIsWindOpen] = useState(false);
  const [isCheatSheetOpen, setIsCheatSheetOpen] = useState(false);
  const [isVORCheckOpen, setIsVORCheckOpen] = useState(false);
  const [isE6BOpen, setIsE6BOpen] = useState(false);
  const [isFleetTrackerOpen, setIsFleetTrackerOpen] = useState(false);
  const [trackedAircraft, setTrackedAircraft] = useState<any | null>(null);
  const [cheatSheetQuery, setCheatSheetQuery] = useState('');
  const [isInstructorToolsMenuOpen, setIsInstructorToolsMenuOpen] = useState(false);

  // Favorites State
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('suu_favorite_airports');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('suu_favorite_airports', JSON.stringify(favorites));
  }, [favorites]);

  const handleToggleFavorite = (id: string) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]
    );
  };

  // Layers Menu Open State
  const [isLayersMenuOpen, setIsLayersMenuOpen] = useState(false);

  // Layer Settings State (defaults to showing nothing)
  const [mapLayers, setMapLayers] = useState<{
    fuelPrices: boolean;
    weatherOverlay: boolean;
    notamWarnings: boolean;
    wildfires: boolean;
    tfrs: boolean;
  }>(() => {
    try {
      const saved = localStorage.getItem('suu_map_layers_v4');
      return saved ? JSON.parse(saved) : {
        fuelPrices: false,
        weatherOverlay: false,
        notamWarnings: false,
        wildfires: false,
        tfrs: false
      };
    } catch {
      return {
        fuelPrices: false,
        weatherOverlay: false,
        notamWarnings: false,
        wildfires: false,
        tfrs: false
      };
    }
  });

  useEffect(() => {
    localStorage.setItem('suu_map_layers_v4', JSON.stringify(mapLayers));
  }, [mapLayers]);

  const toggleMapLayer = (layerKey: 'fuelPrices' | 'weatherOverlay' | 'notamWarnings' | 'wildfires' | 'tfrs') => {
    setMapLayers(prev => ({
      ...prev,
      [layerKey]: !prev[layerKey]
    }));
  };



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
            
            let currentAirports = [];
            try {
                const saved = localStorage.getItem('suu_cached_airports');
                currentAirports = saved ? JSON.parse(saved) : [...AIRPORT_DATABASE];
            } catch {
                currentAirports = [...AIRPORT_DATABASE];
            }
            
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

            // Fetch live fuel prices via Gemini
            try {
                console.log("Fetching live fuel prices via Gemini...");
                fetchLiveFuelPricesWithGemini(currentAirports.map(a => a.id)).then(livePrices => {
                    if (livePrices && Object.keys(livePrices).length > 0) {
                        setAirports(prev => {
                            return prev.map(airport => {
                                const pricesForAirport = livePrices[airport.id];
                                if (pricesForAirport) {
                                    const updatedPrices = { ...(airport.fuelPrices || {}) };
                                    let updated = false;
                                    
                                    if (pricesForAirport['100LL'] !== undefined && typeof pricesForAirport['100LL'] === 'number') {
                                        updatedPrices[FuelType.LL100] = pricesForAirport['100LL'];
                                        updated = true;
                                    }
                                    if (pricesForAirport['Jet A'] !== undefined && typeof pricesForAirport['Jet A'] === 'number') {
                                        updatedPrices[FuelType.JETA] = pricesForAirport['Jet A'];
                                        updated = true;
                                    }
                                    
                                    if (updated) {
                                        return {
                                            ...airport,
                                            fuelPrices: updatedPrices,
                                            fuelPricesLastUpdated: new Date().toISOString()
                                        };
                                    }
                                }
                                return airport;
                            });
                        });
                        console.log("Live fuel prices updated successfully via Gemini.");
                    }
                }).catch(err => {
                    console.error("Error in live fuel price background fetch:", err);
                });
            } catch (e) {
                console.error("Failed to start live fuel prices fetch", e);
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
    if (isMobile) setIsSidebarOpen(false);
  };

  // Automatically check cache & refresh live fuel prices every 15 minutes.
  // Since the cache lifespan is 2 hours, this periodically updates prices without user interaction.
  useEffect(() => {
    if (airports.length === 0) return;

    const checkAndRefreshPrices = async () => {
      try {
        console.log("[Auto-Refresh] Checking live fuel prices...");
        const livePrices = await fetchLiveFuelPricesWithGemini(airports.map(a => a.id), false);
        if (livePrices && Object.keys(livePrices).length > 0) {
          setAirports(prev => {
            return prev.map(airport => {
              const pricesForAirport = livePrices[airport.id];
              if (pricesForAirport) {
                const updatedPrices = { ...(airport.fuelPrices || {}) };
                let updated = false;
                
                if (pricesForAirport['100LL'] !== undefined && typeof pricesForAirport['100LL'] === 'number') {
                  updatedPrices[FuelType.LL100] = pricesForAirport['100LL'];
                  updated = true;
                }
                if (pricesForAirport['Jet A'] !== undefined && typeof pricesForAirport['Jet A'] === 'number') {
                  updatedPrices[FuelType.JETA] = pricesForAirport['Jet A'];
                  updated = true;
                }
                
                if (updated) {
                  return {
                    ...airport,
                    fuelPrices: updatedPrices,
                    fuelPricesLastUpdated: new Date().toISOString()
                  };
                }
              }
              return airport;
            });
          });
          console.log("[Auto-Refresh] Fuel prices checked/updated successfully.");
        }
      } catch (err) {
        console.error("[Auto-Refresh] Error checking live fuel prices:", err);
      }
    };

    const intervalId = setInterval(checkAndRefreshPrices, 15 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [airports.length]);

  const selectedAirport = airports.find(a => a.id === selectedId);

  const isAnyCfiToolOpen = isFlightTimeOpen || 
    isPivotalAltOpen || 
    isNightTimeOpen || 
    isHoldingOpen || 
    isVaOpen || 
    isIsaOpen || 
    isWindOpen || 
    isCheatSheetOpen || 
    isVORCheckOpen || 
    isE6BOpen || 
    isFleetTrackerOpen ||
    (isMobile && isInstructorToolsMenuOpen);

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
      {isMobile && !isSidebarOpen && !selectedId && (
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className={`absolute top-4 left-4 z-[1000] p-2 md:p-3 bg-white dark:bg-slate-800 rounded-full shadow-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 ${!isOnline ? 'mt-6' : ''}`}
        >
          <Menu size={18} className="md:w-6 md:h-6" />
        </button>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-[1100] transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } ${!isOnline ? 'pt-6 md:pt-0' : ''}`}>
         <div className="h-full w-80 md:w-96 relative">
           <Sidebar airports={airports} 
            selectedId={selectedId} 
            onSelect={handleSelect}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            onOpenCheatSheet={(query) => {
              setCheatSheetQuery(query);
              setIsCheatSheetOpen(true);
              if (isMobile) setIsSidebarOpen(false);
            }}
            themeMode={themeMode}
            setThemeMode={setThemeMode}
            baseMapType={baseMapType}
            setBaseMapType={setBaseMapType}
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
            notamMap={notamMap}
            mapLayers={mapLayers}
            baseMapType={baseMapType}
            trackedAircraft={trackedAircraft}
          />
        </div>

        {/* Quick Fuel Log Toggle */}
        <FuelLogToggle 
          currentAirportId={selectedId} 
          isOnline={isOnline} 
          isOpen={isFuelLogOpen}
          setIsOpen={setIsFuelLogOpen}
          isHidden={isAnyCfiToolOpen || (isMobile && (!!selectedId || isSidebarOpen))}
          onOpenFlightTime={() => setIsFlightTimeOpen(true)}
          isFlightTimeOpen={isFlightTimeOpen}
          airports={airports}
        />

        {/* VOR Check Log Modal */}
        <VORCheckLog isOpen={isVORCheckOpen} onClose={() => setIsVORCheckOpen(false)} />

        {/* Flight Time Calculator Panel */}
        <FlightTimeCalculator
          isOpen={isFlightTimeOpen}
          setIsOpen={setIsFlightTimeOpen}
          isHidden={isMobile && (!!selectedId || isSidebarOpen)}
        />

        {/* Pivotal Altitude Calculator Panel */}
        <PivotalAltitudeCalculator
          isOpen={isPivotalAltOpen}
          setIsOpen={setIsPivotalAltOpen}
          isHidden={isMobile && (!!selectedId || isSidebarOpen)}
        />

        {/* Night Time Calculator Panel */}
        <NightTimeCalculator
          isOpen={isNightTimeOpen}
          setIsOpen={setIsNightTimeOpen}
          isHidden={isMobile && (!!selectedId || isSidebarOpen)}
        />

        <AirportCheatSheet
          isOpen={isCheatSheetOpen}
          initialSearchQuery={cheatSheetQuery}
          onClose={() => setIsCheatSheetOpen(false)}
        />

        <HoldingCalculator
          isOpen={isHoldingOpen}
          onClose={() => setIsHoldingOpen(false)}
        />
        <VaCalculator
          isOpen={isVaOpen}
          onClose={() => setIsVaOpen(false)}
        />
        <ISACalculator
          isOpen={isIsaOpen}
          onClose={() => setIsIsaOpen(false)}
        />
        <WindComponentsCalculator
          isOpen={isWindOpen}
          onClose={() => setIsWindOpen(false)}
        />

        <E6BCalculator
          isOpen={isE6BOpen}
          onClose={() => setIsE6BOpen(false)}
        />

        <LiveFleetTracker
          isOpen={isFleetTrackerOpen}
          onClose={() => setIsFleetTrackerOpen(false)}
          onTrackFlight={(aircraft) => { setTrackedAircraft(aircraft); }}
        />

        {/* Toolbar */}
        <div className="absolute top-4 right-4 z-[1000] flex flex-col items-end gap-2">
          
          {/* Map Layers Dropdown */}
          <div className="relative w-full">
            <button
              onClick={() => setIsLayersMenuOpen(!isLayersMenuOpen)}
              className={`flex items-center justify-center gap-2 font-bold py-1.5 px-3 text-xs md:text-sm rounded shadow-md border transition-all active:scale-95 w-full ${
                isLayersMenuOpen ? 'bg-indigo-600 text-white border-indigo-600 font-bold' : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
              }`}
              title="Toggle map layers and overlay information"
            >
              <Layers size={14} className={`md:w-4 md:h-4 ${isLayersMenuOpen ? 'text-white' : 'text-indigo-500'}`} />
              <span>Map Layers</span>
            </button>

            {isLayersMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col z-[1050] origin-top-right">
                {/* Header */}
                <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers size={14} className="text-indigo-500" />
                    <span className="text-[10px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">Map Overlays</span>
                  </div>
                  <button 
                    onClick={() => setIsLayersMenuOpen(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    <X size={14} />
                  </button>
                </div>
                {/* Options List */}
                <div className="p-3 space-y-3">
                  {/* Layer option: Fuel Prices */}
                  <label className="flex items-center justify-between cursor-pointer group select-none">
                    <div className="flex items-center gap-2">
                      <Fuel size={14} className="text-emerald-500" />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Fuel Prices</span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500">100LL Active rates</span>
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer" 
                      checked={mapLayers.fuelPrices}
                      onChange={() => toggleMapLayer('fuelPrices')}
                    />
                  </label>

                  {/* Layer option: Wind Overlay */}
                  <label className="flex items-center justify-between cursor-pointer group select-none">
                    <div className="flex items-center gap-2">
                      <Wind size={14} className="text-blue-500 animate-[spin_8s_linear_infinite]" />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Wind Overlay</span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500">Speed, gust & direction (METAR)</span>
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer" 
                      checked={mapLayers.weatherOverlay}
                      onChange={() => toggleMapLayer('weatherOverlay')}
                    />
                  </label>

                  {/* Layer option: NOTAM Warnings */}
                  <label className="flex items-center justify-between cursor-pointer group select-none">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={14} className="text-red-500" />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">NOTAM Warnings</span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500">Runway & fuel hazards</span>
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer" 
                      checked={mapLayers.notamWarnings}
                      onChange={() => toggleMapLayer('notamWarnings')}
                    />
                  </label>

                  {/* Layer option: Wildfire Hazards */}
                  <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800">
                    <label className="flex items-center justify-between cursor-pointer group select-none">
                      <div className="flex items-center gap-2">
                        <Flame size={14} className="text-orange-600" />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">🔥 Wildfire Hazards</span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500">NIFC Active Perimeters</span>
                        </div>
                      </div>
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer" 
                        checked={mapLayers.wildfires}
                        onChange={() => toggleMapLayer('wildfires')}
                      />
                    </label>
                  </div>

                  {/* Layer option: TFR Hazards */}
                  <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800">
                    <label className="flex items-center justify-between cursor-pointer group select-none">
                      <div className="flex items-center gap-2">
                        <ShieldAlert size={14} className="text-rose-600" />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">🚫 TFRs (Airspace)</span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500">FAA Temporary Restrictions</span>
                        </div>
                      </div>
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer" 
                        checked={mapLayers.tfrs}
                        onChange={() => toggleMapLayer('tfrs')}
                      />
                    </label>
                  </div>

                  {/* Layer option: G-AIRMET (Integrated toggle!) */}
                  <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800">
                    <label className="flex items-center justify-between cursor-pointer group select-none">
                      <div className="flex items-center gap-2">
                        <CloudFog size={14} className="text-purple-500" />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">G-AIRMET Areas</span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500">Icing / Turbulence grids</span>
                        </div>
                      </div>
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer" 
                        checked={showAirmet}
                        onChange={() => setShowAirmet(!showAirmet)}
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Instructor Tools Dropdown */}
            {!(isMobile && (!!selectedId || isSidebarOpen)) && (
              <div className="relative w-full">
                <button
                  onClick={() => setIsInstructorToolsMenuOpen(!isInstructorToolsMenuOpen)}
                  className={`flex items-center justify-center gap-2 font-bold py-1.5 px-3 text-xs md:text-sm rounded shadow-md border transition-all active:scale-95 w-full ${
                    isInstructorToolsMenuOpen || isFlightTimeOpen || isPivotalAltOpen || isNightTimeOpen || isHoldingOpen || isCheatSheetOpen || isE6BOpen || isVORCheckOpen || isVaOpen || isIsaOpen || isWindOpen ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Briefcase size={14} className={`md:w-4 md:h-4 ${isInstructorToolsMenuOpen || isFlightTimeOpen || isPivotalAltOpen || isNightTimeOpen || isHoldingOpen || isCheatSheetOpen || isE6BOpen || isVORCheckOpen || isVaOpen || isIsaOpen || isWindOpen ? 'text-white' : 'text-blue-500'}`} />
                  <span>CFI Tools</span>
                </button>

                {!isMobile && isInstructorToolsMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-[calc(100vw-2rem)] sm:w-[480px] bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col z-[1050] origin-top-right">
                    
                    {/* Header */}
                    <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
                      <div className="bg-blue-100 dark:bg-blue-900/40 p-2 rounded-lg text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40">
                        <Briefcase size={20} />
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">CFI Digital Toolkit</div>
                        <div className="text-xs text-slate-500 font-medium mt-0.5">Quick reference tools for instructors</div>
                      </div>
                    </div>

                    <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                      
                      {/* Column 1 */}
                      <div className="space-y-4">
                        {/* Time & Logs */}
                        <div>
                          <div className="px-2 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700 mb-2">Time & Logs</div>
                          <button
                            onClick={() => {
                              setIsFlightTimeOpen(true);
                              setIsNightTimeOpen(false);
                              setIsPivotalAltOpen(false);
                              setIsHoldingOpen(false);
                              setIsVaOpen(false);
                              setIsIsaOpen(false);
                              setIsWindOpen(false);
                              setIsE6BOpen(false);
                              setIsCheatSheetOpen(false);
                              setIsVORCheckOpen(false);
                              setIsInstructorToolsMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold text-left transition-all group"
                          >
                            <div className="bg-blue-100 dark:bg-blue-600/20 p-2 rounded-lg group-hover:scale-110 transition-transform"><Clock size={16} className="text-blue-600 dark:text-blue-400" /></div>
                            Flight Time Calc
                          </button>
                          <button
                            onClick={() => {
                              setIsFlightTimeOpen(false);
                              setIsNightTimeOpen(true);
                              setIsPivotalAltOpen(false);
                              setIsHoldingOpen(false);
                              setIsVaOpen(false);
                              setIsIsaOpen(false);
                              setIsWindOpen(false);
                              setIsE6BOpen(false);
                              setIsCheatSheetOpen(false);
                              setIsVORCheckOpen(false);
                              setIsInstructorToolsMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold text-left transition-all group"
                          >
                            <div className="bg-purple-100 dark:bg-purple-600/20 p-2 rounded-lg group-hover:scale-110 transition-transform"><Moon size={16} className="text-purple-600 dark:text-purple-400" /></div>
                            Night Time Calc
                          </button>
                          <button
                            onClick={() => {
                              setIsFlightTimeOpen(false);
                              setIsNightTimeOpen(false);
                              setIsPivotalAltOpen(false);
                              setIsHoldingOpen(false);
                              setIsVaOpen(false);
                              setIsIsaOpen(false);
                              setIsWindOpen(false);
                              setIsE6BOpen(false);
                              setIsCheatSheetOpen(false);
                              setIsVORCheckOpen(true);
                              setIsInstructorToolsMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold text-left transition-all group"
                          >
                            <div className="bg-cyan-100 dark:bg-cyan-600/20 p-2 rounded-lg group-hover:scale-110 transition-transform"><Radio size={16} className="text-cyan-600 dark:text-cyan-400" /></div>
                            VOR Receiver Check
                          </button>
                        </div>
                        
                        {/* Performance & Weather */}
                        <div>
                          <div className="px-2 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700 mb-2">Performance & WX</div>
                          <button
                            onClick={() => {
                              setIsFlightTimeOpen(false);
                              setIsNightTimeOpen(false);
                              setIsPivotalAltOpen(false);
                              setIsHoldingOpen(false);
                              setIsVaOpen(true);
                              setIsIsaOpen(false);
                              setIsWindOpen(false);
                              setIsE6BOpen(false);
                              setIsCheatSheetOpen(false);
                              setIsVORCheckOpen(false);
                              setIsInstructorToolsMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold text-left transition-all group"
                          >
                            <div className="bg-emerald-100 dark:bg-emerald-600/20 p-2 rounded-lg group-hover:scale-110 transition-transform"><Plane size={16} className="text-emerald-600 dark:text-emerald-400" /></div>
                            SR20 Maneuvering Speed
                          </button>
                          <button
                            onClick={() => {
                              setIsFlightTimeOpen(false);
                              setIsNightTimeOpen(false);
                              setIsPivotalAltOpen(false);
                              setIsHoldingOpen(false);
                              setIsVaOpen(false);
                              setIsIsaOpen(true);
                              setIsE6BOpen(false);
                              setIsCheatSheetOpen(false);
                              setIsVORCheckOpen(false);
                              setIsInstructorToolsMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold text-left transition-all group"
                          >
                            <div className="bg-orange-100 dark:bg-orange-600/20 p-2 rounded-lg group-hover:scale-110 transition-transform"><ThermometerSun size={16} className="text-orange-600 dark:text-orange-400" /></div>
                            ISA Dev & Atmosphere
                          </button>
                          <button
                            onClick={() => {
                              setIsFlightTimeOpen(false);
                              setIsNightTimeOpen(false);
                              setIsPivotalAltOpen(false);
                              setIsHoldingOpen(false);
                              setIsVaOpen(false);
                              setIsIsaOpen(false);
                              setIsWindOpen(false);
                              setIsWindOpen(true);
                              setIsE6BOpen(false);
                              setIsCheatSheetOpen(false);
                              setIsVORCheckOpen(false);
                              setIsInstructorToolsMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold text-left transition-all group"
                          >
                            <div className="bg-sky-100 dark:bg-sky-600/20 p-2 rounded-lg group-hover:scale-110 transition-transform"><Wind size={16} className="text-sky-600 dark:text-sky-400" /></div>
                            Wind Components
                          </button>
                        </div>
                      </div>

                      {/* Column 2 */}
                      <div className="space-y-4">
                        {/* Navigation */}
                        <div>
                          <div className="px-2 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700 mb-2">Navigation</div>
                          <button
                            onClick={() => {
                              setIsFlightTimeOpen(false);
                              setIsNightTimeOpen(false);
                              setIsPivotalAltOpen(false);
                              setIsHoldingOpen(true);
                              setIsVaOpen(false);
                              setIsIsaOpen(false);
                              setIsWindOpen(false);
                              setIsE6BOpen(false);
                              setIsCheatSheetOpen(false);
                              setIsVORCheckOpen(false);
                              setIsInstructorToolsMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold text-left transition-all group"
                          >
                            <div className="bg-rose-100 dark:bg-rose-600/20 p-2 rounded-lg group-hover:scale-110 transition-transform"><Compass size={16} className="text-rose-600 dark:text-rose-400" /></div>
                            Holding Pattern Entry
                          </button>
                          <button
                            onClick={() => {
                              setIsFlightTimeOpen(false);
                              setIsNightTimeOpen(false);
                              setIsPivotalAltOpen(true);
                              setIsHoldingOpen(false);
                              setIsVaOpen(false);
                              setIsIsaOpen(false);
                              setIsWindOpen(false);
                              setIsE6BOpen(false);
                              setIsCheatSheetOpen(false);
                              setIsVORCheckOpen(false);
                              setIsInstructorToolsMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold text-left transition-all group"
                          >
                            <div className="bg-indigo-100 dark:bg-indigo-600/20 p-2 rounded-lg group-hover:scale-110 transition-transform"><Target size={16} className="text-indigo-600 dark:text-indigo-400" /></div>
                            Pivotal Altitude
                          </button>
                          <button
                            onClick={() => {
                              setIsFlightTimeOpen(false);
                              setIsNightTimeOpen(false);
                              setIsPivotalAltOpen(false);
                              setIsHoldingOpen(false);
                              setIsVaOpen(false);
                              setIsIsaOpen(false);
                              setIsWindOpen(false);
                              setIsE6BOpen(false);
                              setIsCheatSheetOpen(false);
                              setIsVORCheckOpen(false);
                              setIsFleetTrackerOpen(true);
                              setIsInstructorToolsMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold text-left transition-all group"
                          >
                            <div className="bg-emerald-100 dark:bg-emerald-600/20 p-2 rounded-lg group-hover:scale-110 transition-transform"><AlertTriangle size={16} className="text-emerald-600 dark:text-emerald-400" /></div>
                            Live Fleet Tracker
                          </button>
                        </div>

                        {/* Preflight & Ref */}
                        <div>
                          <div className="px-2 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700 mb-2">Preflight & Ref</div>
                          <button
                            onClick={() => {
                              setIsFlightTimeOpen(false);
                              setIsNightTimeOpen(false);
                              setIsPivotalAltOpen(false);
                              setIsHoldingOpen(false);
                              setIsVaOpen(false);
                              setIsIsaOpen(false);
                              setIsWindOpen(false);
                              setIsE6BOpen(true);
                              setIsCheatSheetOpen(false);
                              setIsVORCheckOpen(false);
                              setIsInstructorToolsMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold text-left transition-all group"
                          >
                            <div className="bg-amber-100 dark:bg-amber-600/20 p-2 rounded-lg group-hover:scale-110 transition-transform"><Calculator size={16} className="text-amber-600 dark:text-amber-400" /></div>
                            E6B Flight Computer
                          </button>
                          <button
                            onClick={() => {
                              setIsFlightTimeOpen(false);
                              setIsNightTimeOpen(false);
                              setIsPivotalAltOpen(false);
                              setIsHoldingOpen(false);
                              setIsVaOpen(false);
                              setIsIsaOpen(false);
                              setIsWindOpen(false);
                              setIsE6BOpen(false);
                              setIsCheatSheetOpen(true);
                              setIsVORCheckOpen(false);
                              setIsInstructorToolsMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold text-left transition-all group"
                          >
                            <div className="bg-teal-100 dark:bg-teal-600/20 p-2 rounded-lg group-hover:scale-110 transition-transform"><FileSpreadsheet size={16} className="text-teal-600 dark:text-teal-400" /></div>
                            Airport Cheat Sheet
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            )}
        </div>

        {/* Airport Details Panel */}
        <AnimatePresence>
          {selectedAirport && (
              <motion.div 
                  key="airport-details-panel"
                  initial={isMobile ? { y: '100%' } : { x: '100%' }}
                  animate={{ y: 0, x: 0 }}
                  exit={isMobile ? { y: '100%' } : { x: '100%' }}
                  transition={{ type: 'spring', damping: 30, stiffness: 240 }}
                  className="absolute z-[1000] bg-white dark:bg-slate-900 shadow-2xl 
                      md:top-4 md:right-4 md:bottom-4 md:w-96 md:rounded-xl md:border md:border-slate-200 dark:md:border-slate-700
                      inset-x-0 bottom-0 top-10 rounded-t-2xl md:inset-auto"
              >
                  <AirportDetails 
                      airport={selectedAirport} 
                      onClose={() => setSelectedId(null)} 
                      isFavorite={favorites.includes(selectedAirport.id)}
                      onToggleFavorite={handleToggleFavorite}
                      onOpenFuelLog={() => setIsFuelLogOpen(true)}
                      weatherMap={weatherMap}
                      notamMap={notamMap}
                  />
              </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile CFI Tools Bottom Sheet */}
        <AnimatePresence>
          {isMobile && isInstructorToolsMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                key="cfi-modal-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsInstructorToolsMenuOpen(false)}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] z-[1200]"
              />

              {/* Drawer Container */}
              <motion.div
                key="cfi-modal-drawer"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                className="fixed bottom-0 inset-x-0 bg-white dark:bg-slate-800 rounded-t-3xl shadow-2xl border-t border-slate-200 dark:border-slate-700 z-[1210] overflow-hidden flex flex-col max-h-[85vh] select-none"
              >
                {/* Drag Handle Indicator */}
                <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto my-3 shrink-0" />

                {/* Header */}
                <div className="px-5 pb-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 dark:bg-blue-900/40 p-2.5 rounded-xl text-blue-600 dark:text-blue-400">
                      <Briefcase size={20} />
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">CFI Digital Toolkit</h2>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">Quick reference tools for instructors</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsInstructorToolsMenuOpen(false)}
                    aria-label="Close Toolkit"
                    className="p-2 -mr-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 pb-8 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    
                    {/* Time & Logs */}
                    <div className="space-y-2">
                      <div className="px-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700 pb-1.5 mb-2">Time & Logs</div>
                      <div className="space-y-1.5">
                        <button
                          onClick={() => {
                            setIsFlightTimeOpen(true);
                            setIsNightTimeOpen(false);
                            setIsPivotalAltOpen(false);
                            setIsHoldingOpen(false);
                            setIsVaOpen(false);
                            setIsIsaOpen(false);
                            setIsWindOpen(false);
                            setIsE6BOpen(false);
                            setIsCheatSheetOpen(false);
                            setIsVORCheckOpen(false);
                            setIsInstructorToolsMenuOpen(false);
                          }}
                          className="w-full h-12 flex items-center gap-3 px-3.5 rounded-xl bg-slate-50 active:bg-slate-100 hover:bg-slate-100 dark:bg-slate-950/40 dark:active:bg-slate-900 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 text-[13px] font-bold text-left transition-all"
                        >
                          <div className="bg-blue-100 dark:bg-blue-600/20 p-1.5 rounded-lg shrink-0"><Clock size={16} className="text-blue-600 dark:text-blue-400" /></div>
                          <span>Flight Time Calc</span>
                        </button>
                        <button
                          onClick={() => {
                            setIsFlightTimeOpen(false);
                            setIsNightTimeOpen(true);
                            setIsPivotalAltOpen(false);
                            setIsHoldingOpen(false);
                            setIsVaOpen(false);
                            setIsIsaOpen(false);
                            setIsWindOpen(false);
                            setIsE6BOpen(false);
                            setIsCheatSheetOpen(false);
                            setIsVORCheckOpen(false);
                            setIsInstructorToolsMenuOpen(false);
                          }}
                          className="w-full h-12 flex items-center gap-3 px-3.5 rounded-xl bg-slate-50 active:bg-slate-100 hover:bg-slate-100 dark:bg-slate-950/40 dark:active:bg-slate-900 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 text-[13px] font-bold text-left transition-all"
                        >
                          <div className="bg-purple-100 dark:bg-purple-600/20 p-1.5 rounded-lg shrink-0"><Moon size={16} className="text-purple-600 dark:text-purple-400" /></div>
                          <span>Night Time Calc</span>
                        </button>
                        <button
                          onClick={() => {
                            setIsFlightTimeOpen(false);
                            setIsNightTimeOpen(false);
                            setIsPivotalAltOpen(false);
                            setIsHoldingOpen(false);
                            setIsVaOpen(false);
                            setIsIsaOpen(false);
                            setIsWindOpen(false);
                            setIsE6BOpen(false);
                            setIsCheatSheetOpen(false);
                            setIsVORCheckOpen(true);
                            setIsInstructorToolsMenuOpen(false);
                          }}
                          className="w-full h-12 flex items-center gap-3 px-3.5 rounded-xl bg-slate-50 active:bg-slate-100 hover:bg-slate-100 dark:bg-slate-950/40 dark:active:bg-slate-900 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 text-[13px] font-bold text-left transition-all"
                        >
                          <div className="bg-cyan-100 dark:bg-cyan-600/20 p-1.5 rounded-lg shrink-0"><Radio size={16} className="text-cyan-600 dark:text-cyan-400" /></div>
                          <span>VOR Receiver Check</span>
                        </button>
                      </div>
                    </div>

                    {/* Performance & Weather */}
                    <div className="space-y-2">
                      <div className="px-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700 pb-1.5 mb-2">Performance & WX</div>
                      <div className="space-y-1.5">
                        <button
                          onClick={() => {
                            setIsFlightTimeOpen(false);
                            setIsNightTimeOpen(false);
                            setIsPivotalAltOpen(false);
                            setIsHoldingOpen(false);
                            setIsVaOpen(true);
                            setIsIsaOpen(false);
                            setIsWindOpen(false);
                            setIsE6BOpen(false);
                            setIsCheatSheetOpen(false);
                            setIsVORCheckOpen(false);
                            setIsInstructorToolsMenuOpen(false);
                          }}
                          className="w-full h-12 flex items-center gap-3 px-3.5 rounded-xl bg-slate-50 active:bg-slate-100 hover:bg-slate-100 dark:bg-slate-950/40 dark:active:bg-slate-900 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 text-[13px] font-bold text-left transition-all"
                        >
                          <div className="bg-emerald-100 dark:bg-emerald-600/20 p-1.5 rounded-lg shrink-0"><Plane size={16} className="text-emerald-600 dark:text-emerald-400" /></div>
                          <span>SR20 Maneuvering Speed</span>
                        </button>
                        <button
                          onClick={() => {
                            setIsFlightTimeOpen(false);
                            setIsNightTimeOpen(false);
                            setIsPivotalAltOpen(false);
                            setIsHoldingOpen(false);
                            setIsVaOpen(false);
                            setIsIsaOpen(true);
                            setIsE6BOpen(false);
                            setIsCheatSheetOpen(false);
                            setIsVORCheckOpen(false);
                            setIsInstructorToolsMenuOpen(false);
                          }}
                          className="w-full h-12 flex items-center gap-3 px-3.5 rounded-xl bg-slate-50 active:bg-slate-100 hover:bg-slate-100 dark:bg-slate-950/40 dark:active:bg-slate-900 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 text-[13px] font-bold text-left transition-all"
                        >
                          <div className="bg-orange-100 dark:bg-orange-600/20 p-1.5 rounded-lg shrink-0"><ThermometerSun size={16} className="text-orange-600 dark:text-orange-400" /></div>
                          <span>ISA Dev & Atmosphere</span>
                        </button>
                        <button
                          onClick={() => {
                            setIsFlightTimeOpen(false);
                            setIsNightTimeOpen(false);
                            setIsPivotalAltOpen(false);
                            setIsHoldingOpen(false);
                            setIsVaOpen(false);
                            setIsIsaOpen(false);
                            setIsWindOpen(true);
                            setIsE6BOpen(false);
                            setIsCheatSheetOpen(false);
                            setIsVORCheckOpen(false);
                            setIsInstructorToolsMenuOpen(false);
                          }}
                          className="w-full h-12 flex items-center gap-3 px-3.5 rounded-xl bg-slate-50 active:bg-slate-100 hover:bg-slate-100 dark:bg-slate-950/40 dark:active:bg-slate-900 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 text-[13px] font-bold text-left transition-all"
                        >
                          <div className="bg-sky-100 dark:bg-sky-600/20 p-1.5 rounded-lg shrink-0"><Wind size={16} className="text-sky-600 dark:text-sky-400" /></div>
                          <span>Wind Components</span>
                        </button>
                      </div>
                    </div>

                    {/* Navigation */}
                    <div className="space-y-2">
                      <div className="px-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700 pb-1.5 mb-2">Navigation</div>
                      <div className="space-y-1.5">
                        <button
                          onClick={() => {
                            setIsFlightTimeOpen(false);
                            setIsNightTimeOpen(false);
                            setIsPivotalAltOpen(false);
                            setIsHoldingOpen(true);
                            setIsVaOpen(false);
                            setIsIsaOpen(false);
                            setIsWindOpen(false);
                            setIsE6BOpen(false);
                            setIsCheatSheetOpen(false);
                            setIsVORCheckOpen(false);
                            setIsInstructorToolsMenuOpen(false);
                          }}
                          className="w-full h-12 flex items-center gap-3 px-3.5 rounded-xl bg-slate-50 active:bg-slate-100 hover:bg-slate-100 dark:bg-slate-950/40 dark:active:bg-slate-900 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 text-[13px] font-bold text-left transition-all"
                        >
                          <div className="bg-rose-100 dark:bg-rose-600/20 p-1.5 rounded-lg shrink-0"><Compass size={16} className="text-rose-600 dark:text-rose-400" /></div>
                          <span>Holding Pattern Entry</span>
                        </button>
                        <button
                          onClick={() => {
                            setIsFlightTimeOpen(false);
                            setIsNightTimeOpen(false);
                            setIsPivotalAltOpen(true);
                            setIsHoldingOpen(false);
                            setIsVaOpen(false);
                            setIsIsaOpen(false);
                            setIsWindOpen(false);
                            setIsE6BOpen(false);
                            setIsCheatSheetOpen(false);
                            setIsVORCheckOpen(false);
                            setIsInstructorToolsMenuOpen(false);
                          }}
                          className="w-full h-12 flex items-center gap-3 px-3.5 rounded-xl bg-slate-50 active:bg-slate-100 hover:bg-slate-100 dark:bg-slate-955/40 dark:active:bg-slate-900 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 text-[13px] font-bold text-left transition-all"
                        >
                          <div className="bg-indigo-100 dark:bg-indigo-600/20 p-1.5 rounded-lg shrink-0"><Target size={16} className="text-indigo-600 dark:text-indigo-400" /></div>
                          <span>Pivotal Altitude</span>
                        </button>
                        <button
                          onClick={() => {
                            setIsFlightTimeOpen(false);
                            setIsNightTimeOpen(false);
                            setIsPivotalAltOpen(false);
                            setIsHoldingOpen(false);
                            setIsVaOpen(false);
                            setIsIsaOpen(false);
                            setIsWindOpen(false);
                            setIsE6BOpen(false);
                            setIsCheatSheetOpen(false);
                            setIsVORCheckOpen(false);
                            setIsFleetTrackerOpen(true);
                            setIsInstructorToolsMenuOpen(false);
                          }}
                          className="w-full h-12 flex items-center gap-3 px-3.5 rounded-xl bg-slate-50 active:bg-slate-100 hover:bg-slate-100 dark:bg-slate-950/40 dark:active:bg-slate-900 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 text-[13px] font-bold text-left transition-all"
                        >
                          <div className="bg-emerald-100 dark:bg-emerald-600/20 p-1.5 rounded-lg shrink-0"><AlertTriangle size={16} className="text-emerald-600 dark:text-emerald-400" /></div>
                          <span>Live Fleet Tracker</span>
                        </button>
                      </div>
                    </div>

                    {/* Preflight & Ref */}
                    <div className="space-y-2">
                      <div className="px-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700 pb-1.5 mb-2">Preflight & Ref</div>
                      <div className="space-y-1.5">
                        <button
                          onClick={() => {
                            setIsFlightTimeOpen(false);
                            setIsNightTimeOpen(false);
                            setIsPivotalAltOpen(false);
                            setIsHoldingOpen(false);
                            setIsVaOpen(false);
                            setIsIsaOpen(false);
                            setIsWindOpen(false);
                            setIsE6BOpen(true);
                            setIsCheatSheetOpen(false);
                            setIsVORCheckOpen(false);
                            setIsInstructorToolsMenuOpen(false);
                          }}
                          className="w-full h-12 flex items-center gap-3 px-3.5 rounded-xl bg-slate-50 active:bg-slate-100 hover:bg-slate-100 dark:bg-slate-950/40 dark:active:bg-slate-900 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 text-[13px] font-bold text-left transition-all"
                        >
                          <div className="bg-amber-100 dark:bg-amber-600/20 p-1.5 rounded-lg shrink-0"><Calculator size={16} className="text-amber-600 dark:text-amber-400" /></div>
                          <span>E6B Flight Computer</span>
                        </button>
                        <button
                          onClick={() => {
                            setIsFlightTimeOpen(false);
                            setIsNightTimeOpen(false);
                            setIsPivotalAltOpen(false);
                            setIsHoldingOpen(false);
                            setIsVaOpen(false);
                            setIsIsaOpen(false);
                            setIsWindOpen(false);
                            setIsE6BOpen(false);
                            setIsCheatSheetOpen(true);
                            setIsVORCheckOpen(false);
                            setIsInstructorToolsMenuOpen(false);
                          }}
                          className="w-full h-12 flex items-center gap-3 px-3.5 rounded-xl bg-slate-50 active:bg-slate-100 hover:bg-slate-100 dark:bg-slate-950/40 dark:active:bg-slate-900 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 text-[13px] font-bold text-left transition-all"
                        >
                          <div className="bg-teal-100 dark:bg-teal-600/20 p-1.5 rounded-lg shrink-0"><FileSpreadsheet size={16} className="text-teal-600 dark:text-teal-400" /></div>
                          <span>Airport Cheat Sheet</span>
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <ReleaseNotesModal />
      </div>
    </div>
  );
};

export default App;
