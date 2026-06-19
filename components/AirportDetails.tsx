
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Airport, CardType, WeatherData, FuelType, NotamData } from '../types';
import { fetchWeather } from '../services/aviationService';
import { auth, signInWithGoogle, logOut } from '../services/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { X, Phone, AlertTriangle, Fuel, MapPin, CloudSun, RefreshCw, Wind, ArrowUpCircle, Droplets, Clock, WifiOff, Info, User, Send, MessageCircle, AlertCircle, Lightbulb, CornerDownRight, Trash2, Loader2, EyeOff, HelpCircle, Mail, Radio, Sparkles, ExternalLink, LogIn, Calculator, Star } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import Markdown from 'react-markdown';
import { REMARKS_DATABASE } from './remarksDb';
import { WeatherBoard } from './WeatherBoard';
import { FuelPriceTrendChart } from './FuelPriceTrendChart';

interface AirportDetailsProps {
  airport: Airport;
  onClose: () => void;
  onOpenFuelLog: () => void;
  weatherMap: Record<string, WeatherData>;
  notamMap?: Record<string, NotamData>;
  isRefreshingFuel?: boolean;
  onRefreshFuelPrices?: () => Promise<void>;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

type Tab = 'info' | 'weather' | 'notam';

const AirportDetails: React.FC<AirportDetailsProps> = ({ 
  airport, 
  onClose, 
  onOpenFuelLog, 
  weatherMap, 
  notamMap,
  isRefreshingFuel = false,
  onRefreshFuelPrices,
  isFavorite = false,
  onToggleFavorite
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Crosswind Calculator State
  const [selectedRunway, setSelectedRunway] = useState<string>(airport.runways[0] || '18/36');

  // Airport Fuel Price Estimator State
  const [estFuelType, setEstFuelType] = useState<string>(airport.fuelTypes[0] || '');
  const [estGallons, setEstGallons] = useState<string>('50');
  const [estCustomPrice, setEstCustomPrice] = useState<string>('');
  const [estUseCustom, setEstUseCustom] = useState<boolean>(false);

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

  const fetchRemarksLive = useCallback(async (icao: string) => {
      setLoadingRemarks(true);
      setRemarksError(null);
      try {
          const key = process.env.GEMINI_API_KEY;
          if (!key) {
              throw new Error("No Gemini API key available.");
          }
          const ai = new GoogleGenAI({ apiKey: key });
          
          const prompt = `You are an expert aviation tool. Find the official, actual FAA Form 5010 (Chart Supplement) "Other Remarks" or airport operational remarks for the airport code "${icao}".
Use Google Search grounding to retrieve real, exact remarks (e.g. traffic patterns, helipads, wildlife hazards, noise abatement, or restrictions).
Format the remarks as a clean, direct list of bullet points.
Return ONLY the bulleted points, with each point on a standalone line starting with a dash (e.g. "- GA ACFT NOT PERMITTED ON ACR RAMP.").
Do not include any greeting, preamble, or markdown surrounding text. If no remarks can be found, reply exactly with "- NoRemarksPublished"`;

          const response = await ai.models.generateContent({
              model: 'gemini-3.5-flash',
              contents: prompt,
              config: {
                  tools: [{ googleSearch: {} }],
              }
          });
          
          const text = response.text || "";
          if (text.includes("NoRemarksPublished") || text.trim() === "") {
              setRemarksError("No remarks published for this location.");
          } else {
              setRemarks(text.trim());
              setRemarksSource('gemini');
          }
      } catch (error) {
          console.error("Gemini Search Grounding Error", error);
          setRemarksError("No remarks published for this location. (Live search unavailable)");
      } finally {
          setLoadingRemarks(false);
      }
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

      // 2. Fallback to Gemini Grounded Live search (acts as robust free FAA Form 5010 API)
      if (process.env.GEMINI_API_KEY) {
          fetchRemarksLive(icao);
      } else {
          setRemarksError("No remarks published for this location.");
          setLoadingRemarks(false);
      }
  }, [fetchRemarksLive]);

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

  const loadWeather = useCallback(async (forceRefresh: boolean = false) => {
      const weatherId = airport.weatherSource || airport.id;
      
      // If we have it in the pre-fetched map and not forcing refresh, use it instantly
      if (!forceRefresh && weatherMap && weatherMap[weatherId]) {
          setWeather(weatherMap[weatherId]);
          setLoadingWeather(false); // Instantly hide loading state
          
          // If TAF is not fetched, we might want to fetch it now for the details view
          if (weatherMap[weatherId].taf === 'TAF NOT FETCHED') {
              try {
                  const fullWeather = await fetchWeather(weatherId);
                  setWeather(fullWeather);
              } catch (e) {
                  console.error("Weather load failed", e);
              }
          }
      } else {
          setLoadingWeather(true);
          try {
              const w = await fetchWeather(weatherId);
              setWeather(w);
          } catch (e) {
              console.error("Weather load failed", e);
          } finally {
              setLoadingWeather(false);
          }
      }
  }, [airport.id, airport.weatherSource, weatherMap]);

  useEffect(() => {
    if (airport.runways.length > 0) {
      setSelectedRunway(airport.runways[0]);
    }
  }, [airport]);

  useEffect(() => {
    loadWeather();
  }, [loadWeather]);

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


  const getFlightCategoryColor = (cat: string) => {
    switch (cat) {
      case 'VFR': return 'bg-green-500 border-green-600';
      case 'MVFR': return 'bg-blue-500 border-blue-600';
      case 'IFR': return 'bg-red-500 border-red-600';
      case 'LIFR': return 'bg-purple-500 border-purple-600';
      default: return 'bg-slate-400 border-slate-500';
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
          return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 overflow-hidden relative font-sans">
      
      {/* --- HEADER --- */}
      <div className="p-5 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-start flex-shrink-0">
        <div>
          <div className="flex items-center gap-3">
             <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {airport.id}
             </h2>
             {weather && (
              <div 
                className="flex items-center justify-center p-1"
                title={`Current Flight Category: ${weather.flightCategory}`}
              >
                {weather.flightCategory === 'UNKNOWN' ? (
                    <div className="h-3 w-3 rounded-full bg-slate-300 border border-slate-400" title="WX N/A" />
                ) : (
                    <div className={`h-3 w-3 rounded-full border shadow-sm ${getFlightCategoryColor(weather.flightCategory)}`} />
                )}
              </div>
            )}
            
            {airport.weatherSource && (
                 <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded flex items-center gap-1" title={`Weather from ${airport.weatherSource}`}>
                    <CloudSun size={10} /> {airport.weatherSource}
                 </span>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{airport.name}</p>
          <div className="flex items-center text-xs text-slate-400 dark:text-slate-500 mt-1">
            <MapPin size={12} className="mr-1" />
            {airport.city}, {airport.state}
          </div>
        </div>
        <div className="flex items-center gap-1 -mr-2">
            <button 
               onClick={() => onToggleFavorite && onToggleFavorite(airport.id)} 
               className={`p-2 rounded-full transition-all duration-300 flex items-center gap-1 ${
                 isFavorite 
                   ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30' 
                   : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30'
               }`} 
               title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            >
                <Star size={20} className={isFavorite ? "fill-amber-500 text-amber-500 animate-pulse-once" : ""} />
            </button>
            <a 
               href={`https://www.airnav.com/airport/${airport.id}`} 
               target="_blank" 
               rel="noopener noreferrer" 
               className="p-2 text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 rounded-full transition-colors flex items-center gap-1" 
               title="View on AirNav"
            >
                <ExternalLink size={20} />
            </a>
            <button onClick={onOpenFuelLog} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors flex items-center gap-1" title="Log Fuel">
                <Fuel size={20} />
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X size={24} />
            </button>
        </div>
      </div>

      {/* --- TABS --- */}
      <div className="flex border-b border-gray-200 dark:border-slate-800">
        <button 
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors ${activeTab === 'info' ? 'border-slate-800 dark:border-slate-200 text-slate-800 dark:text-slate-200' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
        >
            FBO & Info
        </button>
        <button 
            onClick={() => setActiveTab('weather')}
            className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors ${activeTab === 'weather' ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
        >
            Weather
        </button>
        <button 
            onClick={() => setActiveTab('notam')}
            className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${activeTab === 'notam' ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
        >
            Remarks
        </button>
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 dark:bg-slate-900/50">
        
        {/* TAB: INFO */}
        {activeTab === 'info' && (
            <div className="space-y-4 animate-fadeIn">
                {airport.cardRules.critical && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex gap-3 items-start">
                    <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm text-red-800 font-bold uppercase tracking-wide">Restriction</p>
                        <p className="text-sm text-red-700 font-medium">{airport.cardRules.notes}</p>
                    </div>
                </div>
                )}

                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">FBO Provider</span>
                            <p className="text-base font-bold text-slate-800">{airport.fbo}</p>
                        </div>
                        <div className="text-right flex-1 ml-4">
                            <div className="flex flex-col items-end mb-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Fuel & Contact</span>
                                {airport.fuelPricesLastUpdated ? (
                                    <span className="text-[8px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-1 py-0.5 rounded mt-0.5 border border-emerald-100 dark:border-emerald-900/40 flex items-center gap-1">
                                        <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span> Live (Fetched {formatLastUpdated(airport.fuelPricesLastUpdated)})
                                    </span>
                                ) : (
                                    <span className="text-[8px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950/20 px-1 py-0.5 rounded mt-0.5 border border-slate-100 dark:border-slate-800/40">
                                        Original DB
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-col gap-2">
                                {airport.fuelTypes.map(f => (
                                    <div key={f} className="flex items-center justify-end gap-2 border-b border-slate-50 last:border-0 pb-1 last:pb-0">
                                        <div className="flex flex-col items-end">
                                            <div className="flex items-center gap-2">
                                                 <span className="flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                                    <Droplets size={10} className={f === FuelType.LL100 ? 'text-green-500' : 'text-blue-500'} />
                                                    {f}
                                                 </span>
                                                 {airport.fuelPhones && airport.fuelPhones[f] && (
                                                     <a href={`tel:${airport.fuelPhones[f]}`} className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded transition-colors">
                                                        <Phone size={10} />
                                                        <span>{airport.fuelPhones[f]}</span>
                                                     </a>
                                                 )}
                                            </div>
                                        </div>
                                        <span className="text-sm font-bold text-slate-800 font-mono w-16 text-right">
                                            {airport.fuelPrices && airport.fuelPrices[f] ? `$${airport.fuelPrices[f].toFixed(2)}` : 'N/A'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            {/* Auto-updated every two hours */}
                        </div>
                    </div>

                    <div className="pt-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Required Card</span>
                        
                        {airport.cardRules.byFuelType ? (
                            <div className="mt-1 space-y-2">
                                {Object.entries(airport.cardRules.byFuelType).map(([fuelType, card]) => (
                                    <div key={fuelType} className={`p-3 rounded border flex justify-between items-center ${
                                        card === CardType.WHITE_CARD ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
                                    }`}>
                                         <div>
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-0.5">{fuelType}</span>
                                            <span className={`text-base font-bold ${
                                                card === CardType.WHITE_CARD ? 'text-red-700' : 'text-blue-700'
                                            }`}>
                                                {card}
                                            </span>
                                         </div>
                                    </div>
                                ))}
                                <p className="text-xs text-slate-600 mt-1 italic">
                                    {airport.cardRules.notes}
                                </p>
                            </div>
                        ) : (
                            <div className={`mt-1 p-4 rounded border ${
                                airport.cardRules.primary === CardType.WHITE_CARD ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
                            }`}>
                                <p className={`text-lg font-bold ${
                                    airport.cardRules.primary === CardType.WHITE_CARD ? 'text-red-700' : 'text-blue-700'
                                }`}>
                                    {airport.cardRules.primary === CardType.WHITE_CARD ? `White Card (${airport.fbo})` : airport.cardRules.primary}
                                </p>
                                <p className="text-xs text-slate-600 mt-1">
                                    {airport.cardRules.notes || "Standard fueling procedures apply."}
                                </p>

                                {/* New Fueling Notes Section */}
                                {airport.cardRules.fuelingNotes && (
                                    <div className="mt-3 pt-3 border-t border-black/5">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Droplets size={12} className="text-slate-500" />
                                            <p className="text-[10px] font-bold text-slate-500 uppercase">Fueling Notes</p>
                                        </div>
                                        <p className="text-xs text-slate-700 italic bg-white/50 p-2 rounded">
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
                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4 shadow-sm">
                        <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-2">
                            <Calculator size={16} className="text-amber-500" />
                            <h4 className="text-xs font-black text-slate-700 dark:text-slate-350 uppercase tracking-wider">
                                Airport Est. Fuel Price Calculator
                            </h4>
                        </div>

                        {/* Choices - Stacked vertically for optimal responsive spacing */}
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
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
                                                className={`py-1.5 px-3 text-xs font-bold rounded-lg border text-left flex justify-between items-center transition-all ${
                                                    estFuelType === t
                                                    ? 'bg-amber-500 border-amber-600 text-white shadow-sm'
                                                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300'
                                                }`}
                                            >
                                                <span>{t}</span>
                                                <span className="font-mono text-[10px]">
                                                    {rate ? `$${rate.toFixed(2)}` : 'N/A'}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="space-y-1">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                                        Gallons
                                    </span>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            step="any"
                                            value={estGallons}
                                            onChange={(e) => setEstGallons(e.target.value)}
                                            placeholder="0.0"
                                            className="flex-1 min-w-0 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none"
                                        />
                                        <div className="flex gap-1 shrink-0 items-center">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const current = parseFloat(estGallons || '0');
                                                    const newVal = Math.max(0, current - 0.5);
                                                    setEstGallons(Number(newVal.toFixed(1)).toString());
                                                }}
                                                className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 text-[9px] font-bold h-7 px-2.5 rounded-md transition-colors"
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
                                                className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 text-[9px] font-bold h-7 px-2.5 rounded-md transition-colors"
                                                title="Increase by 0.5G"
                                            >
                                                +0.5
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-1 overflow-x-auto py-0.5">
                                    {['10', '20', '25', '30', '35', '40', '50'].map((amt) => (
                                        <button
                                            key={amt}
                                            type="button"
                                            onClick={() => setEstGallons(amt)}
                                            className="bg-slate-200 hover:bg-slate-305 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-350 text-[9px] font-bold px-2 py-0.5 rounded transition-colors whitespace-nowrap"
                                        >
                                            {amt}G
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Custom Price Toggle */}
                        <div className="border-t border-slate-200/55 dark:border-slate-800 pt-3">
                            <label className="flex items-center gap-2 cursor-pointer mb-2">
                                <input
                                    type="checkbox"
                                    checked={estUseCustom}
                                    onChange={(e) => {
                                        setEstUseCustom(e.target.checked);
                                    }}
                                    className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 h-3 w-3"
                                />
                                <span className="text-[9px] uppercase font-bold text-slate-400 select-none tracking-wide">
                                    Override Price Per Gallon
                                </span>
                            </label>

                            {estUseCustom && (
                                <div className="flex items-center gap-1.5 animate-fade-in pl-1">
                                    <span className="text-xs font-bold text-slate-400">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={estCustomPrice}
                                        onChange={(e) => setEstCustomPrice(e.target.value)}
                                        placeholder="0.00"
                                        className="w-24 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none"
                                    />
                                    <span className="text-[10px] text-slate-400 font-bold">/ gal</span>
                                </div>
                            )}
                        </div>

                        {/* Calculated Output */}
                        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-lg p-3.5 flex flex-col items-center justify-center text-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                                Est. Total Cost
                            </span>
                            <span className="text-2xl font-black text-amber-400 font-mono tracking-tight">
                                ${finalEstCost.toLocaleString([], { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-[9px] text-slate-300 mt-1 font-medium bg-white/10 px-1.5 py-0.5 rounded">
                                {estUseCustom ? `Custom Override: $${parseFloat(estCustomPrice || '0').toFixed(2)}/gal` : estPricePerG ? (airport.fuelPricesLastUpdated ? `Live rate: $${estPricePerG}/gal` : `DB rate: $${estPricePerG}/gal`) : 'No price data'}
                            </span>
                        </div>
                    </div>

                    {/* Runway Info */}
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-2">Runways</span>
                        <div className="flex flex-col gap-2">
                            {airport.runways.map(r => {
                                // Check if this runway contains the "best" direction
                                const isBest = bestRunwayInfo?.parent === r;
                                const bestSide = isBest ? bestRunwayInfo?.id : null;
                                const length = airport.runwayLengths?.[r];

                                return (
                                    <div key={r} className={`flex items-center justify-between border px-3 py-2 rounded text-xs font-bold ${
                                        isBest ? 'bg-green-50 border-green-200 text-green-900 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-700'
                                    }`}>
                                        <div className="flex items-center gap-2">
                                            <ArrowUpCircle size={14} className={isBest ? 'text-green-600' : 'text-slate-400'} />
                                            <span className="text-sm">{r}</span>
                                        </div>
                                        
                                        <div className="flex items-center gap-3">
                                            {isBest && bestSide && (
                                                <span className="text-[10px] uppercase font-black tracking-wider text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
                                                    Best: {bestSide}
                                                </span>
                                            )}
                                            {length ? (
                                                <span className="font-mono text-slate-500">{length.toLocaleString()} ft</span>
                                            ) : (
                                                <span className="text-slate-400 italic">Len N/A</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {airport.runways.length === 0 && (
                                <span className="text-xs text-slate-400 italic">No runway information available</span>
                            )}
                        </div>
                    </div>

                    {/* Frequencies Info */}
                    {airport.frequencies && airport.frequencies.length > 0 && (
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-2">Frequencies</span>
                            <div className="flex flex-col gap-2">
                                {airport.frequencies.map((freq, index) => (
                                    <div key={index} className="flex items-center justify-between border px-3 py-2 rounded text-xs font-bold bg-slate-50 border-slate-200 text-slate-700">
                                        <div className="flex items-center gap-2">
                                            <Radio size={14} className="text-slate-400" />
                                            <span className="text-sm">{freq.name}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono text-slate-800">{freq.freq}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <a href={`tel:${airport.phone}`} className="flex items-center justify-center w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded font-bold text-sm transition-colors gap-2 shadow-sm mt-2">
                        <Phone size={18} />
                        Call Main FBO: {airport.phone}
                    </a>
                </div>

                {/* SUU Finance Contacts Section */}
                <div className="bg-slate-100 rounded-lg p-4 border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                        <HelpCircle size={14} />
                        Fuel & Finance Support
                    </h4>
                    <div className="space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-bold text-slate-800">Katie Baca</p>
                                <p className="text-[10px] text-slate-500 uppercase font-bold">Business Manager</p>
                            </div>
                            <div className="text-right">
                                <a href="tel:435-922-5107" className="block text-xs font-bold text-blue-600 hover:underline">
                                    (435) 922-5107
                                </a>
                                <a href="mailto:katiebaca@suu.edu" className="block text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center justify-end gap-1">
                                    <Mail size={10} />
                                    katiebaca@suu.edu
                                </a>
                            </div>
                        </div>

                        <div className="flex justify-between items-start pt-3 border-t border-slate-200">
                            <div>
                                <p className="text-sm font-bold text-slate-800">Elon Jun</p>
                                <p className="text-[10px] text-slate-500 uppercase font-bold">Finance Assistant</p>
                            </div>
                            <div className="text-right">
                                <a href="tel:435-681-1849" className="block text-xs font-bold text-blue-600 hover:underline">
                                    (435) 681 - 1849
                                </a>
                                <a href="mailto:suenghunjun@suu.edu" className="block text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center justify-end gap-1">
                                    <Mail size={10} />
                                    suenghunjun@suu.edu
                                </a>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-slate-200">
                        <a 
                            href="https://docs.google.com/forms/d/e/1FAIpQLScmBQPQeOxgMnq4UEvxzg5HwEe-x2Owj3kVpV4pWbpXrxhoHg/viewform" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex items-center justify-center w-full py-2 bg-white text-red-600 hover:bg-red-50 border border-red-200 rounded font-bold text-xs transition-colors gap-2 shadow-sm"
                        >
                            <AlertCircle size={14} />
                            Report Fuel/Card Error
                        </a>
                    </div>
                </div>
            </div>
        )}

        {/* TAB: WEATHER */}
        {activeTab === 'weather' && (
            <div className="space-y-4 animate-fadeIn">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Metar & Taf</h3>
                    <div className="flex items-center gap-3">
                        {/* Last Updated Badge */}
                        {weather?.lastUpdated && (
                             <div className="flex items-center gap-1.5 bg-blue-50 px-2 py-1 rounded-full border border-blue-100" title="Last fetched from API">
                                <RefreshCw size={10} className="text-blue-500" />
                                <span className="text-[10px] font-bold text-blue-700">
                                    Updated: {new Date(weather.lastUpdated).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                             </div>
                        )}
                        {/* Observation Time Badge */}
                        {weather?.observationTime && (
                             <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-full border border-slate-200">
                                <Clock size={10} className="text-slate-500" />
                                <span className="text-[10px] font-bold text-slate-600">
                                    Observed: {formatObsTime(weather.observationTime)}
                                </span>
                             </div>
                        )}
                        <button onClick={() => loadWeather(true)} className={`text-blue-500 hover:text-blue-700 transition-colors ${loadingWeather ? 'animate-spin' : ''}`}>
                            <RefreshCw size={14} />
                        </button>
                    </div>
                </div>

                {/* OFFLINE INDICATOR */}
                {isOffline && (
                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex gap-3 items-center mb-2">
                         <WifiOff className="h-4 w-4 text-amber-500 flex-shrink-0" />
                         <div>
                            <p className="text-xs font-bold text-amber-700">Offline Mode</p>
                            {weather?.lastUpdated && (
                                <p className="text-[10px] text-amber-600">
                                    Last Updated: {new Date(weather.lastUpdated).toLocaleTimeString()}
                                </p>
                            )}
                         </div>
                    </div>
                )}

                {airport.weatherSource && (
                    <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex gap-3 items-center mb-2">
                         <Info className="h-4 w-4 text-blue-500 flex-shrink-0" />
                         <p className="text-xs text-blue-700">
                             <strong>Note:</strong> Weather reported from nearest station <strong>{airport.weatherSource}</strong>.
                         </p>
                    </div>
                )}
                
                {loadingWeather ? (
                    <div className="space-y-3 animate-pulse">
                        <div className="h-20 bg-slate-200 rounded"></div>
                        <div className="h-20 bg-slate-200 rounded"></div>
                    </div>
                ) : weather ? (
                    <>
                        <WeatherBoard weather={weather} airport={airport} />
                    
                    {/* Crosswind Calculator */}
                    <div className="mt-6 pt-6 border-t border-slate-200">
                        <div className="flex items-center gap-2 mb-4">
                            <Wind size={18} className="text-slate-700" />
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Crosswind Calc</h3>
                        </div>

                        {windData ? (
                            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                     <label className="text-xs font-bold text-slate-500">Runway</label>
                                     <select 
                                        className="text-sm font-bold bg-slate-100 border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
                                        value={selectedRunway}
                                        onChange={(e) => setSelectedRunway(e.target.value)}
                                     >
                                         {airport.runways.map(r => (
                                             <option key={r} value={r}>RWY {r}</option>
                                         ))}
                                     </select>
                                </div>

                                <div className="flex gap-4">
                                    {/* Visual Graphic */}
                                    <div className="relative w-32 h-32 bg-slate-50 rounded-full border border-slate-200 flex items-center justify-center flex-shrink-0">
                                        <div className="absolute top-1 text-[8px] font-bold text-slate-400">N</div>
                                        <div className="absolute bottom-1 text-[8px] font-bold text-slate-400">S</div>
                                        <div className="absolute left-1 text-[8px] font-bold text-slate-400">W</div>
                                        <div className="absolute right-1 text-[8px] font-bold text-slate-400">E</div>
                                        
                                        {/* Compass SVG */}
                                        <svg width="100%" height="100%" viewBox="0 0 100 100" className="p-2">
                                            {crosswindData && (
                                                <>
                                                    {/* Runway Bar */}
                                                    <rect 
                                                        x="44" y="10" width="12" height="80" rx="2" 
                                                        fill="#334155" 
                                                        transform={`rotate(${crosswindData.rwyHeading}, 50, 50)`} 
                                                    />
                                                    
                                                    {/* Wind Arrow */}
                                                    <g transform={`rotate(${windData.direction}, 50, 50)`}>
                                                        {/* Arrow pointing to center (FROM) */}
                                                        <line x1="50" y1="10" x2="50" y2="40" stroke="#ef4444" strokeWidth="3" markerEnd="url(#arrowhead)" />
                                                    </g>
                                                    <defs>
                                                        <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="0" refY="2" orient="auto">
                                                            <polygon points="0 0, 6 2, 0 4" fill="#ef4444" />
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
                                                <div className="text-[10px] text-slate-400 font-bold uppercase">Wind</div>
                                                <div className="text-lg font-mono font-bold text-slate-800">
                                                    {windData.isVrb ? 'VRB' : windData.direction.toString().padStart(3, '0')}@{windData.speed}
                                                    {windData.gust > 0 ? `G${windData.gust}` : ''}kt
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                                                     <div className="text-[9px] text-slate-400 font-bold uppercase">X-Wind</div>
                                                     <div className="text-sm font-mono font-bold text-slate-800">{crosswindData.crosswind}kt</div>
                                                </div>
                                                <div className={`p-2 rounded border ${crosswindData.isTailwind ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                                                     <div className={`text-[9px] font-bold uppercase ${crosswindData.isTailwind ? 'text-red-400' : 'text-green-600'}`}>
                                                        {crosswindData.isTailwind ? 'Tailwind' : 'Headwind'}
                                                     </div>
                                                     <div className={`text-sm font-mono font-bold ${crosswindData.isTailwind ? 'text-red-700' : 'text-green-700'}`}>
                                                        {Math.abs(crosswindData.headwind)}kt
                                                     </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center p-4 text-slate-400 text-sm bg-slate-50 rounded">
                                Wind data unavailable for calculation.
                            </div>
                        )}
                    </div>

                    {/* 7-Day Forecast */}
                    <div className="mt-6">
                        <div className="flex items-center gap-2 mb-3">
                            <CloudSun size={16} className="text-slate-500" />
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">7-Day Aerial Forecast</h3>
                        </div>
                        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
                            {loadingForecast ? (
                                <div className="flex flex-col items-center justify-center py-6 text-slate-500 gap-3">
                                    <Loader2 size={20} className="animate-spin text-blue-500" />
                                    <span className="text-xs font-medium">Fetching forecast...</span>
                                </div>
                            ) : forecastError ? (
                                <div className="flex flex-col items-center justify-center py-4 text-center">
                                    <AlertCircle size={24} className="text-red-400 mb-2" />
                                    <p className="text-xs text-slate-600">{forecastError}</p>
                                    <button 
                                        onClick={fetchForecast}
                                        className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded transition-colors"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            ) : forecast ? (
                                <div className="prose prose-sm max-w-none prose-p:leading-snug prose-p:text-slate-600 prose-li:text-slate-600 prose-headings:text-slate-800 prose-strong:text-slate-700 text-xs">
                                    <Markdown>{forecast}</Markdown>
                                </div>
                            ) : (
                                <div className="text-center py-6 text-slate-400 text-xs">Forecast unavailable</div>
                            )}
                        </div>
                    </div>
                    </>
                ) : (
                    <div className="text-center py-8 text-slate-400">Weather unavailable</div>
                )}
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
                <div className="flex flex-col h-full animate-fadeIn">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="flex items-center gap-2">
                            <Info size={18} className="text-blue-500" />
                            <h3 className="font-bold text-slate-800 dark:text-slate-200">Airport Remarks (Form 5010)</h3>
                        </div>
                        {remarksSource && !loadingRemarks && (
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${
                                    remarksSource === 'local' 
                                    ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' 
                                    : 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800'
                                }`}>
                                    {remarksSource === 'local' ? 'Local DB' : 'Live Grounded AI'}
                                </span>
                                {process.env.GEMINI_API_KEY && (
                                    <button
                                        onClick={() => fetchRemarksLive(airport.id)}
                                        className="p-1 px-2 rounded bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 shadow-xs"
                                        title="Fetch live official remarks using Google Search Grounding"
                                    >
                                        <Sparkles size={11} className="text-purple-500" />
                                        <span>Sync Live</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
                        {loadingRemarks ? (
                            <div className="space-y-3 w-full">
                                <div className="flex items-center justify-center mb-4 text-slate-500 gap-2">
                                    <Loader2 size={16} className="animate-spin text-blue-500" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Syncing airport remarks...</span>
                                </div>
                                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-xl shadow-xs space-y-3 animate-pulse">
                                    <div className="h-4 bg-slate-150 dark:bg-slate-700 rounded w-3/4"></div>
                                    <div className="h-4 bg-slate-150 dark:bg-slate-700 rounded w-1/2"></div>
                                    <div className="h-4 bg-slate-150 dark:bg-slate-700 rounded w-5/6"></div>
                                </div>
                            </div>
                        ) : remarksError ? (
                            <div className="flex flex-col items-center justify-center h-48 text-center p-6 bg-white dark:bg-slate-800/10 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                                <Info size={32} className="text-slate-400 mb-2" />
                                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium mb-4">{remarksError}</p>
                                {process.env.GEMINI_API_KEY && (
                                    <button
                                        onClick={() => fetchRemarksLive(airport.id)}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                                    >
                                        <Sparkles size={14} />
                                        <span>Fetch Live FAA Remarks</span>
                                    </button>
                                )}
                            </div>
                        ) : remarksList.length > 0 ? (
                            <div className="space-y-4">
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
                                    <div className="border-b border-slate-100 dark:border-slate-800/70 pb-2 mb-4">
                                        <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">Other Remarks</h4>
                                    </div>
                                    <ul className="space-y-3.5">
                                        {remarksList.map((item, idx) => (
                                            <li key={idx} className="flex gap-3 items-start text-[13px] leading-relaxed text-slate-700 dark:text-slate-300 font-sans font-medium">
                                                <span className="text-blue-500 font-bold text-base leading-none select-none mt-0.5">•</span>
                                                <span className="flex-1 whitespace-pre-wrap break-words">{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                
                                <div className="p-3 bg-blue-50/50 dark:bg-blue-950/15 border border-blue-100 dark:border-blue-900/30 rounded-xl text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2 leading-relaxed">
                                    <Lightbulb size={13} className="text-blue-500 flex-shrink-0 mt-0.5" />
                                    <span>These entries represent actual Form 5010 Chart Supplement records to assist flight crews and flight instructors in executing airport operations safely.</span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-48 text-center p-6 bg-white dark:bg-slate-800/10 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                                <Info size={32} className="text-slate-400 mb-2" />
                                <span className="text-sm text-slate-500 mb-4">No remarks published for this location.</span>
                                {process.env.GEMINI_API_KEY && (
                                    <button
                                        onClick={() => fetchRemarksLive(airport.id)}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                                    >
                                        <Sparkles size={14} />
                                        <span>Sync Remarks via AI Grounding</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            );
            })()}

      </div>
    </div>
  );
};

export default AirportDetails;
