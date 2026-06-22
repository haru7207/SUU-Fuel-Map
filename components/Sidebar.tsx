
import React, { useMemo, useState } from 'react';
import { Airport, CardType } from '../types';
import { Search, AlertCircle, MessageSquare, Settings, X, Sun, Moon, Monitor, Trash2, ChevronLeft, Mail, Phone, FileSpreadsheet, RefreshCw, Star, Layers, Palette, Code, Terminal, Info, Flame, Database } from 'lucide-react';

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
  onToggleFavorite
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [cardFilter, setCardFilter] = useState<CardType | 'ALL'>('ALL');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  
  const filteredAirports = useMemo(() => {
    let filtered = airports;

    if (showOnlyFavorites) {
      filtered = filtered.filter(a => favorites.includes(a.id));
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
  }, [airports, searchTerm, cardFilter, showOnlyFavorites, favorites]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 w-full md:w-80 lg:w-96 shadow-xl z-20">
      <div className="p-5 bg-[#0f172a] text-white flex-shrink-0 border-b border-slate-800">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
             <img 
               src="/regenerated_image_1777310555290.png" 
               alt="SUU Aviation Logo" 
               className="h-8 w-auto object-contain transition-all duration-300 hover:scale-110 hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] cursor-pointer"
               onError={(e) => {
                 (e.target as HTMLImageElement).src = "https://www.suu.edu/_files/images/footer-birdhead-combo.webp";
               }}
             />
             <h1 className="text-xl font-bold tracking-tight text-white">SUU <span className="text-slate-400 font-light">Fuel Map</span></h1>
          </div>
          <div className="flex items-center gap-2">
             <button onClick={() => setShowSettings(!showSettings)} className="text-slate-400 hover:text-white transition-colors p-1 rounded-full hover:bg-slate-800">
               <Settings size={20} />
             </button>
             {isMobile && (
               <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 rounded-full hover:bg-slate-800">
                 <X size={20} />
               </button>
             )}
          </div>
        </div>
        
        {/* Search */}
        {!showSettings && (
          <div className="relative group mb-3">
            <Search className="absolute left-3 top-2.5 text-slate-500 group-focus-within:text-slate-300 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Search airport, city, name or ID" 
              className="w-full pl-10 pr-4 py-2 bg-[#1e293b] border border-slate-700 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}

        {/* Card Filter */}
        {!showSettings && (
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
             <button 
                onClick={() => setCardFilter('ALL')} 
                className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${cardFilter === 'ALL' ? 'bg-slate-700 text-white' : 'bg-[#1e293b] text-slate-400 hover:text-slate-200'}`}
             >
                All Cards
             </button>
             <button 
                onClick={() => setCardFilter(CardType.PCARD)} 
                className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${cardFilter === CardType.PCARD ? 'bg-blue-600 text-white' : 'bg-[#1e293b] text-slate-400 hover:text-slate-200'}`}
             >
                PCard
             </button>
             <button 
                onClick={() => setCardFilter(CardType.AVFUEL)} 
                className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${cardFilter === CardType.AVFUEL ? 'bg-slate-800 text-white border border-slate-600' : 'bg-[#1e293b] text-slate-400 hover:text-slate-200'}`}
             >
                AVFuel
             </button>
             <button 
                onClick={() => setCardFilter(CardType.WHITE_CARD)} 
                className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${cardFilter === CardType.WHITE_CARD ? 'bg-red-600 text-white' : 'bg-[#1e293b] text-slate-400 hover:text-slate-200'}`}
             >
                White Card
             </button>
             <button 
                onClick={() => setShowOnlyFavorites(!showOnlyFavorites)} 
                className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 border ${
                  showOnlyFavorites 
                    ? 'bg-amber-500 text-slate-900 border-amber-400 font-bold' 
                    : 'bg-[#1e293b] text-amber-500 hover:text-amber-400 border-slate-700/50'
                }`}
                title="Filter to show only starred airports"
             >
                <Star size={12} className={showOnlyFavorites ? "fill-current" : ""} />
                <span>Starred ({favorites.length})</span>
             </button>
          </div>
        )}

        {/* Global Action Controls */}
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
        {showSettings ? (
          <div className="animate-fade-in pb-10">
            {/* Premium Header */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-b border-slate-800 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-white/5 blur-2xl"></div>
              <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-40 h-40 rounded-full bg-white/5 blur-3xl"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setShowSettings(false)} 
                    className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white transition-all shadow-sm"
                  >
                    <ChevronLeft size={18} strokeWidth={2.5} />
                  </button>
                  <h2 className="text-xl font-bold text-white tracking-tight drop-shadow-sm">Settings</h2>
                </div>
                <Settings className="text-slate-500/50" size={24} />
              </div>
            </div>

            <div className="p-5 space-y-6">
              {/* Theme Settings */}
              <div className="space-y-2.5">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2 ml-1">
                  <Palette size={12} />
                  Appearance
                </h3>
                <div className="bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden p-1 flex">
                  {[
                    { id: 'day', icon: Sun, label: 'Light' },
                    { id: 'night', icon: Moon, label: 'Dark' },
                    { id: 'auto', icon: Monitor, label: 'System' }
                  ].map(mode => (
                    <button
                      key={mode.id}
                      onClick={() => setThemeMode(mode.id as 'day' | 'night' | 'auto')}
                      className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                        themeMode === mode.id 
                          ? 'bg-slate-100 dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-sm' 
                          : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      <mode.icon size={16} />
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Map Terrain Style Settings */}
              {baseMapType && setBaseMapType && (
                <div className="space-y-2.5">
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2 ml-1">
                    <Layers size={13} />
                    Map Base View
                  </h3>
                  <div className="bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden">
                    {[
                      { id: 'roadmap', icon: '🗺️', label: 'Google Roadmap' },
                      { id: 'hybrid', icon: '🛰️', label: 'Google Hybrid' },
                      { id: 'satellite', icon: '📷', label: 'Google Satellite' },
                      { id: 'terrain', icon: '⛰️', label: 'Google Terrain' }
                    ].map((type, i) => (
                      <button 
                        key={type.id}
                        onClick={() => setBaseMapType(type.id as 'roadmap'|'hybrid'|'satellite'|'terrain')}
                        className={`w-full flex items-center justify-between p-3.5 text-sm font-medium transition-colors ${i !== 3 ? 'border-b border-slate-100 dark:border-slate-700/50' : ''} ${
                          baseMapType === type.id 
                            ? 'bg-red-50/50 dark:bg-red-900/10 text-red-600 dark:text-red-400' 
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-base select-none">{type.icon}</span>
                          <span>{type.label}</span>
                        </div>
                        {baseMapType === type.id && <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/40"></div>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Data Settings */}
              <div className="space-y-2.5">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2 ml-1">
                  <Database size={12} />
                  Data Management
                </h3>
                <div className="bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden">
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
                      className="w-full flex items-center justify-between p-3.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors border-b border-slate-100 dark:border-slate-700/50 disabled:opacity-60"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-emerald-100 dark:bg-emerald-900/30 p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400">
                          <RefreshCw size={16} className={isRefreshingFuel ? "animate-spin" : ""} />
                        </div>
                        <div className="flex flex-col items-start">
                          <span>Update Fuel Prices Database Now</span>
                          <span className="text-[10px] text-slate-400 font-normal">Scans live search metrics via Gemini</span>
                        </div>
                      </div>
                      {isRefreshingFuel ? (
                        <span className="text-xs text-slate-400 font-medium">Searching...</span>
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse"></div>
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
                    className="w-full flex items-center justify-between p-3.5 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-red-100 dark:bg-red-900/30 p-1.5 rounded-lg">
                        <Trash2 size={16} />
                      </div>
                      <span>Clear Saved Fuel Memos</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Developer Information */}
              <div className="space-y-2.5">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2 ml-1">
                  <Code size={12} />
                  Developer Info
                </h3>
                <div className="bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden relative">
                  {/* Badge top color bar */}
                  <div className="h-1.5 bg-gradient-to-r from-blue-500 to-sky-400 w-full"></div>
                  
                  <div className="p-4 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full border-2 border-white dark:border-slate-700 shadow-sm bg-gradient-to-br from-blue-100 to-blue-200 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center text-blue-700 dark:text-blue-300 font-black text-xl">
                        EJ
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-100 text-base shadow-sm">Elon Jun</h4>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <Terminal size={10} /> Lead Developer
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg space-y-2.5 text-sm border border-slate-100 dark:border-slate-700/50">
                      <a href="mailto:haru7207.local@gmail.com" className="flex items-center gap-3 text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors group">
                        <div className="text-slate-400 group-hover:text-blue-500 transition-colors"><Mail size={14} /></div>
                        <span className="font-medium">haru7207.local@gmail.com</span>
                      </a>
                      <div className="h-px w-full bg-slate-200 dark:bg-slate-700/50"></div>
                      <a href="tel:4356811849" className="flex items-center gap-3 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors group">
                        <div className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors"><Phone size={14} /></div>
                        <span className="font-medium">(435) 681-1849</span>
                      </a>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 italic bg-sky-50 dark:bg-sky-900/10 p-2 rounded text-center text-sky-700 dark:text-sky-300 border border-sky-100 dark:border-sky-800/30">
                      Instructors: Please send any bug reports or feedback to the email above.
                    </p>
                  </div>

                  {/* Disclosures section */}
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border-t border-slate-200/80 dark:border-slate-700/80">
                    <h5 className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide flex items-center gap-1.5"><Info size={12} /> Tech Notes & Disclaimers</h5>
                    <ul className="text-[10px] text-slate-500 dark:text-slate-400 space-y-1.5 list-disc pl-3">
                      <li>Weather data (METAR, TAF, G-AIRMET) is sourced from the FAA AWC API. 7-day forecasts are fetched from Open-Meteo.</li>
                      <li>CFI tools calculations use standard aeronautical formulas. Runway crosswind calculations are based on current METAR data.</li>
                      <li>FBO & airport data are aggregated from various free APIs. For comprehensive airport data, visit <a href="https://www.airnav.com" target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-600 underline">AirNav.com</a>.</li>
                      <li>The Airport Cheat Sheet is under active development; data may be inaccurate.</li>
                      <li>NOTAM integration is currently pending FAA API approval.</li>
                      <li className="text-red-500 dark:text-red-400 font-semibold mt-2.5 bg-red-50 dark:bg-red-900/20 p-1.5 rounded border border-red-100 dark:border-red-900/30">All weather data provided here is advisory only. Never use this application as an official weather source for flight planning.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-2 text-center pb-8">
                <div className="inline-flex items-center gap-2 text-slate-400 dark:text-slate-500 mb-1">
                  <Flame size={14} className="text-red-500 shadow-sm" />
                  <span className="font-bold tracking-wide text-sm text-slate-700 dark:text-slate-300">SUU Fuel Map</span>
                </div>
                <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">v2.6.3 • Designed for SUU Aviation</p>
              </div>
            </div>
          </div>
        ) : filteredAirports.length === 0 ? (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500">
            <p>No airports found.</p>
          </div>
        ) : (
          <ul>
            {filteredAirports.map(airport => {
              const isSelected = airport.id === selectedId;
              const isWhiteCard = airport.cardRules.primary === CardType.WHITE_CARD;
              
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
                    className={`w-full text-left px-5 py-4 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex justify-between items-start group relative cursor-pointer ${
                      isSelected ? 'bg-slate-50 dark:bg-slate-800' : ''
                    }`}
                  >
                    {isSelected && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
                    )}
                    <div className="w-full">
                      <div className="flex items-center justify-between w-full mb-1">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold text-lg ${isSelected ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                {airport.id}
                            </span>
                            {airport.fuelPricesLastUpdated && (Date.now() - new Date(airport.fuelPricesLastUpdated).getTime()) < 24 * 60 * 60 * 1000 && (
                                <div 
                                  className="w-2 h-2 rounded-full bg-green-500 shadow-sm shadow-green-500/50" 
                                  title="Fuel prices updated in the last 24 hours"
                                />
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onToggleFavorite) onToggleFavorite(airport.id);
                            }}
                            className={`p-1 rounded transition-colors ${
                              favorites.includes(airport.id)
                                ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                                : 'text-slate-300 dark:text-slate-600 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20'
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
                            className="p-1 rounded-md text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                            title="View in Cheat Sheet"
                          >
                            <FileSpreadsheet size={14} />
                          </button>
                        </div>
                        
                        <div className="flex items-center gap-1 flex-wrap justify-end">
                          {airport.cardRules.byFbo ? (
                            Array.from(new Set(airport.cardRules.byFbo.map(f => f.card))).map((card, idx) => {
                              if (card === CardType.WHITE_CARD) {
                                return (
                                  <span key={idx} className="px-1.5 py-0.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-bold uppercase rounded border border-red-100 dark:border-red-800 tracking-wide">
                                      White
                                  </span>
                                );
                              } else if (card === CardType.PCARD) {
                                return (
                                  <span key={idx} className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase rounded border border-blue-100 dark:border-blue-800 tracking-wide">
                                      PCard
                                  </span>
                                );
                              } else if (card === CardType.AVFUEL) {
                                return (
                                  <span key={idx} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 text-[10px] font-bold uppercase rounded border border-slate-300 dark:border-slate-600 tracking-wide">
                                      AVFuel
                                  </span>
                                );
                              }
                              return null;
                            })
                          ) : (
                            <>
                              {isWhiteCard && (
                                  <span className="px-1.5 py-0.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-bold uppercase rounded border border-red-100 dark:border-red-800 tracking-wide">
                                      White Card
                                  </span>
                              )}
                              {!isWhiteCard && airport.cardRules.primary === CardType.PCARD && (
                                  <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase rounded border border-blue-100 dark:border-blue-800 tracking-wide">
                                      PCard
                                  </span>
                              )}
                              {!isWhiteCard && airport.cardRules.primary === CardType.AVFUEL && (
                                  <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 text-[10px] font-bold uppercase rounded border border-slate-300 dark:border-slate-600 tracking-wide">
                                      AVFuel
                                  </span>
                              )}
                            </>
                          )}
                          
                          {airport.cardRules.warning && !isWhiteCard && (
                               <span className="px-1.5 py-0.5 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800 rounded flex items-center justify-center">
                                  <AlertCircle size={12} className="fill-current" />
                               </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{airport.city}, {airport.state}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
        <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center leading-relaxed">
            For SUU Instructors Use Only.<br/>
            <span className="font-semibold text-slate-500 dark:text-slate-400">Not for Navigation.</span>
        </p>
      </div>
    </div>
  );
};

export default Sidebar;
