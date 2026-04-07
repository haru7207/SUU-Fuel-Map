
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Airport, CardType, WeatherData, UserNote, FuelType, NotamData } from '../types';
import { fetchWeather, fetchPilotNotes, savePilotNote } from '../services/aviationService';
import { X, Phone, AlertTriangle, Fuel, MapPin, CloudSun, RefreshCw, Wind, ArrowUpCircle, Droplets, Clock, WifiOff, Info, MessageSquarePlus, User, Send, MessageCircle, AlertCircle, Lightbulb, CornerDownRight, Trash2, Loader2, EyeOff, HelpCircle, Mail, Radio, Sparkles } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import Markdown from 'react-markdown';

interface AirportDetailsProps {
  airport: Airport;
  onClose: () => void;
  onOpenFuelLog: () => void;
  weatherMap: Record<string, WeatherData>;
  notamMap?: Record<string, NotamData>;
}

type Tab = 'info' | 'weather' | 'notam' | 'notes';

const AirportDetails: React.FC<AirportDetailsProps> = ({ airport, onClose, onOpenFuelLog, weatherMap, notamMap }) => {
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Pilot Notes State
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [submittingNote, setSubmittingNote] = useState(false);
  
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteAuthor, setNewNoteAuthor] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [newNoteType, setNewNoteType] = useState<'general' | 'discrepancy' | 'tip' | 'urgent'>('general');
  const [showNoteForm, setShowNoteForm] = useState(false);
  
  // Reply State
  const [replyingTo, setReplyingTo] = useState<string | null>(null); // Note ID
  const [replyText, setReplyText] = useState('');
  const [replyAuthor, setReplyAuthor] = useState('');
  const [isReplyAnonymous, setIsReplyAnonymous] = useState(false);
  
  // Crosswind Calculator State
  const [selectedRunway, setSelectedRunway] = useState<string>(airport.runways[0] || '18/36');
  
  // NOTAM State
  const [notams, setNotams] = useState<string[]>([]);
  const [loadingNotams, setLoadingNotams] = useState(false);
  const [notamError, setNotamError] = useState<string | null>(null);
  const [notamSource, setNotamSource] = useState<'preloaded' | 'live' | null>(null);

  useEffect(() => {
      if (notamMap && notamMap[airport.id]) {
          setNotams(notamMap[airport.id].rawNotams || []);
          setNotamSource('preloaded');
      }
  }, [notamMap, airport.id]);

  const fetchNotams = useCallback(async () => {
      setLoadingNotams(true);
      setNotamError(null);
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
          const response = await ai.models.generateContent({
              model: 'gemini-3.1-flash-lite-preview',
              contents: `Find the current real-time FAA NOTAMs for airport ${airport.id} (${airport.name}). Return ONLY a JSON object with 'rawNotams' (array of strings containing the raw NOTAM codes, no explanations). If there are no NOTAMs, return an empty array.`,
              config: {
                  tools: [{ googleSearch: {} }],
                  responseMimeType: "application/json",
              }
          });
          if (response.text) {
              try {
                  const data = JSON.parse(response.text);
                  setNotams(data.rawNotams || []);
                  setNotamSource('live');
              } catch (e) {
                  setNotamError("Could not parse NOTAMs.");
              }
          } else {
              setNotamError("Could not retrieve NOTAMs.");
          }
      } catch (error) {
          console.error("Error fetching NOTAMs:", error);
          setNotamError("Failed to fetch NOTAMs. Please try again later.");
      } finally {
          setLoadingNotams(false);
      }
  }, [airport.id, airport.name]);

  useEffect(() => {
      if (activeTab === 'notam' && notams.length === 0 && !notamMap?.[airport.id]) {
          fetchNotams();
      }
  }, [activeTab, fetchNotams, notams.length, notamMap, airport.id]);

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

  const loadNotes = async () => {
    if (isOffline) {
        // Fallback to just static notes if offline
        setNotes(airport.userNotes || []);
        return;
    }

    setLoadingNotes(true);
    try {
        // Fetch real-time notes from API
        const apiNotes = await fetchPilotNotes(airport.id);
        
        // Merge with static notes (deduplicating by ID just in case)
        const staticNotes = airport.userNotes || [];
        const apiIds = new Set(apiNotes.map(n => n.id));
        
        // Only keep static notes that aren't in the API (to avoid duplicates if migrated)
        const uniqueStatic = staticNotes.filter(n => !apiIds.has(n.id));
        
        const combined = [...apiNotes, ...uniqueStatic].sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        
        setNotes(combined);
    } catch (e) {
        console.error("Failed to load notes", e);
        // Fallback to static on error
        setNotes(airport.userNotes || []);
    } finally {
        setLoadingNotes(false);
    }
  };

  const handleAddNote = async () => {
      if (!newNoteText.trim()) return;
      
      setSubmittingNote(true);
      const authorName = isAnonymous ? 'Anonymous' : (newNoteAuthor.trim() || 'Instructor');

      const note: UserNote = {
          id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          text: newNoteText,
          author: authorName,
          type: newNoteType,
          date: new Date().toISOString(),
          replies: []
      };
      
      // Optimistic Update: Add to UI immediately before fetch completes
      setNotes(prev => [note, ...prev]);
      setNewNoteText('');
      setNewNoteAuthor('');
      setNewNoteType('general');
      setIsAnonymous(false);
      setShowNoteForm(false);

      const success = await savePilotNote(note, airport.id);
      
      if (success) {
          // Background refresh to sync with server state
          loadNotes(); 
      } else {
          alert("Note saved locally but sync failed. Please check connection.");
      }
      setSubmittingNote(false);
  };

  const handleAddReply = async (parentId: string) => {
      if (!replyText.trim()) return;
      
      setSubmittingNote(true);
      const authorName = isReplyAnonymous ? 'Anonymous' : (replyAuthor.trim() || 'Instructor');

      const reply: UserNote = {
          id: `reply-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          text: replyText,
          author: authorName,
          date: new Date().toISOString(),
          type: 'general' 
      };

      // Optimistic Update: Add reply to local state
      setNotes(prev => prev.map(n => {
          if (n.id === parentId) {
              return {
                  ...n,
                  replies: [...(n.replies || []), reply]
              };
          }
          return n;
      }));
      
      setReplyText('');
      setReplyAuthor('');
      setIsReplyAnonymous(false);
      setReplyingTo(null);

      const success = await savePilotNote(reply, airport.id, parentId);

      if (success) {
          // Background refresh
          loadNotes(); 
      } else {
          alert("Reply saved locally but sync failed. Please check connection.");
      }
      setSubmittingNote(false);
  };

  useEffect(() => {
    // Reset states
    setShowNoteForm(false);
    setNewNoteText('');
    setReplyingTo(null);
    setIsAnonymous(false);
    setIsReplyAnonymous(false);
    
    // Load data
    loadNotes();
    
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

  const formatObsTime = (timeStr?: string) => {
      if (!timeStr || typeof timeStr !== 'string') return 'N/A';
      // Expecting "YYYY-MM-DD HH:MM:SS"
      const parts = timeStr.split(' ');
      if (parts.length > 1) {
          const time = parts[1].substring(0, 5); // Extract HH:MM
          return `${time}Z`;
      }
      return timeStr;
  }
  
  // Safe date formatter for notes
  const formatNoteDate = (dateStr: string) => {
      try {
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return dateStr; // Return raw string if parse fails
          return d.toLocaleString([], { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      } catch (e) {
          return dateStr || 'Unknown Date';
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

  const getNoteTypeStyles = (type?: string) => {
      switch(type) {
          case 'discrepancy': return 'bg-red-50 border-red-200 text-red-800';
          case 'urgent': return 'bg-orange-50 border-orange-200 text-orange-800';
          case 'tip': return 'bg-blue-50 border-blue-200 text-blue-800';
          default: return 'bg-white border-slate-200 text-slate-800';
      }
  };
  
  const getNoteIcon = (type?: string) => {
      switch(type) {
          case 'discrepancy': return <AlertCircle size={16} className="text-red-500" />;
          case 'urgent': return <AlertTriangle size={16} className="text-orange-500" />;
          case 'tip': return <Lightbulb size={16} className="text-blue-500" />;
          default: return <MessageCircle size={16} className="text-slate-400" />;
      }
  };

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
            NOTAM
            {notamMap && notamMap[airport.id]?.hasFuelAlert && (
                <AlertTriangle size={12} className="text-orange-500" />
            )}
        </button>
        <button 
            onClick={() => setActiveTab('notes')}
            className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${activeTab === 'notes' ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
        >
            Pilot Notes
            {notes.length > 0 && <span className="text-[10px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 rounded-full">{notes.length}</span>}
        </button>
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 dark:bg-slate-900/50">
        
        {/* TAB: INFO */}
        {activeTab === 'info' && (
            <div className="space-y-4 animate-fadeIn">
                {/* NOTAM Fuel Alert */}
                {notamMap && notamMap[airport.id]?.hasFuelAlert && (
                    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-4 rounded-lg flex gap-3 items-start shadow-sm">
                        <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-500 flex-shrink-0 mt-0.5 animate-pulse" />
                        <div>
                            <p className="text-sm text-orange-800 dark:text-orange-400 font-bold uppercase tracking-wide">Fueling NOTAM Alert</p>
                            <p className="text-sm text-orange-700 dark:text-orange-300 font-medium mt-1">
                                There is an active NOTAM regarding fueling or self-serve availability at this airport. Please check the NOTAM tab for details.
                            </p>
                            <button 
                                onClick={() => setActiveTab('notam')}
                                className="mt-2 text-xs font-bold text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 underline"
                            >
                                View NOTAMs
                            </button>
                        </div>
                    </div>
                )}

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
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Fuel & Contact</span>
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
                    <div className="space-y-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-bold text-slate-800">Katie Baca</p>
                                <p className="text-[10px] text-slate-500 uppercase font-bold">Finance Manager</p>
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
                                    Updated: {weather.lastUpdated.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
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
                                    Last Updated: {weather.lastUpdated.toLocaleTimeString()}
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
                    <div className="bg-white p-3 rounded border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className="flex justify-between items-center mb-1">
                             <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">METAR</span>
                                {weather.flightCategory && weather.flightCategory !== 'UNKNOWN' && (
                                    <div 
                                        className={`h-2 w-2 rounded-full ${getFlightCategoryColor(weather.flightCategory).split(' ')[0]}`} 
                                        title={`Flight Category: ${weather.flightCategory}`}
                                    />
                                )}
                             </div>
                             {weather.flightCategory && weather.flightCategory !== 'UNKNOWN' && (
                                 <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                     weather.flightCategory === 'VFR' ? 'bg-green-100 text-green-700' :
                                     weather.flightCategory === 'MVFR' ? 'bg-blue-100 text-blue-700' :
                                     weather.flightCategory === 'IFR' ? 'bg-red-100 text-red-700' :
                                     weather.flightCategory === 'LIFR' ? 'bg-purple-100 text-purple-700' : 
                                     'bg-slate-100 text-slate-600'
                                 }`}>
                                    {weather.flightCategory}
                                 </span>
                             )}
                        </div>
                        <p className="font-mono text-xs text-slate-700 leading-relaxed relative z-10">{weather.metar}</p>
                    </div>
                    <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">TAF</span>
                            {weather.flightCategory && weather.flightCategory !== 'UNKNOWN' && (
                                <div 
                                    className={`h-2 w-2 rounded-full ${getFlightCategoryColor(weather.flightCategory).split(' ')[0]}`} 
                                    title={`Flight Category: ${weather.flightCategory}`}
                                />
                            )}
                        </div>
                        <p className="font-mono text-xs text-slate-700 leading-relaxed">{weather.taf}</p>
                    </div>
                    
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
                    </>
                ) : (
                    <div className="text-center py-8 text-slate-400">Weather unavailable</div>
                )}
            </div>
        )}

        {/* TAB: NOTAM */}
        {activeTab === 'notam' && (
            <div className="flex flex-col h-full animate-fadeIn">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={18} className="text-amber-500" />
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Real-time NOTAMs</h3>
                        {notamSource && !loadingNotams && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                                notamSource === 'preloaded' 
                                ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' 
                                : 'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                            }`}>
                                {notamSource === 'preloaded' ? 'Pre-loaded' : 'Live Fetched'}
                            </span>
                        )}
                    </div>
                    <button 
                        onClick={() => fetchNotams()}
                        disabled={loadingNotams}
                        className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50"
                        title="Refresh NOTAMs"
                    >
                        <RefreshCw size={16} className={loadingNotams ? "animate-spin" : ""} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {loadingNotams ? (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-500 gap-3">
                            <Loader2 size={24} className="animate-spin text-blue-500" />
                            <span className="text-sm font-medium">Fetching latest NOTAMs via AI...</span>
                        </div>
                    ) : notamError ? (
                        <div className="flex flex-col items-center justify-center h-40 text-center">
                            <AlertCircle size={32} className="text-red-400 mb-3" />
                            <p className="text-sm text-slate-600 dark:text-slate-400">{notamError}</p>
                            <button 
                                onClick={fetchNotams}
                                className="mt-4 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    ) : notams && notams.length > 0 ? (
                        <div className="space-y-3 text-left">
                            {notams.map((notam, idx) => (
                                <div key={idx} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded shadow-sm">
                                    <p className="text-sm font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words">
                                        {notam}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                            <span className="text-sm">No NOTAMs available.</span>
                        </div>
                    )}
                </div>
                
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                    <a 
                        href={`https://notams.aim.faa.gov/notamSearch/nsapp.html#/results?searchType=0&designators=${airport.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-2"
                    >
                        Open Official FAA NOTAM Search
                        <CornerDownRight size={16} className="-rotate-90" />
                    </a>
                </div>
            </div>
        )}

        {/* TAB: PILOT NOTES (Replaces NOTAMs) */}
        {activeTab === 'notes' && (
            <div className="space-y-4 animate-fadeIn">
                
                {/* Header / Intro */}
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 flex gap-3 items-start mb-4">
                    <MessageSquarePlus className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-xs font-bold text-indigo-800 uppercase">Instructor Communications</h4>
                        <p className="text-xs text-indigo-700 mt-1">
                            Share fuel discrepancies, tips, or operational notes for this airport. Notes are now synced in real-time.
                        </p>
                    </div>
                </div>

                {/* List of Notes */}
                <div className="space-y-4">
                    {loadingNotes && notes.length === 0 ? (
                         <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                             <Loader2 size={24} className="animate-spin mb-2 text-indigo-500" />
                             <span className="text-xs font-bold">Refreshing notes...</span>
                         </div>
                    ) : notes.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
                            <MessageCircle size={32} className="mx-auto text-slate-300 mb-2" />
                            <p className="text-sm font-bold text-slate-400">No notes yet</p>
                            <button 
                                onClick={() => setShowNoteForm(true)}
                                className="mt-3 text-xs font-bold text-indigo-600 hover:underline"
                            >
                                Be the first to post
                            </button>
                        </div>
                    ) : (
                        notes.map(note => {
                            const isStatic = airport.userNotes?.some(n => n.id === note.id);
                            
                            return (
                                <div key={note.id} className={`rounded-lg border shadow-sm overflow-hidden ${getNoteTypeStyles(note.type)}`}>
                                    <div className="p-3">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                {getNoteIcon(note.type)}
                                                <span className="text-xs font-bold uppercase tracking-wide opacity-80">
                                                    {note.type || 'General'}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[10px] font-bold opacity-60 block">
                                                    {formatNoteDate(note.date)}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <p className="text-sm font-medium whitespace-pre-wrap">{note.text}</p>
                                        
                                        <div className="mt-3 flex justify-between items-end border-t border-black/5 pt-2">
                                            <div className="flex items-center gap-1.5 text-xs font-bold opacity-70">
                                                {note.author === 'Anonymous' ? <EyeOff size={12} /> : <User size={12} />}
                                                <span>{note.author}</span>
                                            </div>
                                            <button 
                                                onClick={() => setReplyingTo(replyingTo === note.id ? null : note.id)}
                                                className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded transition-colors"
                                            >
                                                {replyingTo === note.id ? 'Cancel Reply' : 'Reply'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Replies Section */}
                                    {note.replies && note.replies.length > 0 && (
                                        <div className="bg-slate-50/80 p-3 space-y-3 border-t border-black/5">
                                            {note.replies.map(reply => (
                                                <div key={reply.id} className="flex gap-2 text-sm text-slate-700">
                                                    <CornerDownRight size={14} className="text-slate-400 flex-shrink-0 mt-1" />
                                                    <div className="flex-1 bg-white p-2 rounded border border-slate-200 shadow-sm">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <div className="flex items-center gap-1">
                                                                 {reply.author === 'Anonymous' ? <EyeOff size={10} className="text-slate-400" /> : <User size={10} className="text-slate-400" />}
                                                                 <span className="text-[10px] font-bold text-slate-500">{reply.author}</span>
                                                            </div>
                                                            <span className="text-[9px] text-slate-400">
                                                                {formatNoteDate(reply.date)}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs">{reply.text}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Reply Form */}
                                    {replyingTo === note.id && (
                                        <div className="bg-indigo-50 p-3 border-t border-indigo-100 animate-fadeIn">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="text" 
                                                        placeholder="Your Name"
                                                        disabled={isReplyAnonymous}
                                                        className={`flex-1 text-xs p-2 rounded border border-indigo-200 focus:outline-none focus:border-indigo-400 ${isReplyAnonymous ? 'bg-slate-100 text-slate-400' : 'bg-white'}`}
                                                        value={isReplyAnonymous ? 'Anonymous' : replyAuthor}
                                                        onChange={(e) => setReplyAuthor(e.target.value)}
                                                    />
                                                    <button 
                                                        onClick={() => setIsReplyAnonymous(!isReplyAnonymous)}
                                                        className={`p-2 rounded border text-xs font-bold transition-colors ${isReplyAnonymous ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-indigo-200 hover:bg-indigo-50'}`}
                                                        title="Post Anonymously"
                                                    >
                                                        {isReplyAnonymous ? <EyeOff size={14} /> : <User size={14} />}
                                                    </button>
                                                </div>
                                                <div className="flex gap-2">
                                                    <input 
                                                        type="text" 
                                                        placeholder="Write a reply..."
                                                        className="flex-1 text-xs p-2 rounded border border-indigo-200 focus:outline-none focus:border-indigo-400"
                                                        value={replyText}
                                                        onChange={(e) => setReplyText(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && !submittingNote && handleAddReply(note.id)}
                                                    />
                                                    <button 
                                                        onClick={() => handleAddReply(note.id)}
                                                        disabled={submittingNote}
                                                        className={`bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700 ${submittingNote ? 'opacity-50' : ''}`}
                                                    >
                                                        {submittingNote ? <Loader2 size={14} className="animate-spin"/> : <Send size={14} />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* FAB to Add Note */}
                {!showNoteForm && (
                    <button 
                        onClick={() => setShowNoteForm(true)}
                        className="w-full py-3 mt-4 border-2 border-dashed border-indigo-200 rounded-lg text-indigo-500 font-bold hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                    >
                        <MessageSquarePlus size={18} />
                        Add New Note
                    </button>
                )}

                {/* New Note Form Overlay/Inline */}
                {showNoteForm && (
                    <div className="mt-4 bg-white border border-slate-200 rounded-lg shadow-lg p-4 animate-slide-in-up">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="text-sm font-bold text-slate-800">New Instructor Note</h4>
                            <button onClick={() => setShowNoteForm(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={16} />
                            </button>
                        </div>
                        
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Author</label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            placeholder="Your Name"
                                            disabled={isAnonymous}
                                            className={`w-full text-sm p-2 rounded border border-slate-200 focus:border-indigo-500 focus:outline-none ${isAnonymous ? 'bg-slate-100 text-slate-400' : 'bg-slate-50'}`}
                                            value={isAnonymous ? 'Anonymous' : newNoteAuthor}
                                            onChange={(e) => setNewNoteAuthor(e.target.value)}
                                        />
                                        <button 
                                            onClick={() => setIsAnonymous(!isAnonymous)}
                                            className={`p-2 rounded border transition-colors ${isAnonymous ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}
                                            title="Post Anonymously"
                                        >
                                            {isAnonymous ? <EyeOff size={18} /> : <User size={18} />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Type</label>
                                    <select 
                                        className="w-full text-sm p-2 rounded bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:outline-none"
                                        value={newNoteType}
                                        onChange={(e) => setNewNoteType(e.target.value as any)}
                                    >
                                        <option value="general">General</option>
                                        <option value="discrepancy">Discrepancy</option>
                                        <option value="tip">Fuel Tip</option>
                                        <option value="urgent">Urgent</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Message</label>
                                <textarea 
                                    rows={3}
                                    placeholder="Share details about fuel, pumps, gate codes, etc..."
                                    className="w-full text-sm p-2 rounded bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:outline-none resize-none"
                                    value={newNoteText}
                                    onChange={(e) => setNewNoteText(e.target.value)}
                                />
                            </div>

                            <button 
                                onClick={handleAddNote}
                                disabled={submittingNote}
                                className={`w-full py-2 bg-indigo-600 text-white rounded font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 ${submittingNote ? 'opacity-75 cursor-wait' : ''}`}
                            >
                                {submittingNote ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                {submittingNote ? 'Posting...' : 'Post Note'}
                            </button>
                        </div>
                    </div>
                )}

            </div>
        )}

      </div>
    </div>
  );
};

export default AirportDetails;
