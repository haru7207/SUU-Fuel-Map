import React, { useState, useEffect, useMemo } from 'react';
import { WeatherData, Airport } from '../types';
import { fetchWeather } from '../services/aviationService';
import { 
  CloudSun, 
  Wind, 
  Thermometer, 
  Search, 
  Copy, 
  Check, 
  X, 
  RefreshCw, 
  Eye, 
  Compass, 
  Gauge, 
  Cloud, 
  FileText, 
  Sparkles,
  ArrowUpRight,
  Filter
} from 'lucide-react';

interface MetarTafModalProps {
  isOpen: boolean;
  onClose: () => void;
  airports: Airport[];
  weatherMap: Record<string, WeatherData>;
  selectedAirportId?: string | null;
  onSelectAirport?: (id: string) => void;
}

export const MetarTafModal: React.FC<MetarTafModalProps> = ({
  isOpen,
  onClose,
  airports,
  weatherMap,
  selectedAirportId,
  onSelectAirport
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('KCDC');
  const [activeAirportId, setActiveAirportId] = useState<string>('KCDC');
  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'VFR' | 'MVFR' | 'IFR' | 'LIFR'>('ALL');
  const [copiedMetar, setCopiedMetar] = useState<boolean>(false);
  const [copiedTaf, setCopiedTaf] = useState<boolean>(false);

  // Initialize selected airport when modal opens or selectedAirportId changes
  useEffect(() => {
    if (selectedAirportId) {
      setActiveAirportId(selectedAirportId);
      setSearchQuery(selectedAirportId);
    } else if (!activeAirportId) {
      setActiveAirportId('KCDC');
      setSearchQuery('KCDC');
    }
  }, [selectedAirportId, isOpen]);

  // Fetch or update weather when activeAirportId changes
  useEffect(() => {
    if (!isOpen || !activeAirportId) return;

    const id = activeAirportId.toUpperCase().trim();
    // Check if we already have it in weatherMap
    const mapMatch = weatherMap[id] || weatherMap[id.replace(/^K/, '')];
    
    if (mapMatch && mapMatch.metar && !mapMatch.metar.includes('ERROR') && !mapMatch.metar.includes('Unavailable')) {
      setCurrentWeather(mapMatch);
      setError(null);
    } else {
      // Fetch live weather via aviationService
      loadLiveWeather(id);
    }
  }, [activeAirportId, isOpen, weatherMap]);

  const loadLiveWeather = async (id: string, force = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchWeather(id, force);
      setCurrentWeather(data);
      if (!data.metar || data.metar.includes('ERROR') || data.metar.includes('Unavailable')) {
        setError(`No active METAR reported for station ${id}.`);
      }
    } catch (err) {
      console.warn(`Failed to fetch METAR/TAF for ${id}`, err);
      setError(`Could not fetch METAR/TAF for ${id}. Check network or station ID.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const cleanId = searchQuery.trim().toUpperCase();
    setActiveAirportId(cleanId);
  };

  const handleCopy = (text: string, type: 'metar' | 'taf') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === 'metar') {
      setCopiedMetar(true);
      setTimeout(() => setCopiedMetar(false), 2000);
    } else {
      setCopiedTaf(true);
      setTimeout(() => setCopiedTaf(false), 2000);
    }
  };

  // Helper flight category styling
  const getCategoryBadgeClass = (cat?: string) => {
    switch (cat) {
      case 'VFR':
        return 'bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/20';
      case 'MVFR':
        return 'bg-blue-600 text-white border-blue-700 shadow-blue-600/20';
      case 'IFR':
        return 'bg-red-600 text-white border-red-700 shadow-red-600/20';
      case 'LIFR':
        return 'bg-purple-600 text-white border-purple-700 shadow-purple-600/20';
      default:
        return 'bg-slate-500 text-white border-slate-600';
    }
  };

  const getCategoryTextClass = (cat?: string) => {
    switch (cat) {
      case 'VFR':
        return 'text-emerald-600 dark:text-emerald-400';
      case 'MVFR':
        return 'text-blue-600 dark:text-blue-400';
      case 'IFR':
        return 'text-red-600 dark:text-red-400';
      case 'LIFR':
        return 'text-purple-600 dark:text-purple-400';
      default:
        return 'text-slate-600 dark:text-slate-400';
    }
  };

  // Calculate density altitude if temperature & altimeter exist
  const densityAlt = useMemo(() => {
    if (!currentWeather) return null;
    const temp = currentWeather.temperature;
    const altim = currentWeather.altimeter;
    const elev = currentWeather.elevation ? currentWeather.elevation * 3.28084 : 5000; // default elev if missing
    if (temp === undefined || altim === undefined) return null;

    const altimInHg = altim / 33.86389;
    const pa = elev + (29.92 - altimInHg) * 1000;
    const isaTemp = 15 - (elev / 1000) * 2;
    return Math.round(pa + 120 * (temp - isaTemp));
  }, [currentWeather]);

  // Filtered list of known local airports with weather status
  const weatherAirports = useMemo(() => {
    return airports.filter(a => {
      const w = weatherMap[a.weatherSource || a.id];
      if (categoryFilter === 'ALL') return true;
      if (!w) return false;
      return w.flightCategory === categoryFilter;
    });
  }, [airports, weatherMap, categoryFilter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/25 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div 
        className="w-full md:max-w-3xl ios-liquid-glass-heavy rounded-t-3xl md:rounded-[28px] overflow-hidden flex flex-col max-h-[90vh] md:max-h-[85vh] animate-slide-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="bg-white/15 dark:bg-slate-900/25 text-slate-900 dark:text-white px-5 py-4 flex items-center justify-between border-b border-white/50 dark:border-slate-800/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/15 text-sky-600 dark:text-sky-400 rounded-2xl border border-sky-400/30 shadow-2xs">
              <CloudSun size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">METAR & TAF Weather Station</h2>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-sky-500/15 text-sky-700 dark:text-sky-300 rounded-full border border-sky-500/25">
                  Live Aviation Weather
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                Search & inspect raw METARs, TAF forecasts, and flight category rules
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="ios-liquid-pill text-slate-600 hover:text-slate-900 dark:hover:text-white p-2 rounded-full transition-colors"
            title="Close Weather View"
          >
            <X size={18} />
          </button>
        </div>

        {/* Top Controls & Search Bar */}
        <div className="p-4 bg-white/10 dark:bg-slate-900/20 border-b border-white/45 dark:border-slate-800/60 flex flex-col sm:flex-row items-center gap-3 shrink-0">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-3 text-sky-600" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter ICAO or Station ID (e.g., KCDC, KSGU, KENV, KLAX)..."
              className="w-full pl-11 pr-24 py-2.5 ios-liquid-input rounded-2xl text-sm font-bold text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 bottom-1.5 px-3.5 bg-sky-600/80 hover:bg-sky-500/85 backdrop-blur-md border border-white/50 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1 shadow-xs"
            >
              Search
            </button>
          </form>

          {/* Refresh Button */}
          <button
            onClick={() => loadLiveWeather(activeAirportId, true)}
            disabled={isLoading}
            className="w-full sm:w-auto px-4 py-2.5 ios-liquid-pill text-slate-800 dark:text-slate-200 rounded-2xl font-bold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            title="Force refresh live weather data from AWC"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin text-sky-600" : "text-slate-600"} />
            <span>Refresh Live</span>
          </button>
        </div>

        {/* Weather Category Quick Filters */}
        <div className="px-4 py-2 bg-white/10 dark:bg-slate-950/20 border-b border-white/45 dark:border-slate-800/60 flex items-center gap-2 overflow-x-auto scrollbar-hide text-xs shrink-0">
          <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 tracking-wider flex items-center gap-1 mr-1 shrink-0">
            <Filter size={11} /> Quick Stations:
          </span>
          {airports.slice(0, 8).map((ap) => {
            const w = weatherMap[ap.weatherSource || ap.id];
            const isCurrent = activeAirportId === ap.id;
            return (
              <button
                key={ap.id}
                onClick={() => {
                  setActiveAirportId(ap.id);
                  setSearchQuery(ap.id);
                  if (onSelectAirport) onSelectAirport(ap.id);
                }}
                className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono transition-all flex items-center gap-1.5 border whitespace-nowrap shrink-0 ${
                  isCurrent
                    ? 'bg-sky-500/75 backdrop-blur-md text-white border-white/60 shadow-xs'
                    : 'bg-white/25 dark:bg-slate-800/35 text-slate-800 dark:text-slate-200 border-white/60 dark:border-slate-700 hover:bg-white/45'
                }`}
              >
                <span>{ap.id}</span>
                {w && w.flightCategory && (
                  <span className={`w-2 h-2 rounded-full ${
                    w.flightCategory === 'VFR' ? 'bg-emerald-500' :
                    w.flightCategory === 'MVFR' ? 'bg-blue-500' :
                    w.flightCategory === 'IFR' ? 'bg-red-500' : 'bg-purple-500'
                  }`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Scrollable Main Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-transparent">
          {isLoading && (
            <div className="py-12 flex flex-col items-center justify-center text-slate-600 dark:text-slate-300 gap-3">
              <RefreshCw size={32} className="animate-spin text-sky-600" />
              <p className="text-sm font-bold animate-pulse">Fetching live METAR & TAF from Aviation Weather Center...</p>
            </div>
          )}

          {!isLoading && error && (
            <div className="p-4 bg-amber-500/15 border border-amber-300/60 dark:border-amber-800 rounded-2xl text-amber-900 dark:text-amber-300 flex items-start gap-3">
              <Cloud size={20} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm">Station Warning</h4>
                <p className="text-xs mt-0.5 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {!isLoading && currentWeather && (
            <div className="space-y-5 animate-fade-in">
              {/* Station & Category Header Card */}
              <div className="ios-liquid-card rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/35 dark:bg-slate-800/45 rounded-2xl font-mono font-black text-2xl text-slate-900 dark:text-white tracking-tight border border-white/75 dark:border-slate-600">
                    {activeAirportId}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {airports.find(a => a.id === activeAirportId)?.name || `Station ${activeAirportId}`}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      {airports.find(a => a.id === activeAirportId)?.city ? `${airports.find(a => a.id === activeAirportId)?.city}, ${airports.find(a => a.id === activeAirportId)?.state}` : 'Aviation Reporting Station'}
                    </p>
                  </div>
                </div>

                {/* Flight Category Badge */}
                <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-white/45 dark:border-slate-700">
                  <div className="text-right hidden sm:block">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Flight Category</span>
                    <div className={`text-xs font-bold ${getCategoryTextClass(currentWeather.flightCategory)}`}>
                      {currentWeather.flightCategory || 'UNKNOWN'} Rules
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-2xl text-sm font-black uppercase tracking-wider border shadow-sm flex items-center gap-2 ${getCategoryBadgeClass(currentWeather.flightCategory)}`}>
                    <span>{currentWeather.flightCategory || 'UNKNOWN'}</span>
                  </div>
                </div>
              </div>

              {/* Decoded Key Conditions Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Wind */}
                <div className="ios-liquid-card p-3.5 rounded-2xl flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-400/25">
                    <Wind size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Wind</span>
                    <div className="text-sm font-mono font-black text-slate-900 dark:text-slate-100">
                      {currentWeather.wind 
                        ? `${String(currentWeather.wind.direction).padStart(3, '0')}° @ ${currentWeather.wind.speed} kts`
                        : 'Calm / VRB'}
                    </div>
                    {currentWeather.wind?.gust ? (
                      <span className="text-[10px] font-mono font-extrabold text-rose-600">Gusts {currentWeather.wind.gust} kts</span>
                    ) : null}
                  </div>
                </div>

                {/* Temp / Dewpoint */}
                <div className="ios-liquid-card p-3.5 rounded-2xl flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-400/25">
                    <Thermometer size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Temp / Dewpoint</span>
                    <div className="text-sm font-mono font-black text-slate-900 dark:text-slate-100">
                      {currentWeather.temperature !== undefined ? `${currentWeather.temperature}°C` : '--'} / {currentWeather.dewpoint !== undefined ? `${currentWeather.dewpoint}°C` : '--'}
                    </div>
                    {densityAlt !== null && (
                      <span className="text-[10px] font-mono font-semibold text-slate-600">DA: {densityAlt.toLocaleString()} ft</span>
                    )}
                  </div>
                </div>

                {/* Altimeter */}
                <div className="ios-liquid-card p-3.5 rounded-2xl flex items-center gap-3">
                  <div className="p-2.5 bg-purple-500/15 text-purple-600 dark:text-purple-400 rounded-xl border border-purple-400/25">
                    <Gauge size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Altimeter</span>
                    <div className="text-sm font-mono font-black text-slate-900 dark:text-slate-100">
                      {currentWeather.altimeter 
                        ? `${(currentWeather.altimeter / 33.86389).toFixed(2)} inHg`
                        : 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Visibility */}
                <div className="ios-liquid-card p-3.5 rounded-2xl flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-400/25">
                    <Eye size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Visibility</span>
                    <div className="text-sm font-mono font-black text-slate-900 dark:text-slate-100">
                      {currentWeather.visibility !== undefined ? `${currentWeather.visibility} SM` : '10+ SM'}
                    </div>
                  </div>
                </div>
              </div>

              {/* RAW METAR Box */}
              <div className="ios-liquid-card rounded-2xl overflow-hidden">
                <div className="px-4 py-2.5 bg-white/15 dark:bg-slate-800/30 border-b border-white/45 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-sky-600" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Raw METAR Observation
                    </h4>
                  </div>
                  <button
                    onClick={() => handleCopy(currentWeather.metar || '', 'metar')}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-sky-600 ios-liquid-pill rounded-full transition-colors"
                  >
                    {copiedMetar ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    <span>{copiedMetar ? 'Copied' : 'Copy METAR'}</span>
                  </button>
                </div>
                <div className="p-4 font-mono text-sm font-semibold leading-relaxed bg-white/20 dark:bg-slate-900/40 text-emerald-800 dark:text-emerald-300 rounded-b-2xl overflow-x-auto selection:bg-sky-500 selection:text-white">
                  {currentWeather.metar || 'METAR NOT AVAILABLE'}
                </div>
              </div>

              {/* RAW TAF Box */}
              <div className="ios-liquid-card rounded-2xl overflow-hidden">
                <div className="px-4 py-2.5 bg-white/15 dark:bg-slate-800/30 border-b border-white/45 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CloudSun size={16} className="text-indigo-600" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Terminal Aerodrome Forecast (TAF)
                    </h4>
                  </div>
                  <button
                    onClick={() => handleCopy(currentWeather.taf || '', 'taf')}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-indigo-600 ios-liquid-pill rounded-full transition-colors"
                  >
                    {copiedTaf ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    <span>{copiedTaf ? 'Copied' : 'Copy TAF'}</span>
                  </button>
                </div>
                <div className="p-4 font-mono text-sm font-semibold leading-relaxed bg-white/20 dark:bg-slate-900/40 text-sky-900 dark:text-sky-200 rounded-b-2xl overflow-x-auto whitespace-pre-wrap selection:bg-indigo-500 selection:text-white">
                  {currentWeather.taf || 'TAF NOT REPORTED FOR THIS STATION'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-white/15 dark:bg-slate-900/25 border-t border-white/45 dark:border-slate-700 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 shrink-0">
          <span className="font-semibold text-[11px]">
            Data Source: NOAA / Aviation Weather Center (AWC API)
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 ios-liquid-pill text-slate-900 dark:text-white font-bold rounded-full text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
