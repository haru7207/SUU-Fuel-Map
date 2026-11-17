
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { DensityAltitudeCalculator } from './components/DensityAltitudeCalculator';
import { WindComponentsCalculator } from './components/WindComponentsCalculator';
import { AirportCheatSheet } from './components/AirportCheatSheet';
import { AIRPORT_DATABASE } from './constants';
import { fetchFuelMapData, fetchAllWeather, fetchStationInfo, loadCachedWeatherBatch, isValidWeatherData, normalizeStationId } from './services/aviationService';
import { fetchSharedFuelPrices, saveSharedFuelPrices } from './services/firebase';
import { Menu, X, CloudFog, WifiOff, Sun, Moon, Monitor, AlertTriangle, Clock, Briefcase, Target, FileSpreadsheet, Compass, Calculator, Radio, Plane, ThermometerSun, Thermometer, Wind, Layers, Fuel, Flame, ShieldAlert, ChefHat, Sliders } from 'lucide-react';
import { E6BCalculator } from './components/E6BCalculator';
import { Airport, CardType, FuelType, WeatherData, NotamData } from './types';
import { DinnerRecommendation } from './components/DinnerRecommendation';
import { MetarTafModal } from './components/MetarTafModal';
import { LegendInfoModal } from './components/LegendInfoModal';

const getObservationTimestampMs = (obsTime?: string | number, lastUpdated?: Date | string): number | null => {
  if (obsTime !== undefined && obsTime !== null) {
    if (typeof obsTime === 'number') {
      // NOAA AWC obsTime is Unix epoch in seconds (e.g. 1763365000)
      return obsTime < 1e11 ? obsTime * 1000 : obsTime;
    }
    const parsed = new Date(obsTime).getTime();
    if (!isNaN(parsed)) return parsed;
  }
  if (lastUpdated) {
    const parsed = new Date(lastUpdated).getTime();
    if (!isNaN(parsed)) return parsed;
  }
  return null;
};

const expandWeatherMapForAirports = (
  sourceMap: Record<string, WeatherData>,
  airportList: Airport[]
): Record<string, WeatherData> => {
  const expanded: Record<string, WeatherData> = {};

  for (const [key, wx] of Object.entries(sourceMap)) {
    if (!isValidWeatherData(wx)) continue;
    const upperKey = key.trim().toUpperCase();
    const normKey = normalizeStationId(upperKey);
    expanded[upperKey] = wx;
    expanded[normKey] = wx;
    if (normKey.startsWith('K') && normKey.length === 4) {
      expanded[normKey.slice(1)] = wx;
    }
  }

  for (const airport of airportList) {
    const stationId = normalizeStationId(airport.weatherSource || airport.id);
    const rawSource = (airport.weatherSource || airport.id).trim().toUpperCase();
    const wx = expanded[stationId] || expanded[rawSource] || expanded[airport.id.toUpperCase()];
    if (wx && isValidWeatherData(wx)) {
      expanded[airport.id] = wx;
      if (airport.weatherSource) {
        expanded[airport.weatherSource] = wx;
      }
    }
  }

  return expanded;
};

