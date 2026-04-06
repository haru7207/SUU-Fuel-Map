
import React, { useMemo, useState } from 'react';
import { Airport, CardType } from '../types';
import { Search, Plane, AlertCircle, MessageSquare, Settings, X, Sun, Moon, Monitor, Trash2, ChevronLeft, Mail, Phone } from 'lucide-react';

interface SidebarProps {
  airports: Airport[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onOpenGlobalNotes: () => void;
  themeMode: 'day' | 'night' | 'auto';
  setThemeMode: (mode: 'day' | 'night' | 'auto') => void;
  isMobile: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ airports, selectedId, onSelect, searchTerm, setSearchTerm, onOpenGlobalNotes, themeMode, setThemeMode, isMobile, onClose }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [cardFilter, setCardFilter] = useState<CardType | 'ALL'>('ALL');
  
  const filteredAirports = useMemo(() => {
    let filtered = airports;

    if (cardFilter !== 'ALL') {
      filtered = filtered.filter(a => a.cardRules.primary === cardFilter);
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
  }, [airports, searchTerm, cardFilter]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 w-full md:w-80 lg:w-96 shadow-xl z-20">
      <div className="p-5 bg-[#0f172a] text-white flex-shrink-0 border-b border-slate-800">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
             <Plane className="text-red-500 fill-current" size={22} />
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
          </div>
        )}

        {/* Global Notes Button */}
        {!showSettings && (
          <button 
              onClick={onOpenGlobalNotes}
              className="w-full py-2 bg-indigo-900/50 hover:bg-indigo-900 border border-indigo-800 rounded text-xs font-bold text-indigo-200 hover:text-white transition-all flex items-center justify-center gap-2"
          >
              <MessageSquare size={14} />
              View All Pilot Notes
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900">
        {showSettings ? (
          <div className="p-5 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Settings</h2>
            </div>

            {/* Theme Settings */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Appearance</h3>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <button 
                  onClick={() => setThemeMode('day')}
                  className={`w-full flex items-center justify-between p-3 text-sm font-medium transition-colors border-b border-slate-200 dark:border-slate-700 ${themeMode === 'day' ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
                >
                  <div className="flex items-center gap-3">
                    <Sun size={16} />
                    <span>Light Mode</span>
                  </div>
                  {themeMode === 'day' && <div className="w-2 h-2 rounded-full bg-red-500"></div>}
                </button>
                <button 
                  onClick={() => setThemeMode('night')}
                  className={`w-full flex items-center justify-between p-3 text-sm font-medium transition-colors border-b border-slate-200 dark:border-slate-700 ${themeMode === 'night' ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
                >
                  <div className="flex items-center gap-3">
                    <Moon size={16} />
                    <span>Dark Mode</span>
                  </div>
                  {themeMode === 'night' && <div className="w-2 h-2 rounded-full bg-red-500"></div>}
                </button>
                <button 
                  onClick={() => setThemeMode('auto')}
                  className={`w-full flex items-center justify-between p-3 text-sm font-medium transition-colors ${themeMode === 'auto' ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
                >
                  <div className="flex items-center gap-3">
                    <Monitor size={16} />
                    <span>System Auto</span>
                  </div>
                  {themeMode === 'auto' && <div className="w-2 h-2 rounded-full bg-red-500"></div>}
                </button>
              </div>
            </div>

            {/* Data Settings */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Data Management</h3>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <button 
                  onClick={() => {
                    if (window.confirm("Are you sure you want to clear all saved fuel memos? This cannot be undone.")) {
                      localStorage.removeItem('suu_fuel_logs_list');
                      alert("Fuel memos cleared.");
                    }
                  }}
                  className="w-full flex items-center justify-between p-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Trash2 size={16} />
                    <span>Clear Saved Fuel Memos</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Developer Information */}
            <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Developer Information</h3>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-lg">
                    EJ
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200">Elon Jun</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Creator & Developer</p>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <a href="mailto:haru7207.local@gmail.com" className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline">
                    <Mail size={14} />
                    <span>haru7207.local@gmail.com</span>
                  </a>
                  <a href="tel:4356811849" className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white transition-colors">
                    <Phone size={14} />
                    <span>(435) 681-1849</span>
                  </a>
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-1">
                    * Instructors: Please send any bug reports or feedback to the email above.
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                  <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Technical Notes & Disclaimers</h5>
                  <ul className="text-[10px] text-slate-500 dark:text-slate-400 space-y-1.5 list-disc pl-3">
                    <li>Weather data (METAR, TAF, G-AIRMET) is sourced from the FAA AWC API.</li>
                    <li>Runway crosswind calculations are based on current METAR data.</li>
                    <li>FBO & airport data are aggregated from various free APIs.</li>
                    <li>NOTAM data is currently unavailable due to API complexity. If you have experience with NOTAM APIs, please reach out!</li>
                    <li className="text-red-600/80 dark:text-red-400/80 font-medium">All weather data provided here is advisory only. Never use this application as an official weather source for flight planning.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* About */}
            <div className="space-y-3 pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">About</h3>
              <div className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
                <p>SUU Fuel Map v1.2.0</p>
                <p>Designed for SUU Aviation Instructors.</p>
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
                  <button 
                    onClick={() => onSelect(airport.id)}
                    className={`w-full text-left px-5 py-4 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex justify-between items-start group relative ${
                      isSelected ? 'bg-slate-50 dark:bg-slate-800' : ''
                    }`}
                  >
                    {isSelected && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
                    )}
                    <div className="w-full">
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className={`font-bold text-lg ${isSelected ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'}`}>
                            {airport.id}
                        </span>
                        
                        {isWhiteCard && (
                            <span className="px-1.5 py-0.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-bold uppercase rounded border border-red-100 dark:border-red-800 tracking-wide">
                                White Card
                            </span>
                        )}
                        
                        {airport.cardRules.warning && !isWhiteCard && (
                             <span className="px-1.5 py-0.5 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800 rounded flex items-center justify-center">
                                <AlertCircle size={12} className="fill-current" />
                             </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{airport.city}, {airport.state}</p>
                    </div>
                  </button>
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
