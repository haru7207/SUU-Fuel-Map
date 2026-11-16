
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Airport, CardType, WeatherData } from '../types';
import { Search, AlertCircle, MessageSquare, Settings, X, Sun, Moon, Monitor, Trash2, ChevronLeft, Mail, Phone, FileSpreadsheet, RefreshCw, Star, Layers, Palette, Code, Terminal, Info, Flame, Database, CloudSun, Wind, Fuel, Calculator, ChevronDown } from 'lucide-react';

interface SidebarProps {
  airports: Airport[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onOpenCheatSheet?: (query: string) => void;
  themeMode: 'day' | 'night' | 'auto';
  setThemeMode: (mode: 'day' | 'night' | 'auto') => void;
  baseMapType?: 'roadmap' | 'hybrid' | 'satellite' | 'terrain';
  setBaseMapType?: (type: 'roadmap' | 'hybrid' | 'satellite' | 'terrain') => void;
  isMobile: boolean;
  onClose: () => void;
  isRefreshingFuel?: boolean;
  onRefreshFuelPrices?: () => Promise<void>;
  favorites?: string[];
  onToggleFavorite?: (id: string) => void;
  weatherMap?: Record<string, WeatherData>;
  isMetarOnly?: boolean;
  setIsMetarOnly?: (val: boolean) => void;
  onOpenMetarModal?: () => void;
  isFuelLogOpen?: boolean;
  onOpenFuelLog?: (view: 'form' | 'list' | 'calc') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  airports, 
  selectedId, 
  onSelect, 
  searchTerm, 
  setSearchTerm, 
  onOpenCheatSheet, 
  themeMode, 
  setThemeMode, 
  baseMapType,
  setBaseMapType,
  isMobile, 
  onClose,
  isRefreshingFuel = false,
  onRefreshFuelPrices,
  favorites = [],
  onToggleFavorite,
  weatherMap = {},
  isMetarOnly = false,
  setIsMetarOnly,
  onOpenMetarModal,
  isFuelLogOpen = false,
  onOpenFuelLog
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [cardFilter, setCardFilter] = useState<CardType | 'ALL'>('ALL');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [isFuelMenuOpen, setIsFuelMenuOpen] = useState(false);
  const fuelMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fuelMenuRef.current && !fuelMenuRef.current.contains(event.target as Node)) {
        setIsFuelMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
  
  const filteredAirports = useMemo(() => {
    let filtered = airports;

    if (showOnlyFavorites) {
      filtered = filtered.filter(a => favorites.includes(a.id));
    }

    if (isMetarOnly) {
      filtered = filtered.filter(a => {
        const w = weatherMap[a.weatherSource || a.id];
        return !!(w && w.metar && !w.metar.includes('ERROR') && !w.metar.includes('Unavailable'));
      });
    }

    if (cardFilter !== 'ALL') {
      filtered = filtered.filter(a => {
        if (a.cardRules.primary === cardFilter) return true;
        if (a.cardRules.byFuelType && Object.values(a.cardRules.byFuelType).includes(cardFilter)) return true;
        if (a.cardRules.byFbo && a.cardRules.byFbo.some(f => f.card === cardFilter)) return true;
        return false;
      });
    }

    if (!searchTerm) return filtered;
    
    const lower = searchTerm.toLowerCase();
    
    // Helper for simple fuzzy matching (subsequence)
    const fuzzyMatch = (text: string, pattern: string) => {
        let pIdx = 0;
        let tIdx = 0;
        const pLen = pattern.length;
        const tLen = text.length;
        
        while (pIdx < pLen && tIdx < tLen) {
            if (pattern[pIdx] === text[tIdx].toLowerCase()) {
                pIdx++;
            }
            tIdx++;
        }
        return pIdx === pLen;
    };

    // Levenshtein distance for typo tolerance
    const levenshteinDistance = (s1: string, s2: string) => {
        const len1 = s1.length, len2 = s2.length;
        const dp = Array(len1 + 1).fill(0).map(() => Array(len2 + 1).fill(0));
        for (let i = 0; i <= len1; i++) dp[i][0] = i;
        for (let j = 0; j <= len2; j++) dp[0][j] = j;
        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1, // deletion
                    dp[i][j - 1] + 1, // insertion
                    dp[i - 1][j - 1] + indicator // substitution
                );
            }
        }
        return dp[len1][len2];
    };

