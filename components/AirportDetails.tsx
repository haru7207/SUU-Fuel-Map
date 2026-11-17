
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Airport, CardType, WeatherData, FuelType, NotamData } from '../types';
import { fetchWeather, isValidWeatherData, normalizeStationId } from '../services/aviationService';
import { auth, signInWithGoogle, logOut } from '../services/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { X, Phone, AlertTriangle, Fuel, MapPin, CloudSun, RefreshCw, Wind, ArrowUpCircle, Droplets, Clock, WifiOff, Info, User, Send, MessageCircle, AlertCircle, Lightbulb, CornerDownRight, Trash2, Loader2, EyeOff, HelpCircle, Mail, Radio, Sparkles, ExternalLink, LogIn, Calculator, Star, Bell, CheckCircle, CloudFog, CloudRain, ChevronUp, ChevronDown } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import Markdown from 'react-markdown';
import { REMARKS_DATABASE } from './remarksDb';
import { WeatherBoard } from './WeatherBoard';
import { FuelPriceTrendChart } from './FuelPriceTrendChart';
import { WeatherEffects } from './WeatherEffects';
import { RunwaysList } from './RunwaysList';

interface AirportDetailsProps {
  airport: Airport;
  onClose: () => void;
  onOpenFuelLog: () => void;
  weatherMap: Record<string, WeatherData>;
  onWeatherUpdate?: (stationId: string, data: WeatherData) => void;
  notamMap?: Record<string, NotamData>;
  isRefreshingFuel?: boolean;
  onRefreshFuelPrices?: () => Promise<void>;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  isMobileExpanded?: boolean;
  onToggleMobileExpand?: () => void;
}

type Tab = 'info' | 'runways' | 'weather' | 'notam';