const App: React.FC = () => {
  const [airports, setAirports] = useState<Airport[]>(() => {
    const todayIso = new Date().toISOString();
    try {
      const saved = localStorage.getItem('suu_cached_airports');
      if (saved) {
        const parsed = JSON.parse(saved) as Airport[];
        const merged = parsed.map(cached => {
          const staticAirport = AIRPORT_DATABASE.find(a => a.id === cached.id);
          if (staticAirport) {
            return {
              ...cached,
              ...staticAirport,
              weatherSource: staticAirport.weatherSource || cached.weatherSource,
              runways: staticAirport.runways || cached.runways,
              frequencies: staticAirport.frequencies || cached.frequencies,
              cardRules: staticAirport.cardRules,
              fbo: staticAirport.fbo || cached.fbo,
              phone: staticAirport.phone || cached.phone,
              fuelPrices: cached.fuelPrices || staticAirport.fuelPrices,
              fuelPricesLastUpdated: todayIso,
            };
          }
          return {
            ...cached,
            fuelPricesLastUpdated: todayIso,
          };
        });
        // Ensure any newly added static airports in AIRPORT_DATABASE are also present
        for (const staticAp of AIRPORT_DATABASE) {
          if (!merged.some(a => a.id === staticAp.id)) {
            merged.push({ ...staticAp, fuelPricesLastUpdated: todayIso });
          }
        }
        return merged;
      }
      return AIRPORT_DATABASE.map(a => ({
        ...a,
        fuelPricesLastUpdated: todayIso,
      }));
    } catch {
      return AIRPORT_DATABASE.map(a => ({
        ...a,
        fuelPricesLastUpdated: todayIso,
      }));
    }
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Theme State (Default to White-Tinted iOS Liquid Glass 'day' mode)
  const [themeMode, setThemeMode] = useState<'day' | 'night' | 'auto'>(() => {
    return (localStorage.getItem('suu_theme_mode_ios') as 'day' | 'night' | 'auto') || 'day';
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

  // Weather State (sanitize stale or placeholder entries on boot)
  const [weatherMap, setWeatherMap] = useState<Record<string, WeatherData>>(() => {
    try {
      const saved = localStorage.getItem('suu_cached_weather');
      if (!saved) return {};
      const parsed = JSON.parse(saved) as Record<string, WeatherData>;
      const now = Date.now();
      const validMap: Record<string, WeatherData> = {};
      for (const [key, wx] of Object.entries(parsed)) {
        if (!isValidWeatherData(wx)) continue;
        const ts = getObservationTimestampMs(wx.observationTime, wx.lastUpdated);
        // Keep cached weather up to 90 minutes old for instant display while fresh batch loads
        if (!ts || (now - ts) < 90 * 60 * 1000) {
          validMap[key] = wx;
        }
      }
      return expandWeatherMapForAirports(validMap, AIRPORT_DATABASE);
    } catch {
      return {};
    }
  });

  const handleWeatherUpdate = useCallback((stationOrAirportId: string, data: WeatherData) => {
    if (!isValidWeatherData(data)) return;
    setWeatherMap(prev => expandWeatherMapForAirports({
      ...prev,
      [stationOrAirportId]: data
    }, airports));
  }, [airports]);

  // Weather Expiration Worker (properly converts Unix seconds vs ms)
  useEffect(() => {
    const checkWeatherExpiration = () => {
      setWeatherMap(prevMap => {
        let hasChanges = false;
        const now = Date.now();
        const nextMap = { ...prevMap };
        
        for (const [airportId, weather] of Object.entries(nextMap)) {
          if (!isValidWeatherData(weather)) {
            delete nextMap[airportId];
            hasChanges = true;
            continue;
          }
          const obsMs = getObservationTimestampMs(weather.observationTime, weather.lastUpdated);
          if (obsMs) {
            const diffMinutes = (now - obsMs) / (1000 * 60);
            // Allow 90 minutes before expiring since routine METARs update hourly
            if (diffMinutes > 90) {
              delete nextMap[airportId];
              hasChanges = true;
            }
          }
        }
        
        return hasChanges ? nextMap : prevMap;
      });
    };

    const intervalId = setInterval(checkWeatherExpiration, 60 * 1000);
    checkWeatherExpiration();
    return () => clearInterval(intervalId);
  }, []);
  
  // NOTAM State
  const [notamMap, setNotamMap] = useState<Record<string, NotamData>>(() => {
    try {
      const saved = localStorage.getItem('suu_cached_notams');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Price Alerts State
  const [priceAlerts, setPriceAlerts] = useState<Record<string, { airportId: string; targetPrice: number; fuelType: string; }>>(() => {
    try {
      const saved = localStorage.getItem('suu_price_alerts');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const priceAlertsRef = useRef(priceAlerts);
  useEffect(() => {
    priceAlertsRef.current = priceAlerts;
    try {
      localStorage.setItem('suu_price_alerts', JSON.stringify(priceAlerts));
    } catch {}
  }, [priceAlerts]);

  useEffect(() => {
    const handler = () => {
      try {
        const saved = localStorage.getItem('suu_price_alerts');
        if (saved) setPriceAlerts(JSON.parse(saved));
      } catch {}
    };
    window.addEventListener('suu_price_alert_updated', handler);
    return () => window.removeEventListener('suu_price_alert_updated', handler);
  }, []);

  // Notifications State
  const [notifications, setNotifications] = useState<{id: number, message: string}[]>([]);
  const addNotification = useCallback((message: string) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 8000);
  }, []);

  const checkPriceAlerts = useCallback((livePrices: Record<string, Record<string, number>>) => {
    const alerts = priceAlertsRef.current;
    Object.entries(livePrices).forEach(([id, p]) => {
      const alert = alerts[id];
      if (alert) {
        const currentVal = p[alert.fuelType];
        if (currentVal !== undefined && currentVal <= alert.targetPrice) {
           addNotification(`Price Alert: ${id} ${alert.fuelType} dropped to $${currentVal.toFixed(2)} (Target: $${alert.targetPrice.toFixed(2)})`);
        }
      }
    });
  }, [addNotification]);


  const [isRefreshingFuel, setIsRefreshingFuel] = useState(false);

  const handleRefreshFuel = async () => {
    if (isRefreshingFuel) return;
    setIsRefreshingFuel(true);
    try {
      console.log("Forcing manual live fuel data update...");
      const nowIso = new Date().toISOString();
      const [liveData, sharedObj] = await Promise.all([
        fetchFuelMapData(),
        fetchSharedFuelPrices().catch(() => null)
      ]);
      const mergedPricesMap: Record<string, Record<string, number>> = {};

      setAirports(prev => {
        const next = prev.map(airport => {
          const sharedPrices = sharedObj?.prices?.[airport.id];
          const updatedPrices: Record<string, number> = {
            ...(airport.fuelPrices || {}),
            ...(sharedPrices || {})
          };
          if (Object.keys(updatedPrices).length > 0) {
            mergedPricesMap[airport.id] = updatedPrices;
          }
          return {
            ...airport,
            fuelPrices: updatedPrices,
            fuelPricesLastUpdated: nowIso
          };
        });
        try {
          localStorage.setItem('suu_cached_airports', JSON.stringify(next));
        } catch {}
        return next;
      });

      if (Object.keys(mergedPricesMap).length > 0) {
        await saveSharedFuelPrices(mergedPricesMap);
      }

      if (liveData && liveData.length > 0) {
        console.log("Fuel data refreshed successfully.");
      }
    } catch (e) {
      console.error("Forced live fuel price update failed:", e);
      throw e;
    } finally {
      setIsRefreshingFuel(false);
    }
  };

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
  const [fuelLogView, setFuelLogView] = useState<'form' | 'list' | 'calc'>('form');
  const [isFlightTimeOpen, setIsFlightTimeOpen] = useState(false);
  const [isPivotalAltOpen, setIsPivotalAltOpen] = useState(false);
  const [isNightTimeOpen, setIsNightTimeOpen] = useState(false);
  const [isHoldingOpen, setIsHoldingOpen] = useState(false);
  const [isVaOpen, setIsVaOpen] = useState(false);
  const [isIsaOpen, setIsIsaOpen] = useState(false);
  const [isDensityAltOpen, setIsDensityAltOpen] = useState(false);
  const [isWindOpen, setIsWindOpen] = useState(false);
  const [isCheatSheetOpen, setIsCheatSheetOpen] = useState(false);
  const [isVORCheckOpen, setIsVORCheckOpen] = useState(false);
  const [isE6BOpen, setIsE6BOpen] = useState(false);
  const [isDinnerOpen, setIsDinnerOpen] = useState(false);
  const [isMetarOnly, setIsMetarOnly] = useState(false);
  const [isMetarModalOpen, setIsMetarModalOpen] = useState(false);
  const [trackedAircraft, setTrackedAircraft] = useState<any | null>(null);
  const [cheatSheetQuery, setCheatSheetQuery] = useState('');
  const [isInstructorToolsMenuOpen, setIsInstructorToolsMenuOpen] = useState(false);
  const [isMobileSheetExpanded, setIsMobileSheetExpanded] = useState(false);

  useEffect(() => {
    setIsMobileSheetExpanded(false);
  }, [selectedId]);

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
  const [isLegendInfoModalOpen, setIsLegendInfoModalOpen] = useState(false);

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
    localStorage.setItem('suu_theme_mode_ios', themeMode);
    
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
            const startupIso = new Date().toISOString();
            try {
                currentAirports = AIRPORT_DATABASE.map(a => ({
                    ...a,
                    fuelPricesLastUpdated: startupIso
                }));
                const saved = localStorage.getItem('suu_cached_airports');
                if (saved) {
                    const parsed = JSON.parse(saved) as Airport[];
                    currentAirports = parsed.map(cached => {
                        const staticAirport = AIRPORT_DATABASE.find(a => a.id === cached.id);
                        if (staticAirport) {
                            return {
                                ...cached,
                                ...staticAirport, // Prioritize static data updates
                                fuelPrices: cached.fuelPrices || staticAirport.fuelPrices, // Keep cached prices
                                fuelPricesLastUpdated: startupIso
                            };
                        }
                        return {
                            ...cached,
                            fuelPricesLastUpdated: startupIso
                        };
                    });
                }
            } catch {
                currentAirports = AIRPORT_DATABASE.map(a => ({
                    ...a,
                    fuelPricesLastUpdated: startupIso
                }));
            }
            
            const allInitialStations = Array.from(
                new Set(currentAirports.flatMap(a => [a.weatherSource || a.id, a.id]))
            );

            // 1a. Hydrate immediately from IndexedDB (< 10ms) if available
            loadCachedWeatherBatch(allInitialStations).then(cachedBatch => {
                if (Object.keys(cachedBatch).length > 0) {
                    setWeatherMap(prev => expandWeatherMapForAirports({ ...cachedBatch, ...prev }, currentAirports));
                }
            }).catch(() => {});

            // 1b. Automatically fetch fresh live METAR & TAF data for ALL airports on website visit
            const initialWeatherPromise = fetchAllWeather(
                currentAirports.map(a => a.weatherSource || a.id),
                true // forceRefresh so visiting the website always fetches live METARs for all airports
            ).then(weatherData => {
                if (weatherData && Object.keys(weatherData).length > 0) {
                    setWeatherMap(prev => expandWeatherMapForAirports({ ...prev, ...weatherData }, currentAirports));
                }
                return weatherData;
            }).catch(e => {
                console.error("Failed to fetch initial batch weather data", e);
                return {} as Record<string, WeatherData>;
            });
            
            // 2. Fetch fuel map data from Google Script (can be slow)
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
                            const existingAirport = currentAirports[existingIndex];
                            const hasByFbo = existingAirport.cardRules?.byFbo && existingAirport.cardRules.byFbo.length > 0;
                            
                            currentAirports[existingIndex] = {
                                ...existingAirport,
                                fbo: hasByFbo ? existingAirport.fbo : (match.fbo || existingAirport.fbo),
                                phone: hasByFbo ? existingAirport.phone : (match.contact || existingAirport.phone),
                                cardRules: hasByFbo ? existingAirport.cardRules : {
                                    ...existingAirport.cardRules,
                                    primary: cardType,
                                    notes: match.note || existingAirport.cardRules.notes
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
                        if (airportId.length === 3 && /^[a-zA-Z]+$/.test(airportId)) {
                            airportId = 'K' + airportId;
                        }

                        const stationInfo = await fetchStationInfo(airportId);
                        if (stationInfo) {
                            const fuelTypes: FuelType[] = [];
                            const fuelStr = (match.fueltype || '').toLowerCase();
                            if (fuelStr.includes('100ll') || fuelStr.includes('avgas')) fuelTypes.push(FuelType.LL100);
                            if (fuelStr.includes('jet')) fuelTypes.push(FuelType.JETA);
                            if (fuelTypes.length === 0) fuelTypes.push(FuelType.LL100, FuelType.JETA);
                            
                            currentAirports.push({
                                id: match.id,
                                weatherSource: airportId,
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

            // 3. Ensure any newly discovered airports from the sheet also have live weather
            try {
                const initialFetched = await initialWeatherPromise;
                const missingAirports = currentAirports.filter(a => {
                    const stId = normalizeStationId(a.weatherSource || a.id);
                    return !isValidWeatherData(initialFetched[stId]);
                });
                if (missingAirports.length > 0) {
                    const extraWeather = await fetchAllWeather(missingAirports.map(a => a.weatherSource || a.id), true);
                    setWeatherMap(prev => expandWeatherMapForAirports({ ...prev, ...extraWeather }, currentAirports));
                } else {
                    setWeatherMap(prev => expandWeatherMapForAirports(prev, currentAirports));
                }
            } catch (e) {
                console.error("Failed to fetch additional weather data", e);
            }

            // NOTAM fetching is disabled as per 'no AI' policy.
            // A suitable public API would be needed here.

            // Sync fuel prices with Firestore and automatically update to today on every open
            try {
                const sharedObj = await fetchSharedFuelPrices();
                
                const today = new Date();
                const todayIso = today.toISOString();
                
                let needsUpdateVal = false;
                if (!sharedObj) {
                    console.log("No shared fuel prices found in Firestore. Seeding database now.");
                    needsUpdateVal = true;
                } else {
                    const lastUpdatedDate = new Date(sharedObj.lastUpdated);
                    const isSameCalendarDay = 
                        !isNaN(lastUpdatedDate.getTime()) &&
                        lastUpdatedDate.getDate() === today.getDate() && 
                        lastUpdatedDate.getMonth() === today.getMonth() && 
                        lastUpdatedDate.getFullYear() === today.getFullYear();
                    
                    if (!isSameCalendarDay) {
                        needsUpdateVal = true;
                    }
                }

                const mergedPricesToSave: Record<string, Record<string, number>> = {};

                setAirports(prev => {
                    const next = prev.map(airport => {
                        const pricesForAirport = sharedObj?.prices?.[airport.id];
                        const updatedPrices: Record<string, number> = { ...(airport.fuelPrices || {}) };
                        
                        if (pricesForAirport) {
                            if (pricesForAirport['100LL'] !== undefined && typeof pricesForAirport['100LL'] === 'number') {
                                updatedPrices[FuelType.LL100] = pricesForAirport['100LL'];
                            }
                            if (pricesForAirport['Jet A'] !== undefined && typeof pricesForAirport['Jet A'] === 'number') {
                                updatedPrices[FuelType.JETA] = pricesForAirport['Jet A'];
                            }
                        }

                        if (Object.keys(updatedPrices).length > 0) {
                            mergedPricesToSave[airport.id] = updatedPrices;
                        }

                        return {
                            ...airport,
                            fuelPrices: updatedPrices,
                            fuelPricesLastUpdated: todayIso
                        };
                    });
                    
                    try {
                        localStorage.setItem('suu_cached_airports', JSON.stringify(next));
                    } catch (e) {
                        console.error("Failed to cache airports in local storage", e);
                    }
                    return next;
                });

                if (needsUpdateVal && Object.keys(mergedPricesToSave).length > 0) {
                    await saveSharedFuelPrices(mergedPricesToSave);
                }
            } catch (e) {
                console.error("Firestore fuel prices sync failed.", e);
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
  useEffect(() => {
    if (airports.length === 0) return;

    const checkAndRefreshPrices = async () => {
      try {
        console.log("[Auto-Refresh] Checking Firestore for shared fuel prices...");
        const sharedObj = await fetchSharedFuelPrices();
        
        let needsUpdate = false;
        const today = new Date();
        const todayIso = today.toISOString();

        if (!sharedObj) {
            needsUpdate = true;
        } else {
            const lastUpdatedDate = new Date(sharedObj.lastUpdated);
            const isSameCalendarDay = 
                !isNaN(lastUpdatedDate.getTime()) &&
                lastUpdatedDate.getDate() === today.getDate() && 
                lastUpdatedDate.getMonth() === today.getMonth() && 
                lastUpdatedDate.getFullYear() === today.getFullYear();
            
            if (!isSameCalendarDay) {
                needsUpdate = true;
            }
        }

        const mergedPricesToSave: Record<string, Record<string, number>> = {};

        setAirports(prev => {
            const next = prev.map(airport => {
                const pricesForAirport = sharedObj?.prices?.[airport.id];
                const updatedPrices: Record<string, number> = { ...(airport.fuelPrices || {}) };
                
                if (pricesForAirport) {
                    if (pricesForAirport['100LL'] !== undefined && typeof pricesForAirport['100LL'] === 'number') {
                        updatedPrices[FuelType.LL100] = pricesForAirport['100LL'];
                    }
                    if (pricesForAirport['Jet A'] !== undefined && typeof pricesForAirport['Jet A'] === 'number') {
                        updatedPrices[FuelType.JETA] = pricesForAirport['Jet A'];
                    }
                }

                if (Object.keys(updatedPrices).length > 0) {
                    mergedPricesToSave[airport.id] = updatedPrices;
                }

                return {
                    ...airport,
                    fuelPrices: updatedPrices,
                    fuelPricesLastUpdated: todayIso
                };
            });
            
            try {
                localStorage.setItem('suu_cached_airports', JSON.stringify(next));
            } catch (e) {
                console.error("Failed to cache airports in local storage", e);
            }
            return next;
        });

        if (needsUpdate && Object.keys(mergedPricesToSave).length > 0) {
            await saveSharedFuelPrices(mergedPricesToSave);
        }
      } catch (err) {
        console.error("[Auto-Refresh] Error checking live fuel prices:", err);
      }
    };

    const intervalId = setInterval(checkAndRefreshPrices, 15 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [airports.length]);

  // Background Weather Poller for ALL tracked airports (keeps METARs fresh automatically every 5 minutes)
  useEffect(() => {
    if (airports.length === 0) return;

    const refreshAllWeather = async () => {
      if (!navigator.onLine) return;
      try {
        console.log("[Auto-Refresh] Fetching live weather update for all tracked airports...");
        const weatherData = await fetchAllWeather(airports.map(a => a.weatherSource || a.id), true);
        
        if (weatherData && Object.keys(weatherData).length > 0) {
            setWeatherMap(prev => expandWeatherMapForAirports({
              ...prev,
              ...weatherData
            }, airports));
            console.log("[Auto-Refresh] All airports weather updated successfully.");
        }
      } catch (error) {
        console.error("[Auto-Refresh] Failed to update all airports weather:", error);
      }
    };

    const intervalId = setInterval(refreshAllWeather, 5 * 60 * 1000);

    const handleVisibilityOrOnline = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        refreshAllWeather();
      }
    };
    window.addEventListener('online', handleVisibilityOrOnline);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('online', handleVisibilityOrOnline);
    };
  }, [airports]);

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
    isDinnerOpen ||
    (isMobile && isInstructorToolsMenuOpen);

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-slate-100 dark:bg-slate-950 relative">
      
      {/* Offline Banner */}
      {!isOnline && (
        <div className="absolute top-[max(0.75rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-rose-600/90 backdrop-blur-xl border border-rose-400/50 text-white z-[2000] text-center text-xs font-bold shadow-lg flex items-center justify-center gap-2">
            <WifiOff size={14} />
            <span>Offline Mode — Showing Cached Data</span>
        </div>
      )}

      {/* Critical Weather Banner */}
      {selectedAirport && weatherMap[selectedAirport.weatherSource || selectedAirport.id] && 
       ['IFR', 'LIFR'].includes(weatherMap[selectedAirport.weatherSource || selectedAirport.id].flightCategory) && (
        <div className={`absolute ${!isOnline ? 'top-12' : 'top-[max(0.75rem,env(safe-area-inset-top))]'} left-1/2 -translate-x-1/2 z-[1900] bg-rose-600/85 backdrop-blur-2xl border border-rose-300/50 text-white px-5 py-2 rounded-full shadow-xl flex items-center justify-center gap-2 animate-fade-in`}>
            <AlertTriangle size={16} />
            <span className="text-xs font-bold tracking-wide">
                Critical Weather · {weatherMap[selectedAirport.weatherSource || selectedAirport.id].flightCategory} Conditions at {selectedAirport.id}
            </span>
        </div>
      )}
      
      {/* Mobile Toggle Button */}
      {isMobile && !isSidebarOpen && !selectedId && (
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className={`absolute top-[max(1rem,calc(env(safe-area-inset-top)+0.5rem))] left-4 z-[1000] p-3 ios-liquid-pill rounded-full text-slate-800 dark:text-slate-100 min-w-[48px] min-h-[48px] flex items-center justify-center transition-transform active:scale-95 ${!isOnline ? 'mt-6' : ''}`}
        >
          <Menu size={22} className="md:w-6 md:h-6" />
        </button>
      )}

      {/* Sidebar (Floating iOS Liquid Glass Panel on Desktop) */}
      <div className={`fixed inset-y-0 left-0 h-[100dvh] z-[1100] transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:p-3 md:pr-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } ${!isOnline ? 'pt-6 md:pt-3' : ''}`}>
         <div className="h-full w-[86vw] max-w-[360px] sm:w-80 md:w-80 lg:w-96 relative">
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
            isRefreshingFuel={isRefreshingFuel}
            onRefreshFuelPrices={handleRefreshFuel}
            weatherMap={weatherMap}
            isMetarOnly={isMetarOnly}
            setIsMetarOnly={setIsMetarOnly}
            onOpenMetarModal={() => setIsMetarModalOpen(true)}
            isFuelLogOpen={isFuelLogOpen}
            onOpenFuelLog={(targetView) => {
              setFuelLogView(targetView);
              setIsFuelLogOpen(true);
              if (isMobile) setIsSidebarOpen(false);
            }}
          />
         </div>
      </div>
      
      {/* Mobile Overlay */}
      {isMobile && isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/25 backdrop-blur-xs z-[1050]" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Main Content Area */}
      <div className={`flex-1 relative flex flex-col h-full ${!isOnline ? 'pt-6' : ''}`}>
        {/* Full-Bleed Map */}
        <div className="fixed inset-0 z-0">
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
            isOnline={isOnline}
          />
        </div>

        {/* Quick Fuel Log Toggle & METAR Toggle */}
        <FuelLogToggle 
          currentAirportId={selectedId} 
          isOnline={isOnline} 
          isOpen={isFuelLogOpen}
          setIsOpen={setIsFuelLogOpen}
          view={fuelLogView}
          setView={setFuelLogView}
          isHidden={isAnyCfiToolOpen || (isMobile && (!!selectedId || isSidebarOpen || isLayersMenuOpen))}
          onOpenFlightTime={() => setIsFlightTimeOpen(true)}
          isFlightTimeOpen={isFlightTimeOpen}
          airports={airports}
          isMetarOnly={isMetarOnly}
          onToggleMetarOnly={() => setIsMetarOnly(!isMetarOnly)}
          onOpenMetarModal={() => setIsMetarModalOpen(true)}
        />

        {/* METAR & TAF Weather Station Modal */}
        <MetarTafModal
          isOpen={isMetarModalOpen}
          onClose={() => setIsMetarModalOpen(false)}
          airports={airports}
          weatherMap={weatherMap}
          selectedAirportId={selectedId}
          onSelectAirport={(id) => handleSelect(id)}
          onWeatherUpdate={handleWeatherUpdate}
        />

        {/* Legend & Info Modal */}
        <LegendInfoModal 
          isOpen={isLegendInfoModalOpen} 
          onClose={() => setIsLegendInfoModalOpen(false)} 
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

        {isDinnerOpen && <DinnerRecommendation onClose={() => setIsDinnerOpen(false)} />}

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
        <DensityAltitudeCalculator
          isOpen={isDensityAltOpen}
          onClose={() => setIsDensityAltOpen(false)}
          airports={airports}
          weatherMap={weatherMap}
          selectedAirport={selectedAirport}
        />
        <WindComponentsCalculator
          isOpen={isWindOpen}
          onClose={() => setIsWindOpen(false)}
        />

        <E6BCalculator
          isOpen={isE6BOpen}
          onClose={() => setIsE6BOpen(false)}
        />

        {/* Toolbar */}
        <div className={`absolute top-[max(1rem,calc(env(safe-area-inset-top)+0.5rem))] right-4 z-[1000] flex-col items-end gap-2.5 ${isMobile && (!!selectedId || isSidebarOpen) ? 'hidden' : 'flex'}`}>
          
          {/* Map Layers Dropdown */}
          <div className="relative w-full">
            <button
              onClick={() => {
                setIsLayersMenuOpen(!isLayersMenuOpen);
                if (!isLayersMenuOpen) {
                  setIsInstructorToolsMenuOpen(false);
                }
              }}
              className={`flex items-center justify-center gap-2 font-semibold min-h-[44px] md:min-h-[38px] py-2 px-4 text-xs md:text-sm rounded-full transition-all active:scale-95 w-full whitespace-nowrap ${
                isLayersMenuOpen
                  ? 'bg-slate-900/75 text-white dark:bg-white/80 dark:text-slate-900 backdrop-blur-xl shadow-lg border border-white/50'
                  : 'ios-liquid-pill text-slate-800 dark:text-slate-100 hover:bg-white/60'
              }`}
              title="Toggle map layers and overlay information"
            >
              <Layers size={15} className={`md:w-4 md:h-4 ${isLayersMenuOpen ? 'text-sky-400 dark:text-sky-600' : 'text-sky-600 dark:text-sky-400'}`} />
              <span>Map Layers</span>
            </button>

            {isLayersMenuOpen && (
              <div className="absolute top-full right-0 mt-2.5 w-68 ios-liquid-glass-heavy rounded-3xl overflow-hidden flex flex-col z-[1050] origin-top-right animate-pop-in">
                {/* Header */}
                <div className="px-4 py-3 bg-white/15 dark:bg-slate-800/25 border-b border-white/50 dark:border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers size={14} className="text-sky-600 dark:text-sky-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 tracking-tight">Map Overlays</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => { setIsLegendInfoModalOpen(true); setIsLayersMenuOpen(false); }}
                      className="flex items-center justify-center w-6 h-6 rounded-full bg-white/40 dark:bg-slate-700/50 text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white border border-white/75 dark:border-white/15 shadow-2xs transition-colors"
                      title="Map Legend & Info"
                    >
                      <span className="text-[11px] font-bold font-serif italic">i</span>
                    </button>
                    <button 
                      onClick={() => setIsLayersMenuOpen(false)}
                      className="p-1 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/40 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
                {/* Options List */}
                <div className="p-3.5 space-y-3">
                  {/* Layer option: Fuel Prices */}
                  <label className="flex items-center justify-between cursor-pointer group select-none">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        <Fuel size={14} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Fuel Prices</span>
                        <span className="text-[10px] text-slate-600 dark:text-slate-300">100LL active station rates</span>
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      className="rounded-md border-slate-300 text-sky-600 focus:ring-sky-500 h-4 w-4 cursor-pointer" 
                      checked={mapLayers.fuelPrices}
                      onChange={() => toggleMapLayer('fuelPrices')}
                    />
                  </label>

                  {/* Layer option: Wind Overlay */}
                  <label className="flex items-center justify-between cursor-pointer group select-none">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
                        <Wind size={14} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Wind Overlay</span>
                        <span className="text-[10px] text-slate-600 dark:text-slate-300">Speed, gust & direction (METAR)</span>
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      className="rounded-md border-slate-300 text-sky-600 focus:ring-sky-500 h-4 w-4 cursor-pointer" 
                      checked={mapLayers.weatherOverlay}
                      onChange={() => toggleMapLayer('weatherOverlay')}
                    />
                  </label>

                  {/* Layer option: NOTAM Warnings */}
                  <label className="flex items-center justify-between cursor-pointer group select-none">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
                        <AlertTriangle size={14} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">NOTAM Warnings</span>
                        <span className="text-[10px] text-slate-600 dark:text-slate-300">Runway & fuel hazards</span>
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      className="rounded-md border-slate-300 text-sky-600 focus:ring-sky-500 h-4 w-4 cursor-pointer" 
                      checked={mapLayers.notamWarnings}
                      onChange={() => toggleMapLayer('notamWarnings')}
                    />
                  </label>

                  {/* Layer option: Wildfire Hazards */}
                  <div className="pt-2.5 border-t border-white/45 dark:border-slate-700/50">
                    <label className="flex items-center justify-between cursor-pointer group select-none">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400">
                          <Flame size={14} />
                        </div>
                        <div className="flex flex-col">
                           <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Wildfire Hazards</span>
                           <span className="text-[10px] text-slate-600 dark:text-slate-300">NIFC active perimeters</span>
                        </div>
                      </div>
                      <input 
                        type="checkbox" 
                        className="rounded-md border-slate-300 text-sky-600 focus:ring-sky-500 h-4 w-4 cursor-pointer" 
                        checked={mapLayers.wildfires}
                        onChange={() => toggleMapLayer('wildfires')}
                      />
                    </label>
                  </div>

                  {/* Layer option: TFR Hazards */}
                  <div className="pt-2.5 border-t border-white/45 dark:border-slate-700/50">
                    <label className="flex items-center justify-between cursor-pointer group select-none">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
                          <ShieldAlert size={14} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">TFRs (Airspace)</span>
                          <span className="text-[10px] text-slate-600 dark:text-slate-300">FAA temporary restrictions</span>
                        </div>
                      </div>
                      <input 
                        type="checkbox" 
                        className="rounded-md border-slate-300 text-sky-600 focus:ring-sky-500 h-4 w-4 cursor-pointer" 
                        checked={mapLayers.tfrs}
                        onChange={() => toggleMapLayer('tfrs')}
                      />
                    </label>
                  </div>

                  {/* Layer option: AIRMET/SIGMET */}
                  <div className="pt-2.5 border-t border-white/45 dark:border-slate-700/50">
                    <label className="flex items-center justify-between cursor-pointer group select-none">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
                          <CloudFog size={14} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">AIRMETs & SIGMETs</span>
                          <span className="text-[10px] text-slate-600 dark:text-slate-300">Hazards, icing & convective</span>
                        </div>
                      </div>
                      <input 
                        type="checkbox" 
                        className="rounded-md border-slate-300 text-sky-600 focus:ring-sky-500 h-4 w-4 cursor-pointer" 
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
                  onClick={() => {
                    setIsInstructorToolsMenuOpen(!isInstructorToolsMenuOpen);
                    if (!isInstructorToolsMenuOpen) {
                      setIsLayersMenuOpen(false);
                    }
                  }}
                  className={`flex items-center justify-center gap-2 font-semibold min-h-[44px] md:min-h-[38px] py-2 px-4 text-xs md:text-sm rounded-full transition-all active:scale-95 w-full whitespace-nowrap ${
                    isInstructorToolsMenuOpen || isFlightTimeOpen || isPivotalAltOpen || isNightTimeOpen || isHoldingOpen || isCheatSheetOpen || isE6BOpen || isVORCheckOpen || isVaOpen || isIsaOpen || isWindOpen || isDinnerOpen
                      ? 'bg-sky-600/75 backdrop-blur-xl text-white shadow-lg shadow-sky-600/25 border border-white/60'
                      : 'ios-liquid-pill text-slate-800 dark:text-slate-100 hover:bg-white/60'
                  }`}
                >
                  <Briefcase size={15} className={`md:w-4 md:h-4 ${isInstructorToolsMenuOpen || isFlightTimeOpen || isPivotalAltOpen || isNightTimeOpen || isHoldingOpen || isCheatSheetOpen || isE6BOpen || isVORCheckOpen || isVaOpen || isIsaOpen || isWindOpen || isDinnerOpen ? 'text-white' : 'text-sky-600 dark:text-sky-400'}`} />
                  <span>CFI Tools</span>
                </button>

                {!isMobile && isInstructorToolsMenuOpen && (
                  <div className="absolute top-full right-0 mt-2.5 w-[calc(100vw-2rem)] sm:w-[480px] ios-liquid-glass-heavy rounded-3xl overflow-hidden flex flex-col z-[1050] origin-top-right animate-pop-in">
                    
                    {/* Header */}
                    <div className="px-5 py-4 bg-white/8 dark:bg-slate-800/18 border-b border-white/55 dark:border-white/15 flex items-center gap-3">
                      <div className="bg-sky-500/15 p-2.5 rounded-2xl text-sky-600 dark:text-sky-400 border border-sky-400/25">
                        <Briefcase size={20} />
                      </div>
                      <div>
                        <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">CFI Digital Toolkit</div>
                        <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">Quick reference flight calculators for instructors</div>
                      </div>
                    </div>

                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                      
                      {/* Column 1 */}
                      <div className="space-y-4">
                        {/* Time & Logs */}
                        <div>
                          <div className="px-2 py-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest border-b border-white/45 dark:border-slate-700/60 mb-2">Time & Logs</div>
                          <button
                            onClick={() => {
                              setIsFlightTimeOpen(true);
                              setIsNightTimeOpen(false);
                              setIsPivotalAltOpen(false);
                              setIsHoldingOpen(false);
                              setIsVaOpen(false);
                              setIsIsaOpen(false);
                              setIsDensityAltOpen(false);
                              setIsWindOpen(false);
                              setIsE6BOpen(false);
                              setIsCheatSheetOpen(false);
                              setIsVORCheckOpen(false);
                              setIsInstructorToolsMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/30 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-100 text-sm font-semibold text-left transition-all group"
                          >
                            <div className="bg-blue-500/15 border border-blue-400/30 p-2 rounded-xl group-hover:scale-110 transition-transform"><Clock size={16} className="text-blue-600 dark:text-blue-400" /></div>
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
                              setIsDensityAltOpen(false);
                              setIsWindOpen(false);
                              setIsE6BOpen(false);
                              setIsCheatSheetOpen(false);
                              setIsVORCheckOpen(false);
                              setIsInstructorToolsMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/30 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-100 text-sm font-semibold text-left transition-all group"
                          >
                            <div className="bg-purple-500/15 border border-purple-400/30 p-2 rounded-xl group-hover:scale-110 transition-transform"><Moon size={16} className="text-purple-600 dark:text-purple-400" /></div>
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
                              setIsDensityAltOpen(false);
                              setIsWindOpen(false);
                              setIsE6BOpen(false);
                              setIsCheatSheetOpen(false);
                              setIsVORCheckOpen(true);
                              setIsInstructorToolsMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/30 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-100 text-sm font-semibold text-left transition-all group"
                          >
                            <div className="bg-cyan-500/15 border border-cyan-400/30 p-2 rounded-xl group-hover:scale-110 transition-transform"><Radio size={16} className="text-cyan-600 dark:text-cyan-400" /></div>
                            VOR Receiver Check
                          </button>
                        </div>
                        
                        {/* Performance & Weather */}
                        <div>
                          <div className="px-2 py-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest border-b border-white/45 dark:border-slate-700/60 mb-2">Performance & WX</div>
                          <button
                            onClick={() => {
                              setIsFlightTimeOpen(false);
                              setIsNightTimeOpen(false);
                              setIsPivotalAltOpen(false);
                              setIsHoldingOpen(false);
                              setIsVaOpen(true);
                              setIsIsaOpen(false);
                              setIsDensityAltOpen(false);
                              setIsWindOpen(false);
                              setIsE6BOpen(false);
                              setIsCheatSheetOpen(false);
                              setIsVORCheckOpen(false);
                              setIsInstructorToolsMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/30 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-100 text-sm font-semibold text-left transition-all group"
                          >
                            <div className="bg-emerald-500/15 border border-emerald-400/30 p-2 rounded-xl group-hover:scale-110 transition-transform"><Plane size={16} className="text-emerald-600 dark:text-emerald-400" /></div>
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
                              setIsDensityAltOpen(false);
                              setIsE6BOpen(false);
                              setIsCheatSheetOpen(false);
                              setIsVORCheckOpen(false);
                              setIsInstructorToolsMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/30 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-100 text-sm font-semibold text-left transition-all group"
                          >
                            <div className="bg-orange-500/15 border border-orange-400/30 p-2 rounded-xl group-hover:scale-110 transition-transform"><ThermometerSun size={16} className="text-orange-600 dark:text-orange-400" /></div>
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
                              setIsDensityAltOpen(true);
                              setIsWindOpen(false);
                              setIsE6BOpen(false);
                              setIsCheatSheetOpen(false);
                              setIsVORCheckOpen(false);
                              setIsInstructorToolsMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/30 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-100 text-sm font-semibold text-left transition-all group"
                          >
                            <div className="bg-red-500/15 border border-red-400/30 p-2 rounded-xl group-hover:scale-110 transition-transform"><Thermometer size={16} className="text-red-600 dark:text-red-400" /></div>
                            Density Altitude
                          </button>
                          <button
                            onClick={() => {
                              setIsFlightTimeOpen(false);
                              setIsNightTimeOpen(false);
                              setIsPivotalAltOpen(false);
                              setIsHoldingOpen(false);
                              setIsVaOpen(false);
                              setIsIsaOpen(false);
                              setIsDensityAltOpen(false);
                              setIsWindOpen(true);
                              setIsE6BOpen(false);
                              setIsCheatSheetOpen(false);
                              setIsVORCheckOpen(false);
                              setIsInstructorToolsMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/30 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-100 text-sm font-semibold text-left transition-all group"
                          >
                            <div className="bg-sky-500/15 border border-sky-400/30 p-2 rounded-xl group-hover:scale-110 transition-transform"><Wind size={16} className="text-sky-600 dark:text-sky-400" /></div>
                            Wind Components
                          </button>
                        </div>
                      </div>

                      {/* Column 2 */}
                      <div className="space-y-4">
                        {/* Navigation */}
                        <div>
                          <div className="px-2 py-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest border-b border-white/45 dark:border-slate-700/60 mb-2">Navigation</div>
                          <button
                            onClick={() => {
                              setIsFlightTimeOpen(false);
                              setIsNightTimeOpen(false);
                              setIsPivotalAltOpen(false);
                              setIsHoldingOpen(true);
                              setIsVaOpen(false);
                              setIsIsaOpen(false);
                              setIsDensityAltOpen(false);
                              setIsWindOpen(false);
                              setIsE6BOpen(false);
                              setIsCheatSheetOpen(false);
                              setIsVORCheckOpen(false);
                              setIsInstructorToolsMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/30 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-100 text-sm font-semibold text-left transition-all group"
                          >
                            <div className="bg-rose-500/15 border border-rose-400/30 p-2 rounded-xl group-hover:scale-110 transition-transform"><Compass size={16} className="text-rose-600 dark:text-rose-400" /></div>
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
                              setIsDensityAltOpen(false);
                              setIsWindOpen(false);
                              setIsE6BOpen(false);
                              setIsCheatSheetOpen(false);
                              setIsVORCheckOpen(false);
                              setIsInstructorToolsMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/30 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-100 text-sm font-semibold text-left transition-all group"
                          >
                            <div className="bg-indigo-500/15 border border-indigo-400/30 p-2 rounded-xl group-hover:scale-110 transition-transform"><Target size={16} className="text-indigo-600 dark:text-indigo-400" /></div>
                            Pivotal Altitude
                          </button>
                        </div>

                        {/* Preflight & Ref */}
                        <div>
                          <div className="px-2 py-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest border-b border-white/45 dark:border-slate-700/60 mb-2">Preflight & Ref</div>
                          <button
                            onClick={() => {
                              setIsFlightTimeOpen(false);
                              setIsNightTimeOpen(false);
                              setIsPivotalAltOpen(false);
                              setIsHoldingOpen(false);
                              setIsVaOpen(false);
                              setIsIsaOpen(false);
                              setIsDensityAltOpen(false);
                              setIsWindOpen(false);
                              setIsE6BOpen(true);
                              setIsCheatSheetOpen(false);
                              setIsVORCheckOpen(false);
                              setIsInstructorToolsMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/30 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-100 text-sm font-semibold text-left transition-all group"
                          >
                            <div className="bg-amber-500/15 border border-amber-400/30 p-2 rounded-xl group-hover:scale-110 transition-transform"><Calculator size={16} className="text-amber-600 dark:text-amber-400" /></div>
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
                              setIsDensityAltOpen(false);
                              setIsWindOpen(false);
                              setIsE6BOpen(false);
                              setIsCheatSheetOpen(true);
                              setIsVORCheckOpen(false);
                              setIsInstructorToolsMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/30 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-100 text-sm font-semibold text-left transition-all group"
                          >
                            <div className="bg-teal-500/15 border border-teal-400/30 p-2 rounded-xl group-hover:scale-110 transition-transform"><FileSpreadsheet size={16} className="text-teal-600 dark:text-teal-400" /></div>
                            Airport Cheat Sheet
                          </button>
                        </div>
                        {/* Others */}
                        <div>
                          <div className="px-2 py-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest border-b border-white/45 dark:border-slate-700/60 mb-2">Others</div>
                          <button
                            onClick={() => {
                              setIsFlightTimeOpen(false);
                              setIsNightTimeOpen(false);
                              setIsPivotalAltOpen(false);
                              setIsHoldingOpen(false);
                              setIsVaOpen(false);
                              setIsIsaOpen(false);
                              setIsDensityAltOpen(false);
                              setIsWindOpen(false);
                              setIsE6BOpen(false);
                              setIsCheatSheetOpen(false);
                              setIsVORCheckOpen(false);
                              setIsDinnerOpen(true);
                              setIsInstructorToolsMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/30 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-100 text-sm font-semibold text-left transition-all group"
                          >
                            <div className="bg-orange-500/15 border border-orange-400/30 p-2 rounded-xl group-hover:scale-110 transition-transform"><ChefHat size={16} className="text-orange-600 dark:text-orange-400" /></div>
                            Today's Dinner
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
                  className={`absolute z-[1000] ios-liquid-glass overflow-hidden transition-[height] duration-300 ease-out
                      md:top-3 md:right-3 md:bottom-3 md:w-[430px] md:rounded-[28px]
                      inset-x-0 bottom-0 ${isMobileSheetExpanded ? 'h-[94dvh]' : 'h-[80dvh]'} md:h-auto rounded-t-[28px] md:inset-auto`}
              >
                  <AirportDetails 
                      airport={selectedAirport} 
                      onClose={() => setSelectedId(null)} 
                      isFavorite={favorites.includes(selectedAirport.id)}
                      onToggleFavorite={handleToggleFavorite}
                      onOpenFuelLog={() => {
                        setFuelLogView('form');
                        setIsFuelLogOpen(true);
                      }}
                      weatherMap={weatherMap}
                      onWeatherUpdate={handleWeatherUpdate}
                      notamMap={notamMap}
                      isMobileExpanded={isMobileSheetExpanded}
                      onToggleMobileExpand={() => setIsMobileSheetExpanded(prev => !prev)}
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
                className="fixed inset-0 bg-slate-900/20 backdrop-blur-xs z-[1200]"
              />

              {/* Drawer Container */}
              <motion.div
                key="cfi-modal-drawer"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                className="fixed bottom-0 inset-x-0 ios-liquid-glass-heavy rounded-t-[28px] z-[1210] overflow-hidden flex flex-col max-h-[88dvh] select-none"
              >
                {/* Drag Handle Indicator */}
                <div className="w-12 h-1.5 bg-slate-500/50 dark:bg-slate-400/60 rounded-full mx-auto my-3 shrink-0" />

                {/* Header */}
                <div className="px-5 pb-4 border-b border-white/60 dark:border-white/15 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="bg-sky-500/15 border border-sky-400/25 p-2.5 rounded-2xl text-sky-600 dark:text-sky-400">
                      <Briefcase size={20} />
                    </div>
                    <div>
                      <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">CFI Digital Toolkit</h2>
                      <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">Quick reference tools for instructors</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsInstructorToolsMenuOpen(false)}
                    aria-label="Close Toolkit"
                    className="p-2 -mr-1.5 ios-liquid-pill text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y custom-scrollbar p-5 pb-24 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    
                    {/* Time & Logs */}
                    <div className="space-y-2">
                      <div className="px-1 text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest border-b border-white/45 dark:border-slate-700/60 pb-1.5 mb-2">Time & Logs</div>
                      <div className="space-y-1.5">
                        <button
                          onClick={() => {
                            setIsFlightTimeOpen(true);
                            setIsNightTimeOpen(false);
                            setIsPivotalAltOpen(false);
                            setIsHoldingOpen(false);
                            setIsVaOpen(false);
                            setIsIsaOpen(false);
                            setIsDensityAltOpen(false);
                            setIsWindOpen(false);
                            setIsE6BOpen(false);
                            setIsCheatSheetOpen(false);
                            setIsVORCheckOpen(false);
                            setIsInstructorToolsMenuOpen(false);
                          }}
                          className="w-full h-12 flex items-center gap-3 px-3.5 rounded-2xl ios-liquid-card hover:bg-white/30 dark:hover:bg-slate-800/45 text-slate-900 dark:text-slate-100 text-[13px] font-bold text-left transition-all active:scale-[0.98]"
                        >
                          <div className="bg-blue-500/15 border border-blue-400/30 p-1.5 rounded-xl shrink-0"><Clock size={16} className="text-blue-600 dark:text-blue-400" /></div>
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
                            setIsDensityAltOpen(false);
                            setIsWindOpen(false);
                            setIsE6BOpen(false);
                            setIsCheatSheetOpen(false);
                            setIsVORCheckOpen(false);
                            setIsInstructorToolsMenuOpen(false);
                          }}
                          className="w-full h-12 flex items-center gap-3 px-3.5 rounded-2xl ios-liquid-card hover:bg-white/30 dark:hover:bg-slate-800/45 text-slate-900 dark:text-slate-100 text-[13px] font-bold text-left transition-all active:scale-[0.98]"
                        >
                          <div className="bg-purple-500/15 border border-purple-400/30 p-1.5 rounded-xl shrink-0"><Moon size={16} className="text-purple-600 dark:text-purple-400" /></div>
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
                            setIsDensityAltOpen(false);
                            setIsWindOpen(false);
                            setIsE6BOpen(false);
                            setIsCheatSheetOpen(false);
                            setIsVORCheckOpen(true);
                            setIsInstructorToolsMenuOpen(false);
                          }}
                          className="w-full h-12 flex items-center gap-3 px-3.5 rounded-2xl ios-liquid-card hover:bg-white/30 dark:hover:bg-slate-800/45 text-slate-900 dark:text-slate-100 text-[13px] font-bold text-left transition-all active:scale-[0.98]"
                        >
                          <div className="bg-cyan-500/15 border border-cyan-400/30 p-1.5 rounded-xl shrink-0"><Radio size={16} className="text-cyan-600 dark:text-cyan-400" /></div>
                          <span>VOR Receiver Check</span>
                        </button>
                      </div>
                    </div>

                    {/* Performance & Weather */}
                    <div className="space-y-2">
                      <div className="px-1 text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest border-b border-white/45 dark:border-slate-700/60 pb-1.5 mb-2">Performance & WX</div>
                      <div className="space-y-1.5">
                        <button
                          onClick={() => {
                            setIsFlightTimeOpen(false);
                            setIsNightTimeOpen(false);
                            setIsPivotalAltOpen(false);
                            setIsHoldingOpen(false);
                            setIsVaOpen(true);
                            setIsIsaOpen(false);
                            setIsDensityAltOpen(false);
                            setIsWindOpen(false);
                            setIsE6BOpen(false);
                            setIsCheatSheetOpen(false);
                            setIsVORCheckOpen(false);
                            setIsInstructorToolsMenuOpen(false);
                          }}
                          className="w-full h-12 flex items-center gap-3 px-3.5 rounded-2xl ios-liquid-card hover:bg-white/30 dark:hover:bg-slate-800/45 text-slate-900 dark:text-slate-100 text-[13px] font-bold text-left transition-all active:scale-[0.98]"
                        >
                          <div className="bg-emerald-500/15 border border-emerald-400/30 p-1.5 rounded-xl shrink-0"><Plane size={16} className="text-emerald-600 dark:text-emerald-400" /></div>
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
                            setIsDensityAltOpen(false);
                            setIsE6BOpen(false);
                            setIsCheatSheetOpen(false);
                            setIsVORCheckOpen(false);
                            setIsInstructorToolsMenuOpen(false);
                          }}
                          className="w-full h-12 flex items-center gap-3 px-3.5 rounded-2xl ios-liquid-card hover:bg-white/30 dark:hover:bg-slate-800/45 text-slate-900 dark:text-slate-100 text-[13px] font-bold text-left transition-all active:scale-[0.98]"
                        >
                          <div className="bg-orange-500/15 border border-orange-400/30 p-1.5 rounded-xl shrink-0"><ThermometerSun size={16} className="text-orange-600 dark:text-orange-400" /></div>
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
                            setIsDensityAltOpen(true);
                            setIsWindOpen(false);
                            setIsE6BOpen(false);
                            setIsCheatSheetOpen(false);
                            setIsVORCheckOpen(false);
                            setIsInstructorToolsMenuOpen(false);
                          }}
                          className="w-full h-12 flex items-center gap-3 px-3.5 rounded-2xl ios-liquid-card hover:bg-white/30 dark:hover:bg-slate-800/45 text-slate-900 dark:text-slate-100 text-[13px] font-bold text-left transition-all active:scale-[0.98]"
                        >
                          <div className="bg-red-500/15 border border-red-400/30 p-1.5 rounded-xl shrink-0"><Thermometer size={16} className="text-red-600 dark:text-red-400" /></div>
                          <span>Density Altitude</span>
                        </button>
                        <button
                          onClick={() => {
                            setIsFlightTimeOpen(false);
                            setIsNightTimeOpen(false);
                            setIsPivotalAltOpen(false);
                            setIsHoldingOpen(false);
                            setIsVaOpen(false);
                            setIsIsaOpen(false);
                            setIsDensityAltOpen(false);
                            setIsWindOpen(true);
                            setIsE6BOpen(false);
                            setIsCheatSheetOpen(false);
                            setIsVORCheckOpen(false);
                            setIsInstructorToolsMenuOpen(false);
                          }}
                          className="w-full h-12 flex items-center gap-3 px-3.5 rounded-2xl ios-liquid-card hover:bg-white/30 dark:hover:bg-slate-800/45 text-slate-900 dark:text-slate-100 text-[13px] font-bold text-left transition-all active:scale-[0.98]"
                        >
                          <div className="bg-sky-500/15 border border-sky-400/30 p-1.5 rounded-xl shrink-0"><Wind size={16} className="text-sky-600 dark:text-sky-400" /></div>
                          <span>Wind Components</span>
                        </button>
                      </div>
                    </div>

                    {/* Navigation */}
                    <div className="space-y-2">
                      <div className="px-1 text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest border-b border-white/45 dark:border-slate-700/60 pb-1.5 mb-2">Navigation</div>
                      <div className="space-y-1.5">
                        <button
                          onClick={() => {
                            setIsFlightTimeOpen(false);
                            setIsNightTimeOpen(false);
                            setIsPivotalAltOpen(false);
                            setIsHoldingOpen(true);
                            setIsVaOpen(false);
                            setIsIsaOpen(false);
                            setIsDensityAltOpen(false);
                            setIsWindOpen(false);
                            setIsE6BOpen(false);
                            setIsCheatSheetOpen(false);
                            setIsVORCheckOpen(false);
                            setIsInstructorToolsMenuOpen(false);
                          }}
                          className="w-full h-12 flex items-center gap-3 px-3.5 rounded-2xl ios-liquid-card hover:bg-white/30 dark:hover:bg-slate-800/45 text-slate-900 dark:text-slate-100 text-[13px] font-bold text-left transition-all active:scale-[0.98]"
                        >
                          <div className="bg-rose-500/15 border border-rose-400/30 p-1.5 rounded-xl shrink-0"><Compass size={16} className="text-rose-600 dark:text-rose-400" /></div>
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
                            setIsDensityAltOpen(false);
                            setIsWindOpen(false);
                            setIsE6BOpen(false);
                            setIsCheatSheetOpen(false);
                            setIsVORCheckOpen(false);
                            setIsInstructorToolsMenuOpen(false);
                          }}
                          className="w-full h-12 flex items-center gap-3 px-3.5 rounded-2xl ios-liquid-card hover:bg-white/30 dark:hover:bg-slate-800/45 text-slate-900 dark:text-slate-100 text-[13px] font-bold text-left transition-all active:scale-[0.98]"
                        >
                          <div className="bg-indigo-500/15 border border-indigo-400/30 p-1.5 rounded-xl shrink-0"><Target size={16} className="text-indigo-600 dark:text-indigo-400" /></div>
                          <span>Pivotal Altitude</span>
                        </button>
                      </div>
                    </div>

                    {/* Preflight & Ref */}
                    <div className="space-y-2">
                      <div className="px-1 text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest border-b border-white/45 dark:border-slate-700/60 pb-1.5 mb-2">Preflight & Ref</div>
                      <div className="space-y-1.5">
                        <button
                          onClick={() => {
                            setIsFlightTimeOpen(false);
                            setIsNightTimeOpen(false);
                            setIsPivotalAltOpen(false);
                            setIsHoldingOpen(false);
                            setIsVaOpen(false);
                            setIsIsaOpen(false);
                            setIsDensityAltOpen(false);
                            setIsWindOpen(false);
                            setIsE6BOpen(true);
                            setIsCheatSheetOpen(false);
                            setIsVORCheckOpen(false);
                            setIsInstructorToolsMenuOpen(false);
                          }}
                          className="w-full h-12 flex items-center gap-3 px-3.5 rounded-2xl ios-liquid-card hover:bg-white/30 dark:hover:bg-slate-800/45 text-slate-900 dark:text-slate-100 text-[13px] font-bold text-left transition-all active:scale-[0.98]"
                        >
                          <div className="bg-amber-500/15 border border-amber-400/30 p-1.5 rounded-xl shrink-0"><Calculator size={16} className="text-amber-600 dark:text-amber-400" /></div>
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
                            setIsDensityAltOpen(false);
                            setIsWindOpen(false);
                            setIsE6BOpen(false);
                            setIsCheatSheetOpen(true);
                            setIsVORCheckOpen(false);
                            setIsInstructorToolsMenuOpen(false);
                          }}
                          className="w-full h-12 flex items-center gap-3 px-3.5 rounded-2xl ios-liquid-card hover:bg-white/30 dark:hover:bg-slate-800/45 text-slate-900 dark:text-slate-100 text-[13px] font-bold text-left transition-all active:scale-[0.98]"
                        >
                          <div className="bg-teal-500/15 border border-teal-400/30 p-1.5 rounded-xl shrink-0"><FileSpreadsheet size={16} className="text-teal-600 dark:text-teal-400" /></div>
                          <span>Airport Cheat Sheet</span>
                        </button>
                      </div>
                    </div>

                    {/* Others */}
                    <div className="space-y-2 sm:col-span-2">
                      <div className="px-1 text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest border-b border-white/45 dark:border-slate-700/60 pb-1.5 mb-2">Others</div>
                      <div className="space-y-1.5">
                        <button
                          onClick={() => {
                            setIsFlightTimeOpen(false);
                            setIsNightTimeOpen(false);
                            setIsPivotalAltOpen(false);
                            setIsHoldingOpen(false);
                            setIsVaOpen(false);
                            setIsIsaOpen(false);
                            setIsDensityAltOpen(false);
                            setIsWindOpen(false);
                            setIsE6BOpen(false);
                            setIsCheatSheetOpen(false);
                            setIsVORCheckOpen(false);
                            setIsDinnerOpen(true);
                            setIsInstructorToolsMenuOpen(false);
                          }}
                          className="w-full h-12 flex items-center gap-3 px-3.5 rounded-2xl ios-liquid-card hover:bg-white/30 dark:hover:bg-slate-800/45 text-slate-900 dark:text-slate-100 text-[13px] font-bold text-left transition-all active:scale-[0.98]"
                        >
                          <div className="bg-orange-500/15 border border-orange-400/30 p-1.5 rounded-xl shrink-0"><ChefHat size={16} className="text-orange-600 dark:text-orange-400" /></div>
                          <span>Today's Dinner</span>
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Notifications Toast */}
        <div className="fixed bottom-[max(1.5rem,calc(env(safe-area-inset-bottom)+0.75rem))] right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
          <AnimatePresence>
            {notifications.map(toast => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                className="ios-liquid-glass-heavy rounded-2xl p-4 min-w-[300px] pointer-events-auto"
              >
                <div className="flex items-start gap-3">
                  <div className="text-emerald-600 dark:text-emerald-400 mt-0.5">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  </div>
                  <div>
                    <h4 className="text-slate-900 dark:text-white text-sm font-bold m-0">Live Update</h4>
                    <p className="text-slate-600 dark:text-slate-300 text-xs mt-1 leading-snug m-0">{toast.message}</p>
                  </div>
                  <button onClick={() => setNotifications(n => n.filter(x => x.id !== toast.id))} className="ml-auto text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default App;