    const isTypoMatch = (text: string, pattern: string) => {
        const words = text.toLowerCase().split(/[\s,]+/);
        const maxTypos = pattern.length >= 5 ? 2 : (pattern.length >= 3 ? 1 : 0);
        
        if (maxTypos === 0) return false;

        for (const word of words) {
            const wordPrefix = word.substring(0, pattern.length);
            if (levenshteinDistance(wordPrefix, pattern) <= maxTypos) {
                return true;
            }
        }
        return false;
    };

    return filtered.filter(a => {
      // 1. Direct includes (most common)
      if (a.id.toLowerCase().includes(lower) || 
          a.name.toLowerCase().includes(lower) ||
          a.city.toLowerCase().includes(lower) ||
          a.state.toLowerCase().includes(lower)) {
        return true;
      }
      
      // 2. Fuzzy match (subsequence) for ID and City (e.g. "slc" -> "Salt Lake City")
      // Only apply fuzzy if search term is at least 2 chars to avoid noise
      if (lower.length >= 2) {
          if (fuzzyMatch(a.id, lower) || 
              fuzzyMatch(a.city, lower) || 
              fuzzyMatch(a.name, lower)) {
              return true;
          }
      }

      // 3. Typo match (Levenshtein distance)
      if (lower.length >= 3) {
          if (isTypoMatch(a.id, lower) ||
              isTypoMatch(a.city, lower) ||
              isTypoMatch(a.name, lower)) {
              return true;
          }
      }
      
      return false;
    });
  }, [airports, searchTerm, cardFilter, showOnlyFavorites, favorites, isMetarOnly, weatherMap]);

  return (
    <div className="flex flex-col h-full ios-liquid-glass md:rounded-[28px] w-full md:w-80 lg:w-96 z-20 overflow-hidden transition-all duration-300">
      {/* iOS Liquid Glass Header */}
      <div className="p-4 sm:p-5 pb-3.5 bg-white/15 dark:bg-slate-900/20 text-slate-900 dark:text-white flex-shrink-0 border-b border-white/50 dark:border-white/10 relative z-30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
             <div className="p-1.5 rounded-2xl bg-white/35 dark:bg-slate-800/40 backdrop-blur-md border border-white/75 dark:border-white/15 shadow-2xs">
               <img 
                 src="/regenerated_image_1777310555290.png" 
                 alt="SUU Aviation Logo" 
                 referrerPolicy="no-referrer"
                 className="h-7 w-auto object-contain transition-transform duration-200 hover:scale-105 cursor-pointer"
                 onError={(e) => {
                   (e.target as HTMLImageElement).src = "https://www.suu.edu/_files/images/footer-birdhead-combo.webp";
                 }}
               />
             </div>
             <div>
               <h1 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white leading-none drop-shadow-2xs">
                 SUU <span className="font-medium text-slate-600 dark:text-slate-300">Fuel Map</span>
               </h1>
             </div>
          </div>
          <div className="flex items-center gap-1.5">
             <button
               onClick={() => setShowSettings(!showSettings)}
               className={`p-2 rounded-full transition-all duration-200 active:scale-95 ${
                 showSettings
                   ? 'bg-slate-900/75 text-white dark:bg-white/80 dark:text-slate-900 backdrop-blur-md shadow-sm border border-white/40'
                   : 'ios-liquid-pill text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white'
               }`}
               title="Settings"
             >
               <Settings size={18} />
             </button>
             {isMobile && (
               <button
                 onClick={onClose}
                 className="ios-liquid-pill text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-all p-2 rounded-full active:scale-95"
                 title="Close Sidebar"
               >
                 <X size={18} />
               </button>
             )}
          </div>
        </div>
        
        {/* Quick Action Toggles: Fuel Ops & METAR & TAF */}
        {!showSettings && (
          <div className="grid grid-cols-2 gap-2 mb-3 relative z-30" ref={fuelMenuRef}>
            {/* Fuel Ops Dropdown Trigger */}
            <div className="relative">
              <button
                onClick={() => setIsFuelMenuOpen(!isFuelMenuOpen)}
                className={`w-full flex items-center justify-between gap-1.5 px-3 py-2 rounded-2xl transition-all active:scale-95 group ${
                  isFuelMenuOpen || isFuelLogOpen
                    ? 'bg-red-600/80 backdrop-blur-md text-white shadow-[0_8px_20px_rgba(220,38,38,0.28)] border border-white/50'
                    : 'ios-liquid-pill text-slate-900 dark:text-slate-100 hover:bg-white/60'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${isFuelMenuOpen || isFuelLogOpen ? 'bg-white/25 text-white' : 'bg-red-600/90 text-white shadow-2xs'}`}>
                    <Fuel size={11} className="group-hover:rotate-12 transition-transform" />
                  </div>
                  <span className="font-bold tracking-tight text-xs truncate">Fuel Ops</span>
                </div>
                <ChevronDown size={13} className={`shrink-0 opacity-70 transition-transform duration-200 ${isFuelMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isFuelMenuOpen && (
                <div className="absolute top-full mt-2 left-0 w-56 ios-liquid-glass-heavy rounded-2xl overflow-hidden flex flex-col z-50 p-1.5 gap-0.5 animate-pop-in">
                  <button
                    onClick={() => {
                      if (onOpenFuelLog) onOpenFuelLog('form');
                      setIsFuelMenuOpen(false);
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/65 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-100 text-xs font-bold text-left transition-all"
                  >
                    <div className="w-6 h-6 rounded-lg bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                      <Fuel size={13} />
                    </div>
                    <span>Log Fuel</span>
                  </button>

                  <button
                    onClick={() => {
                      if (onOpenFuelLog) onOpenFuelLog('calc');
                      setIsFuelMenuOpen(false);
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/65 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-100 text-xs font-bold text-left transition-all"
                  >
                    <div className="w-6 h-6 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                      <Calculator size={13} />
                    </div>
                    <span>Fuel Price Calculator</span>
                  </button>

                  <a
                    href="https://docs.google.com/forms/d/e/1FAIpQLScmBQPQeOxgMnq4UEvxzg5HwEe-x2Owj3kVpV4pWbpXrxhoHg/viewform"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsFuelMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/65 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-100 text-xs font-bold text-left transition-all"
                  >
                    <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <AlertCircle size={13} />
                    </div>
                    <span>Fuel Error Report</span>
                  </a>
                </div>
              )}
            </div>

            {/* METAR & TAF Toggle */}
            <button
              onClick={() => {
                if (setIsMetarOnly) setIsMetarOnly(!isMetarOnly);
                if (onOpenMetarModal && !isMetarOnly) onOpenMetarModal();
              }}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-2xl transition-all active:scale-95 group ${
                isMetarOnly
                  ? 'bg-sky-500/80 backdrop-blur-md text-white shadow-[0_8px_20px_rgba(14,165,233,0.28)] border border-white/60'
                  : 'ios-liquid-pill text-slate-800 dark:text-slate-100 hover:bg-white/60 hover:text-sky-600 dark:hover:text-sky-400'
              }`}
              title="Toggle METAR & TAF filter and weather station viewer"
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${isMetarOnly ? 'bg-white/25 text-white' : 'bg-sky-500/15 text-sky-600 dark:text-sky-400'}`}>
                <CloudSun size={12} className="transition-transform group-hover:scale-110" />
              </div>
              <span className="font-bold tracking-tight text-xs truncate">
                {isMetarOnly ? 'METAR Active' : 'METAR & TAF'}
              </span>
            </button>
          </div>
        )}

        {/* iOS Spotlight-Style Search */}
        {!showSettings && (
          <div className={`flex items-center w-full h-10 px-3.5 rounded-2xl mb-3 transition-all ${
            isMetarOnly
              ? 'bg-sky-400/20 dark:bg-sky-950/35 border border-sky-300/75 dark:border-sky-500/50 focus-within:ring-2 focus-within:ring-sky-400/40'
              : 'ios-liquid-input focus-within:bg-white/50 dark:focus-within:bg-slate-800/50 focus-within:ring-2 focus-within:ring-sky-500/25'
          }`}>
            <Search className="text-slate-500 shrink-0 mr-2.5" size={16} />
            <input
              type="text"
              placeholder={isMetarOnly ? "Search METAR & TAF (ICAO, City)..." : "Search airport, city, name or ID"}
              className={`w-full bg-transparent text-sm font-medium text-slate-900 dark:text-white outline-none leading-normal ${
                isMetarOnly ? 'placeholder-sky-700/75 dark:placeholder-sky-300/70' : 'placeholder-slate-500 dark:placeholder-slate-400'
              }`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="ml-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-white/45 dark:bg-slate-700/50 rounded-full p-0.5 shrink-0"
              >
                <X size={13} />
              </button>
            )}
          </div>
        )}

        {/* iOS Segmented Filter Pills */}
        {!showSettings && (
          <div className="flex flex-wrap gap-1.5">
             <button 
                onClick={() => {
                  setCardFilter('ALL');
                  if (setIsMetarOnly) setIsMetarOnly(false);
                }} 
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 transition-all active:scale-95 ${
                  !isMetarOnly && cardFilter === 'ALL'
                    ? 'bg-slate-900/75 text-white dark:bg-white/80 dark:text-slate-900 backdrop-blur-md shadow-sm border border-white/40'
                    : 'bg-white/25 dark:bg-slate-800/30 text-slate-700 dark:text-slate-200 hover:bg-white/45 border border-white/60 dark:border-white/15'
                }`}
             >
                All Cards
             </button>
             <button 
                onClick={() => setCardFilter(CardType.PCARD)} 
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 transition-all active:scale-95 ${
                  cardFilter === CardType.PCARD
                    ? 'bg-blue-600/75 text-white backdrop-blur-md shadow-sm border border-white/50'
                    : 'bg-white/25 dark:bg-slate-800/30 text-slate-700 dark:text-slate-200 hover:bg-white/45 border border-white/60 dark:border-white/15'
                }`}
             >
                PCard
             </button>
             <button 
                onClick={() => setCardFilter(CardType.AVFUEL)} 
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 transition-all active:scale-95 ${
                  cardFilter === CardType.AVFUEL
                    ? 'bg-slate-800/75 text-white dark:bg-slate-200/80 dark:text-slate-900 backdrop-blur-md shadow-sm border border-white/40'
                    : 'bg-white/25 dark:bg-slate-800/30 text-slate-700 dark:text-slate-200 hover:bg-white/45 border border-white/60 dark:border-white/15'
                }`}
             >
                AVFuel
             </button>
             <button 
                onClick={() => setCardFilter(CardType.WHITE_CARD)} 
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 transition-all active:scale-95 ${
                  cardFilter === CardType.WHITE_CARD
                    ? 'bg-rose-600/75 text-white backdrop-blur-md shadow-sm border border-white/50'
                    : 'bg-white/25 dark:bg-slate-800/30 text-slate-700 dark:text-slate-200 hover:bg-white/45 border border-white/60 dark:border-white/15'
                }`}
             >
                White Card
             </button>
             <button 
                onClick={() => setShowOnlyFavorites(!showOnlyFavorites)} 
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 transition-all flex items-center gap-1 active:scale-95 ${
                  showOnlyFavorites 
                    ? 'bg-amber-500/80 text-white backdrop-blur-md shadow-sm border border-white/60' 
                    : 'bg-white/25 dark:bg-slate-800/30 text-amber-700 dark:text-amber-300 hover:bg-white/45 border border-white/60 dark:border-white/15'
                }`}
                title="Filter to show only starred airports"
             >
                <Star size={11} className={showOnlyFavorites ? "fill-current" : ""} />
                <span>Starred ({favorites.length})</span>
             </button>
          </div>
        )}
      </div>

      {/* Main Scrollable List or Settings */}
      <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-1.5">
        {showSettings ? (
          <div className="animate-fade-in pb-8 px-1.5 pt-2">
            {/* iOS Settings Header */}
            <div className="ios-liquid-card rounded-2xl p-4 mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowSettings(false)} 
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-white transition-all shadow-sm border border-white/90 dark:border-white/10 active:scale-95"
                >
                  <ChevronLeft size={18} strokeWidth={2.5} />
                </button>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Settings</h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Display, Map & Database</p>
                </div>
              </div>
              <Settings className="text-slate-400/70" size={20} />
            </div>

            <div className="space-y-5">
              {/* Theme Settings */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 ml-2">
                  <Palette size={13} />
                  Appearance
                </h3>
                <div className="bg-slate-200/65 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl border border-white/75 dark:border-white/10 p-1 flex gap-1">
                  {[
                    { id: 'day', icon: Sun, label: 'Light Glass' },
                    { id: 'night', icon: Moon, label: 'Dark Glass' },
                    { id: 'auto', icon: Monitor, label: 'System' }
                  ].map(mode => (
                    <button
                      key={mode.id}
                      onClick={() => setThemeMode(mode.id as 'day' | 'night' | 'auto')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                        themeMode === mode.id 
                          ? 'bg-white/95 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm border border-white/90 dark:border-white/10' 
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <mode.icon size={14} />
                      <span>{mode.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Map Terrain Style Settings */}
              {baseMapType && setBaseMapType && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 ml-2">
                    <Layers size={13} />
                    Map Base View
                  </h3>
                  <div className="ios-liquid-card rounded-2xl overflow-hidden divide-y divide-slate-200/60 dark:divide-slate-700/50">
                    {[
                      { id: 'roadmap', label: 'Apple Clean Roadmap' },
                      { id: 'hybrid', label: 'Satellite Hybrid' },
                      { id: 'satellite', label: 'High-Res Satellite' },
                      { id: 'terrain', label: 'Topographic Terrain' }
                    ].map((type) => (
                      <button 
                        key={type.id}
                        onClick={() => setBaseMapType(type.id as 'roadmap'|'hybrid'|'satellite'|'terrain')}
                        className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors ${
                          baseMapType === type.id 
                            ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300 font-semibold' 
                            : 'text-slate-700 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <span>{type.label}</span>
                        {baseMapType === type.id && (
                          <span className="text-xs font-bold text-sky-600 dark:text-sky-400">Active</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Data Settings */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 ml-2">
                  <Database size={13} />
                  Data Management
                </h3>
                <div className="ios-liquid-card rounded-2xl overflow-hidden divide-y divide-slate-200/60 dark:divide-slate-700/50">
                  {onRefreshFuelPrices && (
                    <button 
                      type="button"
                      disabled={isRefreshingFuel}
                      onClick={async () => {
                        try {
                          await onRefreshFuelPrices();
                          alert("Fuel price database updated successfully!");
                        } catch (e) {
                          alert("Failed to update fuel price database: " + (e instanceof Error ? e.message : String(e)));
                        }
                      }}
                      className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-white/60 dark:hover:bg-slate-800/40 transition-colors disabled:opacity-60"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-emerald-500/15 p-2 rounded-xl text-emerald-600 dark:text-emerald-400">
                          <RefreshCw size={16} className={isRefreshingFuel ? "animate-spin" : ""} />
                        </div>
                        <div className="flex flex-col items-start text-left">
                          <span>Update Fuel Prices Database Now</span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">Syncs latest station pricing</span>
                        </div>
                      </div>
                      {isRefreshingFuel && (
                        <span className="text-xs text-slate-400 font-medium">Syncing...</span>
                      )}
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      if (window.confirm("Are you sure you want to clear all saved fuel memos? This cannot be undone.")) {
                        localStorage.removeItem('suu_fuel_logs_list');
                        alert("Fuel memos cleared.");
                      }
                    }}
                    className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-white/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-rose-500/15 p-2 rounded-xl">
                        <Trash2 size={16} />
                      </div>
                      <span>Clear Saved Fuel Memos</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Developer Information */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 ml-2">
                  <Code size={13} />
                  Support & Disclosures
                </h3>
                <div className="ios-liquid-card rounded-2xl overflow-hidden p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl border border-white/80 dark:border-slate-700 shadow-sm bg-gradient-to-br from-sky-100 to-blue-100 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center text-sky-700 dark:text-sky-300 font-extrabold text-base">
                      EJ
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Elon Jun</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Aviation Finance Assistant
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-white/60 dark:bg-slate-900/50 p-3 rounded-xl space-y-2 text-xs border border-white/80 dark:border-slate-700/50">
                    <a href="mailto:elonjun@suu.edu" className="flex items-center gap-2.5 text-sky-600 dark:text-sky-400 hover:text-sky-700 transition-colors font-medium">
                      <Mail size={14} />
                      <span>elonjun@suu.edu</span>
                    </a>
                    <div className="h-px w-full bg-slate-200/70 dark:bg-slate-700/50"></div>
                    <a href="tel:4356811849" className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors font-medium font-mono">
                      <Phone size={14} />
                      <span>(435) 681-1849</span>
                    </a>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    <h5 className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Info size={12} /> Advisory Notice
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Weather data (METAR, TAF, G-AIRMET) is sourced from NOAA AWC. Advisory use only — never use as an official weather briefing source for flight planning.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : filteredAirports.length === 0 ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400 ios-liquid-card rounded-2xl m-2">
            <p className="text-sm font-medium">No airports match your filter.</p>
          </div>
        ) : (
          <ul className="space-y-1.5 pb-2">
            {filteredAirports.map(airport => {
              const isSelected = airport.id === selectedId;
              const isWhiteCard = airport.cardRules.primary === CardType.WHITE_CARD;
              const wx = weatherMap[airport.weatherSource || airport.id];
              
              return (
                <li key={airport.id}>
                  <div 
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelect(airport.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelect(airport.id);
                      }
                    }}
                    className={`w-full text-left px-4 py-3.5 rounded-2xl transition-all duration-200 flex justify-between items-start group relative cursor-pointer ${
                      isSelected
                        ? 'bg-white/55 dark:bg-slate-800/60 backdrop-blur-xl shadow-[0_10px_25px_-5px_rgba(15,23,42,0.12),inset_0_1.5px_0.5px_rgba(255,255,255,0.95)] border border-white/90 dark:border-white/25'
                        : 'bg-white/22 dark:bg-slate-800/20 hover:bg-white/42 dark:hover:bg-slate-800/40 border border-white/50 dark:border-white/10 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.03),inset_0_1px_0_rgba(255,255,255,0.65)]'
                    }`}
                  >
                    <div className="w-full">
                      <div className="flex items-center justify-between w-full mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-extrabold text-base tracking-tight font-mono ${isSelected ? 'text-sky-600 dark:text-sky-400' : 'text-slate-900 dark:text-slate-100'}`}>
                            {airport.id}
                          </span>
                          {wx && wx.flightCategory && wx.flightCategory !== 'UNKNOWN' && (
                            <span
                              className={`text-[10px] font-bold tracking-wide ${
                                wx.flightCategory === 'VFR' ? 'text-emerald-700 dark:text-emerald-400' :
                                wx.flightCategory === 'MVFR' ? 'text-blue-700 dark:text-blue-400' :
                                wx.flightCategory === 'IFR' ? 'text-rose-700 dark:text-rose-400' :
                                'text-purple-700 dark:text-purple-400'
                              }`}
                              title={`Flight Category: ${wx.flightCategory}`}
                            >
                              · {wx.flightCategory}
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onToggleFavorite) onToggleFavorite(airport.id);
                            }}
                            className={`p-1 rounded-full transition-colors ${
                              favorites.includes(airport.id)
                                ? 'text-amber-500 hover:bg-amber-500/10'
                                : 'text-slate-400 dark:text-slate-500 hover:text-amber-500 hover:bg-amber-500/10'
                            }`}
                            title={favorites.includes(airport.id) ? "Remove from Favorites" : "Add to Favorites"}
                          >
                            <Star size={14} className={favorites.includes(airport.id) ? "fill-amber-500 text-amber-500" : ""} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onOpenCheatSheet) onOpenCheatSheet(airport.id);
                            }}
                            className="p-1 rounded-full text-slate-500 hover:text-sky-600 hover:bg-sky-500/10 transition-colors"
                            title="View in Cheat Sheet"
                          >
                            <FileSpreadsheet size={13} />
                          </button>
                        </div>
                        
                        <div className="flex items-center gap-1.5 flex-wrap justify-end text-[11px] font-semibold">
                          {airport.cardRules.byFbo ? (
                            Array.from(new Set(airport.cardRules.byFbo.map(f => f.card))).map((card, idx) => {
                              if (card === CardType.WHITE_CARD) {
                                return (
                                  <span key={idx} className="text-rose-600 dark:text-rose-400">
                                    {idx > 0 ? '· ' : ''}White Card
                                  </span>
                                );
                              } else if (card === CardType.PCARD) {
                                return (
                                  <span key={idx} className="text-blue-600 dark:text-blue-400">
                                    {idx > 0 ? '· ' : ''}PCard
                                  </span>
                                );
                              } else if (card === CardType.AVFUEL) {
                                return (
                                  <span key={idx} className="text-slate-800 dark:text-slate-200">
                                    {idx > 0 ? '· ' : ''}AVFuel
                                  </span>
                                );
                              }
                              return null;
                            })
                          ) : (
                            <>
                              {isWhiteCard && (
                                <span className="text-rose-600 dark:text-rose-400">White Card</span>
                              )}
                              {!isWhiteCard && airport.cardRules.primary === CardType.PCARD && (
                                <span className="text-blue-600 dark:text-blue-400">PCard</span>
                              )}
                              {!isWhiteCard && airport.cardRules.primary === CardType.AVFUEL && (
                                <span className="text-slate-800 dark:text-slate-200">AVFuel</span>
                              )}
                            </>
                          )}
                          
                          {airport.cardRules.warning && !isWhiteCard && (
                            <AlertCircle size={13} className="text-amber-500 shrink-0" />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                        <span className="truncate font-medium">{airport.name} · {airport.city}, {airport.state}</span>
                        {airport.fuelPrices?.['100LL'] && (
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-100 shrink-0 ml-2">
                            ${airport.fuelPrices['100LL'].toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="px-4 py-3 bg-white/15 dark:bg-slate-900/20 border-t border-white/50 dark:border-white/10 flex-shrink-0">
        <p className="text-[10px] text-slate-600 dark:text-slate-300 text-center leading-relaxed">
          SUU Aviation Dispatch & Instructor Reference · <span className="font-semibold text-slate-800 dark:text-white">Advisory Use Only</span>
        </p>
      </div>
    </div>
  );
};

export default Sidebar;