const AirportDetails: React.FC<AirportDetailsProps> = ({ 
  airport, 
  onClose, 
  onOpenFuelLog, 
  weatherMap,
  onWeatherUpdate,
  notamMap,
  isRefreshingFuel = false,
  onRefreshFuelPrices,
  isFavorite = false,
  onToggleFavorite,
  isMobileExpanded = false,
  onToggleMobileExpand
}) => {
  const weatherId = airport.weatherSource || airport.id;
  const preloadedWeather = useMemo(() => {
    const normId = normalizeStationId(weatherId);
    const candidate = weatherMap?.[weatherId] || weatherMap?.[normId] || weatherMap?.[airport.id];
    return isValidWeatherData(candidate) ? candidate : null;
  }, [weatherMap, weatherId, airport.id]);

  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [weather, setWeather] = useState<WeatherData | null>(() => preloadedWeather);
  const [loadingWeather, setLoadingWeather] = useState<boolean>(() => !preloadedWeather);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [airport.id, activeTab]);

  // Crosswind Calculator State
  const [selectedRunway, setSelectedRunway] = useState<string>(airport.runways[0] || '18/36');

  // Airport Fuel Price Estimator State
  const [estFuelType, setEstFuelType] = useState<string>(airport.fuelTypes[0] || '');
  const [estGallons, setEstGallons] = useState<string>('50');
  const [estCustomPrice, setEstCustomPrice] = useState<string>('');
  const [estUseCustom, setEstUseCustom] = useState<boolean>(false);

  // Price Alert State
  const [localAlert, setLocalAlert] = useState<{ targetPrice: number, fuelType: string } | null>(null);

  useEffect(() => {
    try {
        const saved = localStorage.getItem('suu_price_alerts');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed[airport.id]) {
                setLocalAlert(parsed[airport.id]);
            } else {
                setLocalAlert(null);
            }
        } else {
            setLocalAlert(null);
        }
    } catch {}
  }, [airport.id]);

  const handleSetAlert = (f: FuelType) => {
    const rawInput = window.prompt(`Set Price Alert for ${airport.name} (${f})\nYou will be notified if the live price drops at or below this target.\n\nEnter target price (e.g. 6.50) or leave blank to clear:`, localAlert?.targetPrice?.toString() || "");
    if (rawInput === null) return;
    
    const val = parseFloat(rawInput);
    if (isNaN(val) || val <= 0) {
        if (rawInput.trim() === '') {
             const saved = JSON.parse(localStorage.getItem('suu_price_alerts') || '{}');
             delete saved[airport.id];
             localStorage.setItem('suu_price_alerts', JSON.stringify(saved));
             setLocalAlert(null);
             window.dispatchEvent(new Event('suu_price_alert_updated'));
        }
        return;
    }
    
    const saved = JSON.parse(localStorage.getItem('suu_price_alerts') || '{}');
    saved[airport.id] = { airportId: airport.id, targetPrice: val, fuelType: f };
    localStorage.setItem('suu_price_alerts', JSON.stringify(saved));
    setLocalAlert({ targetPrice: val, fuelType: f });
    window.dispatchEvent(new Event('suu_price_alert_updated'));
  };

  // Sync preferred fuel type when selected airport changes
  useEffect(() => {
    if (airport.fuelTypes && airport.fuelTypes.length > 0) {
      setEstFuelType(airport.fuelTypes[0]);
    }
  }, [airport]);

  // Calculation variables
  const estPricePerG = airport.fuelPrices?.[estFuelType] || null;
  const activeEstRate = estUseCustom && estCustomPrice && !isNaN(parseFloat(estCustomPrice)) ? parseFloat(estCustomPrice) : (estPricePerG || 0);
  const finalEstCost = activeEstRate && estGallons && !isNaN(parseFloat(estGallons)) ? (activeEstRate * parseFloat(estGallons)) : 0;

  useEffect(() => {
    if (estPricePerG !== null) {
      setEstCustomPrice(estPricePerG.toString());
    } else {
      setEstCustomPrice('');
    }
    setEstUseCustom(false);
  }, [estFuelType, estPricePerG]);
  
  // Remarks State
  const [remarks, setRemarks] = useState<string | null>(null);
  const [loadingRemarks, setLoadingRemarks] = useState(false);
  const [remarksError, setRemarksError] = useState<string | null>(null);
  const [remarksSource, setRemarksSource] = useState<'local' | 'gemini' | null>(null);

  // Auth State
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const fetchRemarks = useCallback(async (icao: string) => {
      setLoadingRemarks(true);
      setRemarksError(null);
      setRemarks(null);
      setRemarksSource(null);

      // 1. Check local preloaded database first (covers all main airports like KCDC, KSLC, etc.)
      const cleanedIcao = icao.trim().toUpperCase();
      const simpleIcao = cleanedIcao.replace(/^K/, ''); // e.g. CDC or 1L7
      const localKey = REMARKS_DATABASE[cleanedIcao] ? cleanedIcao : (REMARKS_DATABASE[simpleIcao] ? simpleIcao : null);
      
      if (localKey && REMARKS_DATABASE[localKey]) {
          setRemarks(REMARKS_DATABASE[localKey].join('\n'));
          setRemarksSource('local');
          setLoadingRemarks(false);
          return;
      }

      setRemarksError("No remarks published for this location.");
      setLoadingRemarks(false);
  }, []);

  useEffect(() => {
      fetchRemarks(airport.id);
  }, [airport.id, fetchRemarks]);

  // Forecast State
  const [forecast, setForecast] = useState<string | null>(null);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);

  const fetchForecast = useCallback(async () => {
      setLoadingForecast(true);
      setForecastError(null);
      try {
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${airport.lat}&longitude=${airport.lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max,winddirection_10m_dominant&temperature_unit=fahrenheit&windspeed_unit=mph&precipitation_unit=inch&timezone=auto`;
          const response = await fetch(url);
          if (!response.ok) throw new Error("API responded with an error");
          
          const data = await response.json();
          const { time, weathercode, temperature_2m_max, temperature_2m_min, precipitation_probability_max, windspeed_10m_max, winddirection_10m_dominant } = data.daily;
          
          const getWeatherString = (code: number) => {
              switch(true) {
                  case code === 0: return '☀️ Clear sky';
                  case code === 1: return '🌤️ Mainly clear';
                  case code === 2: return '⛅ Partly cloudy';
                  case code === 3: return '☁️ Overcast';
                  case code === 45 || code === 48: return '🌫️ Fog';
                  case code >= 51 && code <= 57: return '🌧️ Drizzle';
                  case code >= 61 && code <= 65: return '🌧️ Rain';
                  case code === 66 || code === 67: return '🌨️ Freezing Rain';
                  case code >= 71 && code <= 77: return '❄️ Snow';
                  case code >= 80 && code <= 82: return '🌦️ Rain Showers';
                  case code === 85 || code === 86: return '🌨️ Snow Showers';
                  case code >= 95: return '⛈️ Thunderstorm';
                  default: return '☁️ Unknown';
              }
          };

          const getWindDirection = (deg: number) => { 
              const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']; 
              return dirs[Math.round(deg / 45) % 8]; 
          };

          let md = "";
          for (let i = 0; i < time.length; i++) {
              const dateObj = new Date(time[i] + 'T00:00:00');
              const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' });
              
              const code = weathercode[i];
              const wx = getWeatherString(code);
              const maxT = Math.round(temperature_2m_max[i]);
              const minT = Math.round(temperature_2m_min[i]);
              const windS = Math.round(windspeed_10m_max[i]);
              const windD = getWindDirection(winddirection_10m_dominant[i]);
              const precip = precipitation_probability_max[i];

              md += `**${dateStr}**  \n`;
              md += `${wx} • 🌡️ ${maxT}° / ${minT}° • 💨 ${windS} mph ${windD} • 🌧️ ${precip}% chance of precip\n\n`;
          }
          
          setForecast(md.trim());
      } catch (error: any) {
          console.error("Error fetching forecast:", error);
          setForecastError("Failed to fetch forecast. Please try again later.");
      } finally {
          setLoadingForecast(false);
      }
  }, [airport.id, airport.city, airport.state, airport.lat, airport.lon]);

  useEffect(() => {
      if (activeTab === 'weather' && !forecast && !loadingForecast && !forecastError) {
          fetchForecast();
      }
  }, [activeTab, fetchForecast, forecast, loadingForecast, forecastError]);

  // Manual refresh triggered by button
  const loadWeather = useCallback(async (forceRefresh: boolean = false) => {
      setLoadingWeather(true);
      try {
          const w = await fetchWeather(weatherId, forceRefresh);
          setWeather(w);
          if (isValidWeatherData(w) && onWeatherUpdate) {
              onWeatherUpdate(weatherId, w);
          }
      } catch (e) {
          console.error("Weather load failed", e);
      } finally {
          setLoadingWeather(false);
      }
  }, [weatherId, onWeatherUpdate]);

  // Sync immediately whenever preloaded weather is available in weatherMap
  useEffect(() => {
    if (preloadedWeather) {
      setWeather(preloadedWeather);
      setLoadingWeather(false);
    }
  }, [preloadedWeather]);

  // Only fetch on-demand if weather wasn't already preloaded (or silently refresh if > 10 mins old)
  useEffect(() => {
    let isMounted = true;

    if (preloadedWeather) {
      setWeather(preloadedWeather);
      setLoadingWeather(false);
      const lastUpd = preloadedWeather.lastUpdated ? new Date(preloadedWeather.lastUpdated).getTime() : 0;
      const isFresh = lastUpd > 0 && (Date.now() - lastUpd) < 10 * 60 * 1000;
      if (isFresh) {
        return () => { isMounted = false; };
      }
      // Silently refresh in background without showing skeleton
      fetchWeather(weatherId, true).then(w => {
        if (isMounted && isValidWeatherData(w)) {
          setWeather(w);
          onWeatherUpdate?.(weatherId, w);
        }
      }).catch(() => {});
      return () => { isMounted = false; };
    }

    setLoadingWeather(true);
    fetchWeather(weatherId, false).then(w => {
        if (isMounted) {
            setWeather(w);
            setLoadingWeather(false);
            if (isValidWeatherData(w)) {
                onWeatherUpdate?.(weatherId, w);
            }
        }
    }).catch(e => {
        console.error("Auto weather load failed", e);
        if (isMounted) setLoadingWeather(false);
    });
    
    return () => { isMounted = false; };
  }, [airport.id, weatherId]);

  useEffect(() => {
    if (airport.runways.length > 0) {
      setSelectedRunway(airport.runways[0]);
    }
  }, [airport]);

  // Listen for online/offline events to update local state
  useEffect(() => {
      const handleStatusChange = () => setIsOffline(!navigator.onLine);
      window.addEventListener('online', handleStatusChange);
      window.addEventListener('offline', handleStatusChange);
      return () => {
          window.removeEventListener('online', handleStatusChange);
          window.removeEventListener('offline', handleStatusChange);
      };
  }, []);


  const getFlightCategoryDetails = (cat: string) => {
    switch (cat) {
      case 'VFR': return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', icon: <CheckCircle size={16} />, label: 'VFR', desc: 'Visual Flight Rules (Ceiling > 3,000ft, Vis > 5sm)' };
      case 'MVFR': return { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', icon: <CloudFog size={16} />, label: 'MVFR', desc: 'Marginal VFR (Ceiling 1,000-3,000ft, Vis 3-5sm)' };
      case 'IFR': return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', icon: <CloudRain size={16} />, label: 'IFR', desc: 'Instrument Flight Rules (Ceiling 500-1,000ft, Vis 1-3sm)' };
      case 'LIFR': return { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200', icon: <AlertTriangle size={16} />, label: 'LIFR', desc: 'Low IFR (Ceiling < 500ft, Vis < 1sm)' };
      default: return { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-200', icon: <HelpCircle size={16} />, label: 'UNKNOWN', desc: 'Weather data unavailable or missing' };
    }
  };

  const formatObsTime = (timeData?: string | number) => {
      if (!timeData) return 'N/A';
      if (typeof timeData === 'number') {
          const d = new Date(timeData * 1000); // Unix timestamp
          return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }) + 'Z';
      }
      // Expecting "YYYY-MM-DD HH:MM:SS" (Legacy)
      const parts = timeData.split(' ');
      if (parts.length > 1) {
          const time = parts[1].substring(0, 5); // Extract HH:MM
          return `${time}Z`;
      }
      return timeData;
  }
  
  // Safe date formatter for notes
  const formatNoteDate = (dateStr: string) => {
      try {
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return dateStr;
          
          const now = new Date();
          const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);
          
          if (diffInSeconds < 60) return "Just now";
          if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
          if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
          if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
          
          return d.toLocaleString([], { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      } catch (e) {
          return dateStr || 'Unknown Date';
      }
  };

  const formatLastUpdated = (isoStr?: string) => {
      if (!isoStr) return '';
      try {
          const d = new Date(isoStr);
          if (isNaN(d.getTime())) return '';
          const datePart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const timePart = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return `${datePart}, ${timePart}`;
      } catch (e) {
          return '';
      }
  };

  // --- Wind Data (Direct from API now) ---
  const windData = useMemo(() => {
    if (!weather?.wind) {
        // Fallback to regex if wind object missing but METAR exists (legacy support)
        if (weather?.metar) {
             const match = weather.metar.match(/(\d{3}|VRB)(\d{2,3})(?:G(\d{2,3}))?KT/);
             if (match) {
                 return {
                     direction: match[1] === 'VRB' ? 0 : parseInt(match[1], 10),
                     isVrb: match[1] === 'VRB',
                     speed: parseInt(match[2], 10),
                     gust: match[3] ? parseInt(match[3], 10) : 0
                 };
             }
        }
        return null;
    }
    return {
        direction: weather.wind.direction,
        isVrb: weather.wind.isVrb || false,
        speed: weather.wind.speed,
        gust: weather.wind.gust
    };
  }, [weather]);

  // --- Best Runway Logic ---
  const bestRunwayInfo = useMemo(() => {
    if (!windData || !airport.runways.length) return null;
    
    let bestRwyId = '';
    let minDiff = 360;

    // Iterate through all runways strings, splitting them
    airport.runways.forEach(r => {
        const sides = r.split('/');
        sides.forEach(side => {
            const heading = parseInt(side.replace(/\D/g, '')) * 10;
            // Calculate absolute difference
            let diff = Math.abs(windData.direction - heading);
            if (diff > 180) diff = 360 - diff;
            
            // Prefer smaller diff (headwind)
            if (diff < minDiff) {
                minDiff = diff;
                bestRwyId = side;
            }
        });
    });
    
    return { id: bestRwyId, parent: airport.runways.find(r => r.includes(bestRwyId)) };
  }, [windData, airport.runways]);


  // --- Crosswind Logic ---
  const crosswindData = useMemo(() => {
    if (!windData || !selectedRunway) return null;
    
    // Parse runway number (e.g., "02" from "02/20")
    const rwyNum = parseInt(selectedRunway.split('/')[0], 10);
    const rwyHeading = rwyNum * 10;
    
    // Calculate difference
    let diff = windData.direction - rwyHeading;
    // Normalize to -180 to 180
    while (diff <= -180) diff += 360;
    while (diff > 180) diff -= 360;

    const angleRad = diff * (Math.PI / 180);
    const crosswind = Math.abs(windData.speed * Math.sin(angleRad));
    const headwind = windData.speed * Math.cos(angleRad);

    return {
      rwyHeading,
      crosswind: Math.round(crosswind),
      headwind: Math.round(headwind),
      diff,
      isTailwind: headwind < 0
    };
  }, [windData, selectedRunway]);



  return (
    <div className="h-full min-h-0 flex flex-col bg-transparent overflow-hidden relative font-sans">
      
      {/* Mobile Interactive Drag / Expand Bar */}
      <button
        type="button"
        onClick={() => onToggleMobileExpand && onToggleMobileExpand()}
        className="w-full flex items-center justify-center gap-1.5 pt-2.5 pb-1 md:hidden bg-white/12 dark:bg-slate-900/15 flex-shrink-0 active:bg-white/25 transition-colors cursor-pointer"
        title={isMobileExpanded ? "Collapse panel" : "Expand panel to full screen"}
      >
        <div className="w-10 h-1.5 bg-slate-500/50 dark:bg-slate-400/60 rounded-full" />
        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 flex items-center">
          {isMobileExpanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
        </span>
      </button>

      {/* Flight Category Status Bar (Desktop fixed, Mobile inside scroll view to save header space) */}
      {weather && (
        (() => {
          const catDetails = getFlightCategoryDetails(weather.flightCategory);
          return (
            <div className={`hidden md:flex w-full px-4 py-2 items-center justify-center gap-2 border-b border-white/55 ${catDetails.bg}/30 flex-shrink-0`}>
              <div className={`${catDetails.text} drop-shadow-2xs`}>
                {catDetails.icon}
              </div>
              <span className={`text-[11px] font-extrabold tracking-wide ${catDetails.text}`}>
                {catDetails.label} · <span className="opacity-85 font-medium tracking-normal">{catDetails.desc}</span>
              </span>
            </div>
          );
        })()
      )}

      {/* --- iOS LIQUID GLASS HEADER --- */}
      <div className="px-4 py-2.5 md:p-5 border-b border-white/55 dark:border-white/15 bg-white/6 dark:bg-slate-900/10 flex justify-between items-start flex-shrink-0">
        <div className="min-w-0 pr-2">
          <div className="flex items-center gap-2 flex-wrap">
             <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight font-mono drop-shadow-2xs">
                {airport.id}
             </h2>
            {weather && (
              <span className={`md:hidden text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${getFlightCategoryDetails(weather.flightCategory).bg}/70 ${getFlightCategoryDetails(weather.flightCategory).text} ${getFlightCategoryDetails(weather.flightCategory).border}`}>
                {weather.flightCategory}
              </span>
            )}
            {airport.weatherSource && (
                 <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1" title={`Weather from ${airport.weatherSource}`}>
                    · <CloudSun size={12} className="text-sky-600" /> {airport.weatherSource}
                 </span>
            )}
          </div>
          <p className="text-xs md:text-sm text-slate-800 dark:text-slate-200 font-semibold mt-0.5 truncate">{airport.name}</p>
          <div className="flex items-center text-[11px] md:text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-medium">
            <MapPin size={11} className="mr-1 text-sky-600 dark:text-sky-400 shrink-0" />
            <span className="truncate">{airport.city}, {airport.state}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
            {onToggleMobileExpand && (
              <button
                type="button"
                onClick={onToggleMobileExpand}
                className="md:hidden p-2 rounded-full ios-liquid-pill text-slate-700 dark:text-slate-200 active:scale-95 flex items-center justify-center"
                title={isMobileExpanded ? "Standard height" : "Full height"}
              >
                {isMobileExpanded ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
              </button>
            )}
            <button 
               onClick={() => onToggleFavorite && onToggleFavorite(airport.id)} 
               className={`p-2 rounded-full ios-liquid-pill transition-all duration-200 active:scale-95 flex items-center justify-center ${
                 isFavorite 
                   ? 'text-amber-500' 
                   : 'text-slate-600 dark:text-slate-200 hover:text-amber-500'
               }`} 
               title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            >
                <Star size={17} className={isFavorite ? "fill-amber-500 text-amber-500" : ""} />
            </button>
            <a 
               href={`https://www.airnav.com/airport/${airport.id}`} 
               target="_blank" 
               rel="noopener noreferrer" 
               className="p-2 ios-liquid-pill text-sky-600 dark:text-sky-400 hover:text-sky-700 rounded-full transition-all active:scale-95 flex items-center justify-center" 
               title="View on AirNav"
            >
                <ExternalLink size={17} />
            </a>
            <button onClick={onOpenFuelLog} className="p-2 ios-liquid-pill text-rose-600 dark:text-rose-400 hover:text-rose-700 rounded-full transition-all active:scale-95 flex items-center justify-center" title="Log Fuel">
                <Fuel size={17} />
            </button>
            <button onClick={onClose} className="p-2 ios-liquid-pill text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white rounded-full transition-all active:scale-95 flex items-center justify-center">
              <X size={18} />
            </button>
        </div>
      </div>

      {/* --- iOS SEGMENTED TABS --- */}
      <div className="px-3.5 py-2 md:px-4 md:py-2.5 bg-white/5 dark:bg-slate-900/10 border-b border-white/50 dark:border-white/15 flex-shrink-0">
        <div className="flex bg-white/12 dark:bg-slate-800/20 p-1 rounded-2xl border border-white/65 dark:border-white/20 gap-1 shadow-[inset_0_1px_0.5px_rgba(255,255,255,0.8)]">
          {[
            { id: 'info', label: 'FBO & Info' },
            { id: 'runways', label: 'Runways' },
            { id: 'weather', label: 'Weather' },
            { id: 'notam', label: 'Remarks' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex-1 py-1.5 px-2 text-xs font-semibold text-center rounded-xl transition-all whitespace-nowrap shrink-0 ${
                activeTab === tab.id
                  ? 'bg-white/38 dark:bg-slate-700/50 backdrop-blur-md text-slate-900 dark:text-white shadow-[0_2px_8px_rgba(15,23,42,0.08),inset_0_1.5px_0.5px_rgba(255,255,255,0.95)] border border-white/85 dark:border-white/25'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* --- CONTENT AREA --- */}
      <div
        ref={scrollContainerRef}
        onScroll={(e) => setShowScrollTop(e.currentTarget.scrollTop > 180)}
        className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y p-4 pb-28 md:pb-8 space-y-4 custom-scrollbar"
      >
        {airport.generalWarning && (
          <div className="bg-amber-500/15 px-3.5 py-3 rounded-2xl border border-amber-300/60 dark:border-amber-700/40 flex items-start gap-2.5">
            <AlertTriangle className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={17} />
            <div>
              <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300 tracking-wide mb-0.5">Important Operational Notice</h4>
              <p className="text-xs text-amber-800 dark:text-amber-200/90 leading-relaxed font-medium">
                {airport.generalWarning}
              </p>
            </div>
          </div>
        )}
        
        {/* TAB: INFO */}
        {activeTab === 'info' && (
            <div className="space-y-4 animate-fadeIn">
                {airport.cardRules.critical && (
                <div className="bg-rose-500/15 backdrop-blur-xl border border-rose-300/60 dark:border-rose-800/50 p-4 rounded-2xl flex gap-3 items-start">
                    <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-xs text-rose-800 dark:text-rose-300 font-bold tracking-wide">Restriction</p>
                        <p className="text-sm text-rose-700 dark:text-rose-200 font-medium">{airport.cardRules.notes}</p>
                    </div>
                </div>
                )}

                <div className="ios-liquid-card rounded-2xl overflow-hidden p-5 space-y-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">FBO Provider</span>
                            <p className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">{airport.fbo}</p>
                        </div>
                        <div className="text-right flex-1 ml-4">
                            <div className="flex flex-col items-end mb-1.5">
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Fuel & Contact</span>
                                {airport.fuelPricesLastUpdated ? (
                                    <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 mt-0.5">
                                        Synced {formatLastUpdated(airport.fuelPricesLastUpdated)}
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">
                                        Database Rate
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-col gap-2">
                                {airport.fuelTypes.map(f => (
                                    <div key={f} className="flex items-center justify-end gap-2 border-b border-slate-200/50 dark:border-slate-700/50 last:border-0 pb-1.5 last:pb-0">
                                        <div className="flex flex-col items-end">
                                            <div className="flex items-center gap-2">
                                                 <span className="flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                    <Droplets size={11} className={f === FuelType.LL100 ? 'text-emerald-500' : 'text-sky-500'} />
                                                    {f}
                                                 </span>
                                                 {airport.fuelPhones && airport.fuelPhones[f] && (
                                                     <a href={`tel:${airport.fuelPhones[f]}`} className="flex items-center gap-1 text-xs text-sky-600 dark:text-sky-400 hover:underline font-semibold font-mono">
                                                        <Phone size={10} />
                                                        <span>{airport.fuelPhones[f]}</span>
                                                     </a>
                                                 )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 w-24 justify-end">
                                            <button 
                                                onClick={() => handleSetAlert(f as FuelType)} 
                                                className={`p-1.5 rounded-full transition-colors ${localAlert?.fuelType === f && localAlert.targetPrice > 0 ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'hover:bg-white/60 dark:hover:bg-slate-800 text-slate-400'}`}
                                                title={localAlert?.fuelType === f ? `Alert set: <= $${localAlert.targetPrice}` : "Set Price Alert"}
                                            >
                                                <Bell size={12} strokeWidth={localAlert?.fuelType === f ? 3 : 2} />
                                            </button>
                                            <span className="text-sm font-extrabold text-slate-900 dark:text-white font-mono text-right shrink-0 min-w-[3.5rem]">
                                                {airport.fuelPrices && airport.fuelPrices[f] ? `$${airport.fuelPrices[f].toFixed(2)}` : 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-white/60 dark:border-slate-700/50">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-2">Accepted Payment Card</span>
                        
                        {airport.cardRules.byFbo ? (
                            <div className="mt-1 space-y-2.5">
                                {airport.cardRules.byFbo.map((fboRule, idx) => (
                                    <div key={idx} className={`p-3.5 rounded-2xl border backdrop-blur-md flex flex-col gap-1.5 ${
                                        fboRule.card === CardType.WHITE_CARD 
                                            ? 'bg-rose-500/10 border-rose-300/60 dark:border-rose-800/50' 
                                            : fboRule.card === CardType.PCARD 
                                            ? 'bg-blue-500/10 border-blue-300/60 dark:border-blue-800/50' 
                                            : 'bg-white/50 dark:bg-slate-800/50 border-white/80 dark:border-slate-700/60'
                                    }`}>
                                         <div className="flex justify-between items-center">
                                             <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">{fboRule.name}</span>
                                             <span className={`text-xs font-bold ${
                                                 fboRule.card === CardType.WHITE_CARD 
                                                 ? 'text-rose-700 dark:text-rose-300' 
                                                 : fboRule.card === CardType.PCARD 
                                                 ? 'text-blue-700 dark:text-blue-300' 
                                                 : 'text-slate-800 dark:text-slate-200'
                                             }`}>
                                                 {fboRule.card === CardType.WHITE_CARD ? 'White Card' : fboRule.card === CardType.PCARD ? 'PCard' : 'AVFuel'}
                                             </span>
                                         </div>
                                         <div className="text-xs text-slate-600 dark:text-slate-300 flex flex-col gap-0.5 border-t border-slate-200/50 dark:border-slate-700/50 pt-1.5">
                                             {fboRule.vendor && (
                                                <p><span className="font-semibold text-slate-500 dark:text-slate-400">Fuel Vendor:</span> {fboRule.vendor}</p>
                                             )}
                                             {fboRule.notes && (
                                                <p><span className="font-semibold text-slate-500 dark:text-slate-400">Notice:</span> {fboRule.notes}</p>
                                             )}
                                         </div>
                                    </div>
                                ))}
                                {airport.cardRules.notes && (
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 italic">
                                        {airport.cardRules.notes}
                                    </p>
                                )}
                            </div>
                        ) : airport.cardRules.byFuelType ? (
                            <div className="mt-1 space-y-2">
                                {Object.entries(airport.cardRules.byFuelType).map(([fuelType, card]) => (
                                    <div key={fuelType} className={`p-3.5 rounded-2xl border backdrop-blur-md flex justify-between items-center ${
                                        card === CardType.WHITE_CARD ? 'bg-rose-500/10 border-rose-300/60' : 'bg-blue-500/10 border-blue-300/60'
                                    }`}>
                                         <div>
                                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-0.5">{fuelType}</span>
                                            <span className={`text-base font-bold ${
                                                card === CardType.WHITE_CARD ? 'text-rose-700 dark:text-rose-300' : 'text-blue-700 dark:text-blue-300'
                                            }`}>
                                                {card}
                                            </span>
                                         </div>
                                    </div>
                                ))}
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 italic">
                                    {airport.cardRules.notes}
                                </p>
                            </div>
                        ) : (
                            <div className={`mt-1 p-4 rounded-2xl border backdrop-blur-md ${
                                airport.cardRules.primary === CardType.WHITE_CARD
                                  ? 'bg-rose-500/10 border-rose-300/60 dark:border-rose-800/50'
                                  : 'bg-sky-500/10 border-sky-300/60 dark:border-sky-800/50'
                            }`}>
                                <p className={`text-base font-extrabold ${
                                    airport.cardRules.primary === CardType.WHITE_CARD ? 'text-rose-700 dark:text-rose-300' : 'text-sky-700 dark:text-sky-300'
                                }`}>
                                    {airport.cardRules.primary === CardType.WHITE_CARD ? `White Card (${airport.fbo})` : airport.cardRules.primary}
                                </p>
                                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                                    {airport.cardRules.notes || "Standard fueling procedures apply."}
                                </p>

                                {airport.cardRules.fuelingNotes && (
                                    <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Droplets size={12} className="text-slate-500" />
                                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Fueling Notes</p>
                                        </div>
                                        <p className="text-xs text-slate-700 dark:text-slate-200 italic bg-white/60 dark:bg-slate-900/50 p-2.5 rounded-xl border border-white/80 dark:border-white/10">
                                            "{airport.cardRules.fuelingNotes}"
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Fuel Price Trend Chart */}
                    <FuelPriceTrendChart airport={airport} />

                    {/* Estimated Fuel Price Calculator Card */}
                    <div className="bg-white/12 dark:bg-slate-900/18 border border-white/65 dark:border-slate-700/50 rounded-2xl p-4 space-y-4 shadow-[inset_0_1px_0.5px_rgba(255,255,255,0.85)]">
                        <div className="flex items-center gap-2 border-b border-white/45 dark:border-slate-700/50 pb-2.5">
                            <Calculator size={16} className="text-sky-600 dark:text-sky-400" />
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 tracking-tight">
                                Airport Estimated Fuel Cost Calculator
                            </h4>
                        </div>

                        <div className="space-y-3.5">
                            <div className="space-y-1.5">
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-300 block">
                                    Fuel Type
                                </span>
                                <div className="grid grid-cols-2 gap-2">
                                    {airport.fuelTypes.map((t) => {
                                        const rate = airport.fuelPrices?.[t];
                                        return (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => setEstFuelType(t)}
                                                className={`py-2 px-3 text-xs font-bold rounded-xl border text-left flex justify-between items-center transition-all ${
                                                    estFuelType === t
                                                    ? 'bg-sky-500/70 backdrop-blur-md border-white/65 text-white shadow-[inset_0_1px_0.5px_rgba(255,255,255,0.55)]'
                                                    : 'bg-white/16 dark:bg-slate-800/25 border-white/65 dark:border-slate-700 hover:bg-white/32 text-slate-800 dark:text-slate-200'
                                                }`}
                                            >
                                                <span>{t}</span>
                                                <span className="font-mono text-xs">
                                                    {rate ? `$${rate.toFixed(2)}` : 'N/A'}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="space-y-1.5">
                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300 block">
                                        Gallons
                                    </span>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            step="any"
                                            value={estGallons}
                                            onChange={(e) => setEstGallons(e.target.value)}
                                            placeholder="0.0"
                                            className="flex-1 min-w-0 ios-liquid-input rounded-xl px-3 py-1.5 text-xs font-bold font-mono text-slate-900 dark:text-slate-100 outline-none"
                                        />
                                        <div className="flex gap-1 shrink-0 items-center">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const current = parseFloat(estGallons || '0');
                                                    const newVal = Math.max(0, current - 0.5);
                                                    setEstGallons(Number(newVal.toFixed(1)).toString());
                                                }}
                                                className="ios-liquid-pill text-slate-800 dark:text-slate-200 text-xs font-bold h-8 px-2.5 rounded-xl transition-transform active:scale-95 font-mono"
                                                title="Decrease by 0.5G"
                                            >
                                                -0.5
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const current = parseFloat(estGallons || '0');
                                                    const newVal = current + 0.5;
                                                    setEstGallons(Number(newVal.toFixed(1)).toString());
                                                }}
                                                className="ios-liquid-pill text-slate-800 dark:text-slate-200 text-xs font-bold h-8 px-2.5 rounded-xl transition-transform active:scale-95 font-mono"
                                                title="Increase by 0.5G"
                                            >
                                                +0.5
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-1.5 overflow-x-auto py-0.5">
                                    {['10', '20', '25', '30', '35', '40', '50'].map((amt) => (
                                        <button
                                            key={amt}
                                            type="button"
                                            onClick={() => setEstGallons(amt)}
                                            className="bg-white/16 hover:bg-white/35 dark:bg-slate-800/25 dark:hover:bg-slate-700/45 border border-white/65 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-semibold font-mono px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap"
                                        >
                                            {amt}G
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Custom Price Toggle */}
                        <div className="border-t border-white/45 dark:border-slate-700/50 pt-3">
                            <label className="flex items-center gap-2 cursor-pointer mb-2">
                                <input
                                    type="checkbox"
                                    checked={estUseCustom}
                                    onChange={(e) => {
                                        setEstUseCustom(e.target.checked);
                                    }}
                                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 h-3.5 w-3.5"
                                />
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 select-none">
                                    Override Price Per Gallon
                                </span>
                            </label>

                            {estUseCustom && (
                                <div className="flex items-center gap-1.5 animate-fade-in pl-1">
                                    <span className="text-xs font-bold text-slate-600">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={estCustomPrice}
                                        onChange={(e) => setEstCustomPrice(e.target.value)}
                                        placeholder="0.00"
                                        className="w-24 ios-liquid-input rounded-xl px-2.5 py-1 text-xs font-bold font-mono text-slate-900 dark:text-slate-100 outline-none"
                                    />
                                    <span className="text-xs text-slate-600 font-medium">/ gal</span>
                                </div>
                            )}
                        </div>

                        {/* Calculated Output */}
                        <div className="bg-white/18 dark:bg-slate-800/28 border border-white/75 dark:border-slate-700 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-[inset_0_1.5px_0.5px_rgba(255,255,255,0.92)]">
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-0.5">
                                Estimated Total Cost
                            </span>
                            <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tracking-tight">
                                ${finalEstCost.toLocaleString([], { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 font-medium">
                                {estUseCustom ? `Custom Override · $${parseFloat(estCustomPrice || '0').toFixed(2)}/gal` : estPricePerG ? (airport.fuelPricesLastUpdated ? `Live Rate · $${estPricePerG}/gal` : `DB Rate · $${estPricePerG}/gal`) : 'No price data'}
                            </span>
                        </div>
                    </div>

                    {/* Frequencies Info */}
                    {airport.frequencies && airport.frequencies.length > 0 && (
                        <div>
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-2">Communication Frequencies</span>
                            <div className="flex flex-col gap-2">
                                {airport.frequencies.map((freq, index) => (
                                    <div key={index} className="flex items-center justify-between border px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white/14 dark:bg-slate-800/22 border-white/65 dark:border-slate-700/60 text-slate-800 dark:text-slate-200 shadow-[inset_0_1px_0.5px_rgba(255,255,255,0.8)]">
                                        <div className="flex items-center gap-2">
                                            <Radio size={14} className="text-sky-600 dark:text-sky-400" />
                                            <span>{freq.name}</span>
                                        </div>
                                        <span className="font-mono font-bold text-slate-900 dark:text-white">{freq.freq}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <a href={`tel:${airport.phone}`} className="flex items-center justify-center w-full py-3 bg-emerald-600/80 hover:bg-emerald-500/85 backdrop-blur-md border border-white/50 text-white rounded-2xl font-bold text-sm transition-all active:scale-[0.99] gap-2 shadow-md shadow-emerald-600/20 mt-2">
                        <Phone size={17} />
                        Call Main FBO · <span className="font-mono">{airport.phone}</span>
                    </a>
                </div>

                {/* SUU Finance Contacts Section */}
                <div className="ios-liquid-card rounded-2xl p-4">
                    <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-3 flex items-center gap-2">
                        <HelpCircle size={14} className="text-sky-600 dark:text-sky-400" />
                        Fuel & Finance Support
                    </h4>
                    <div className="space-y-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Katie Baca</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Business Manager</p>
                            </div>
                            <div className="text-right">
                                <a href="tel:435-922-5107" className="block text-xs font-bold font-mono text-sky-600 dark:text-sky-400 hover:underline">
                                    (435) 922-5107
                                </a>
                                <a href="mailto:katiebaca@suu.edu" className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center justify-end gap-1 mt-0.5">
                                    <Mail size={11} />
                                    katiebaca@suu.edu
                                </a>
                            </div>
                        </div>

                        <div className="flex justify-between items-start pt-3 border-t border-slate-200/60 dark:border-slate-700/50">
                            <div>
                                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Elon Jun</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Finance Assistant</p>
                            </div>
                            <div className="text-right">
                                <a href="tel:435-681-1849" className="block text-xs font-bold font-mono text-sky-600 dark:text-sky-400 hover:underline">
                                    (435) 681-1849
                                </a>
                                <a href="mailto:suenghunjun@suu.edu" className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center justify-end gap-1 mt-0.5">
                                    <Mail size={11} />
                                    suenghunjun@suu.edu
                                </a>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/50">
                        <a 
                            href="https://docs.google.com/forms/d/e/1FAIpQLScmBQPQeOxgMnq4UEvxzg5HwEe-x2Owj3kVpV4pWbpXrxhoHg/viewform" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex items-center justify-center w-full py-2.5 ios-liquid-pill text-rose-600 dark:text-rose-400 hover:bg-white/40 rounded-xl font-semibold text-xs transition-all gap-2"
                        >
                            <AlertCircle size={14} />
                            Report Fuel or Card Discrepancy
                        </a>
                    </div>
                </div>
            </div>
        )}

        {/* TAB: WEATHER */}
        {activeTab === 'weather' && (
            <div className="space-y-4 animate-fadeIn relative p-2 -mx-2">
                {weather && <WeatherEffects weather={weather} />}
                <div className="flex justify-between items-center mb-2 relative z-10 px-1">
                    <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300">Aviation Weather (METAR & TAF)</h3>
                    <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
                        {weather?.lastUpdated && (
                             <span title="Last fetched from API" className="font-mono text-[11px]">
                                Synced {new Date(weather.lastUpdated).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                             </span>
                        )}
                        {weather?.observationTime && (
                             <span className="font-mono text-[11px]">
                                · Obs {formatObsTime(weather.observationTime)}
                             </span>
                        )}
                        <button onClick={() => loadWeather(true)} className={`p-1.5 rounded-full ios-liquid-pill text-sky-600 dark:text-sky-400 hover:text-sky-700 transition-colors ${loadingWeather ? 'animate-spin' : ''}`} title="Refresh Weather">
                            <RefreshCw size={13} />
                        </button>
                    </div>
                </div>

                {isOffline && (
                    <div className="bg-amber-500/15 backdrop-blur-xl border border-amber-300/60 p-3 rounded-2xl flex gap-3 items-center mb-2 relative z-10">
                         <WifiOff className="h-4 w-4 text-amber-600 flex-shrink-0" />
                         <div>
                            <p className="text-xs font-bold text-amber-800 dark:text-amber-300">Offline Mode</p>
                            {weather?.lastUpdated && (
                                <p className="text-[11px] text-amber-700 dark:text-amber-400 font-mono">
                                    Last Updated: {new Date(weather.lastUpdated).toLocaleTimeString()}
                                </p>
                            )}
                         </div>
                    </div>
                )}
                {airport.weatherSource && (
                    <div className="ios-liquid-card p-3 rounded-2xl flex gap-2.5 items-center mb-2 relative z-10">
                         <Info className="h-4 w-4 text-sky-600 dark:text-sky-400 flex-shrink-0" />
                         <p className="text-xs text-slate-700 dark:text-slate-300">
                             Weather reported from nearest AWOS/ASOS station <strong className="font-mono">{airport.weatherSource}</strong>.
                         </p>
                    </div>
                )}
                
                {loadingWeather ? (
                    <div className="space-y-3 animate-pulse relative z-10">
                        <div className="h-24 bg-white/60 dark:bg-slate-800/60 rounded-2xl"></div>
                        <div className="h-32 bg-white/60 dark:bg-slate-800/60 rounded-2xl"></div>
                    </div>
                ) : weather ? (
                    <div className="relative z-10 space-y-5">
                        <WeatherBoard weather={weather} airport={airport} />
                    
                    {/* 7-Day Forecast */}
                    <div className="mt-5">
                        <div className="flex items-center gap-2 mb-2.5 px-1">
                            <CloudSun size={16} className="text-sky-600 dark:text-sky-400" />
                            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">7-Day Outlook</h3>
                        </div>
                        <div className="ios-liquid-card rounded-2xl p-4">
                            {loadingForecast ? (
                                <div className="flex flex-col items-center justify-center py-6 text-slate-500 gap-3">
                                    <Loader2 size={20} className="animate-spin text-sky-500" />
                                    <span className="text-xs font-medium">Fetching 7-day outlook...</span>
                                </div>
                            ) : forecastError ? (
                                <div className="flex flex-col items-center justify-center py-4 text-center">
                                    <AlertCircle size={24} className="text-rose-400 mb-2" />
                                    <p className="text-xs text-slate-600 dark:text-slate-300">{forecastError}</p>
                                    <button 
                                        onClick={fetchForecast}
                                        className="mt-3 px-3.5 py-1.5 ios-liquid-pill text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-full transition-colors"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            ) : forecast ? (
                                <div className="prose prose-sm max-w-none prose-p:leading-snug prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-headings:text-slate-800 dark:prose-headings:text-white prose-strong:text-slate-900 dark:prose-strong:text-white text-xs">
                                    <Markdown>{forecast}</Markdown>
                                </div>
                            ) : (
                                <div className="text-center py-6 text-slate-400 text-xs">Forecast unavailable</div>
                            )}
                        </div>
                    </div>
                    </div>
                ) : (
                    <div className="text-center py-8 text-slate-400 ios-liquid-card rounded-2xl">Weather unavailable</div>
                )}
            </div>
        )}

        {/* TAB: RUNWAYS */}
        {activeTab === 'runways' && (
            <div className="space-y-5 animate-fadeIn">
                <RunwaysList airport={airport} bestRunwayInfo={bestRunwayInfo} />

                {/* Crosswind Calculator */}
                <div>
                    <div className="flex items-center gap-2 mb-3 px-1">
                        <Wind size={16} className="text-sky-600 dark:text-sky-400" />
                        <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">Runway Wind Component Calculator</h3>
                    </div>

                    {windData ? (
                        <div className="ios-liquid-card rounded-2xl p-4">
                            <div className="flex justify-between items-center mb-4">
                                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Active Runway</label>
                                <select 
                                   className="text-xs font-bold font-mono ios-liquid-input rounded-xl px-3 py-1.5 text-slate-900 dark:text-white focus:outline-none"
                                   value={selectedRunway}
                                   onChange={(e) => setSelectedRunway(e.target.value)}
                                >
                                    {airport.runways.map(r => (
                                        <option key={r} value={r}>RWY {r}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-4 items-center">
                                {/* Visual Graphic */}
                                <div className="relative w-32 h-32 bg-white/25 dark:bg-slate-800/35 rounded-full border border-white/75 dark:border-slate-700 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.85)] flex items-center justify-center flex-shrink-0">
                                    <div className="absolute top-1.5 text-[9px] font-bold text-slate-500">N</div>
                                    <div className="absolute bottom-1.5 text-[9px] font-bold text-slate-500">S</div>
                                    <div className="absolute left-1.5 text-[9px] font-bold text-slate-500">W</div>
                                    <div className="absolute right-1.5 text-[9px] font-bold text-slate-500">E</div>
                                    
                                    {/* Compass SVG */}
                                    <svg width="100%" height="100%" viewBox="0 0 100 100" className="p-2">
                                        {crosswindData && (
                                            <>
                                                {/* Runway Bar */}
                                                <rect 
                                                    x="44" y="10" width="12" height="80" rx="3" 
                                                    fill="rgba(51, 65, 85, 0.72)"
                                                    stroke="rgba(255,255,255,0.65)"
                                                    strokeWidth="1"
                                                    transform={`rotate(${crosswindData.rwyHeading}, 50, 50)`} 
                                                />
                                                
                                                {/* Wind Arrow */}
                                                <g transform={`rotate(${windData.direction}, 50, 50)`}>
                                                    <line x1="50" y1="10" x2="50" y2="40" stroke="#0284c7" strokeWidth="3" markerEnd="url(#arrowhead)" />
                                                </g>
                                                <defs>
                                                    <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="0" refY="2" orient="auto">
                                                        <polygon points="0 0, 6 2, 0 4" fill="#0284c7" />
                                                    </marker>
                                                </defs>
                                            </>
                                        )}
                                    </svg>
                                </div>

                                {/* Stats */}
                                {crosswindData && (
                                    <div className="flex-1 space-y-3 py-1">
                                        <div>
                                            <div className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">Surface Wind</div>
                                            <div className="text-lg font-mono font-extrabold text-slate-900 dark:text-white">
                                                {windData.isVrb ? 'VRB' : windData.direction.toString().padStart(3, '0')}° · {windData.speed}
                                                {windData.gust > 0 ? `G${windData.gust}` : ''} kt
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="bg-white/25 dark:bg-slate-800/35 p-2.5 rounded-xl border border-white/70 dark:border-slate-700">
                                                <div className="text-[10px] text-slate-600 dark:text-slate-300 font-semibold">Crosswind</div>
                                                <div className="text-sm font-mono font-bold text-slate-900 dark:text-white">{crosswindData.crosswind} kt</div>
                                            </div>
                                            <div className={`p-2.5 rounded-xl border ${crosswindData.isTailwind ? 'bg-rose-500/15 border-rose-300/60' : 'bg-emerald-500/15 border-emerald-300/60'}`}>
                                                <div className={`text-[10px] font-semibold ${crosswindData.isTailwind ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                                                    {crosswindData.isTailwind ? 'Tailwind' : 'Headwind'}
                                                </div>
                                                <div className={`text-sm font-mono font-bold ${crosswindData.isTailwind ? 'text-rose-800 dark:text-rose-200' : 'text-emerald-800 dark:text-emerald-200'}`}>
                                                    {Math.abs(crosswindData.headwind)} kt
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center p-5 text-slate-500 dark:text-slate-400 text-xs ios-liquid-card rounded-2xl">
                            Active wind observation unavailable for calculation.
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* TAB: REMARKS */}
        {activeTab === 'notam' && (() => {
            const remarksList = remarks 
                ? (remarks.includes('\n') ? remarks.split('\n') : remarks.split(/;\s+/))
                    .map(line => line.trim().replace(/^[\s\-\*•\d\.\)]+/, '').trim())
                    .filter(line => line.length > 0 && line !== '-')
                : [];

            return (
                <div className="flex flex-col h-full animate-fadeIn space-y-3">
                    <div className="px-1 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Info size={16} className="text-sky-600 dark:text-sky-400" />
                            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200">Airport Remarks (FAA Form 5010)</h3>
                        </div>
                        {remarksSource && !loadingRemarks && (
                            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                {remarksSource === 'local' ? 'Chart Supplement DB' : 'Live Grounded'}
                            </span>
                        )}
                    </div>

                    <div className="space-y-4">
                        {loadingRemarks ? (
                            <div className="ios-liquid-card p-5 rounded-2xl space-y-3 animate-pulse">
                                <div className="h-4 bg-white/60 dark:bg-slate-700 rounded w-3/4"></div>
                                <div className="h-4 bg-white/60 dark:bg-slate-700 rounded w-1/2"></div>
                                <div className="h-4 bg-white/60 dark:bg-slate-700 rounded w-5/6"></div>
                            </div>
                        ) : remarksError ? (
                            <div className="flex flex-col items-center justify-center h-44 text-center p-6 ios-liquid-card rounded-2xl">
                                <Info size={28} className="text-slate-400 mb-2" />
                                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">{remarksError}</p>
                            </div>
                        ) : remarksList.length > 0 ? (
                            <div className="space-y-3">
                                <div className="ios-liquid-card rounded-2xl p-5">
                                    <ul className="space-y-3">
                                        {remarksList.map((item, idx) => (
                                            <li key={idx} className="flex gap-3 items-start text-xs leading-relaxed text-slate-700 dark:text-slate-200 font-medium border-b border-slate-200/50 dark:border-slate-700/50 last:border-0 pb-2.5 last:pb-0">
                                                <span className="text-sky-500 font-bold text-sm leading-none select-none mt-0.5">·</span>
                                                <span className="flex-1 whitespace-pre-wrap break-words">{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                
                                <div className="p-3.5 ios-liquid-card rounded-2xl text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-2.5 leading-relaxed">
                                    <Lightbulb size={14} className="text-sky-600 dark:text-sky-400 flex-shrink-0 mt-0.5" />
                                    <span>Published FAA Form 5010 Chart Supplement remarks for preflight briefing and instructor reference.</span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-44 text-center p-6 ios-liquid-card rounded-2xl">
                                <Info size={28} className="text-slate-400 mb-2" />
                                <span className="text-xs text-slate-500">No remarks published for this location.</span>
                            </div>
                        )}
                    </div>
                </div>
            );
            })()}

      </div>

      {/* Quick Scroll-to-Top Floating Button */}
      {showScrollTop && (
        <button
          type="button"
          onClick={() => scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          className="absolute bottom-[max(1.25rem,calc(env(safe-area-inset-bottom)+0.75rem))] right-4 z-30 ios-liquid-pill px-3 py-2 rounded-full text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
          title="Back to top"
        >
          <ArrowUpCircle size={15} className="text-sky-600 dark:text-sky-400" />
          <span>Top</span>
        </button>
      )}
    </div>
  );
};

export default AirportDetails;
