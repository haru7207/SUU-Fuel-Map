
import React, { useState, useEffect, useRef } from 'react';
import { Fuel, X, Trash2, User, Plane, Calendar, FileText, CheckCircle, Info, Save, List, Plus, Edit2, ChevronRight, History, Droplets, CreditCard, Share2, Mail, AlertCircle, Camera, Loader2, Wand2, Clock, Calculator, Sparkles, Search, ChevronDown } from 'lucide-react';
import { AIRPORT_DATABASE } from '../constants';
import { GoogleGenAI, Type } from '@google/genai';
import { Airport, FuelType } from '../types';

interface FuelLogToggleProps {
  currentAirportId: string | null;
  isOnline?: boolean;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  isHidden?: boolean;
  onOpenFlightTime?: () => void;
  isFlightTimeOpen?: boolean;
  airports?: Airport[];
}

interface FuelLogData {
  id: string;
  airport: string;
  tailNumber: string;
  gallons: string;
  usedCard: string;
  dateTime: string;
  instructor: string;
  student: string;
  notes: string;
  timestamp: number;
}

const STORAGE_KEY = 'suu_fuel_logs_list';
const OLD_STORAGE_KEY = 'suu_fuel_log_draft';

const FuelLogToggle: React.FC<FuelLogToggleProps> = ({ 
  currentAirportId, 
  isOnline = true, 
  isOpen, 
  setIsOpen, 
  isHidden = false,
  onOpenFlightTime,
  isFlightTimeOpen,
  airports
}) => {
  const [view, setView] = useState<'form' | 'list' | 'calc'>('form');
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Calculator states
  const [calcAirport, setCalcAirport] = useState<string>('');
  const [calcFuelType, setCalcFuelType] = useState<string>('');
  const [calcGallons, setCalcGallons] = useState<string>('50');
  const [customPriceOverride, setCustomPriceOverride] = useState<string>('');
  const [useCustomPrice, setUseCustomPrice] = useState<boolean>(false);

  // Searchable select states inside the calculator
  const [airportSearchInput, setAirportSearchInput] = useState<string>('');
  const [isAirportDropdownOpen, setIsAirportDropdownOpen] = useState<boolean>(false);
  const [calcSearchHighlightedIndex, setCalcSearchHighlightedIndex] = useState<number>(-1);
  const [selectedFboIndex, setSelectedFboIndex] = useState<number>(0);
  const airportContainerRef = useRef<HTMLDivElement>(null);

  // Default fallback or live-updated list
  const activeAirports = airports || AIRPORT_DATABASE;

  useEffect(() => {
    setSelectedFboIndex(0);
  }, [calcAirport]);

  // Auto-fill calcAirport from currentAirportId when sidebar or map updates
  useEffect(() => {
    if (currentAirportId) {
      setCalcAirport(currentAirportId);
    }
  }, [currentAirportId]);

  // Sync display search input when calcAirport matches an airport
  useEffect(() => {
    const found = activeAirports.find(a => a.id === calcAirport);
    if (found) {
      setAirportSearchInput(`${found.id} - ${found.name}`);
    } else {
      setAirportSearchInput('');
    }
  }, [calcAirport, activeAirports]);

  // Click outside to close dropdown and restore search field to selected airport
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (airportContainerRef.current && !airportContainerRef.current.contains(event.target as Node)) {
        setIsAirportDropdownOpen(false);
        const found = activeAirports.find(a => a.id === calcAirport);
        if (found) {
          setAirportSearchInput(`${found.id} - ${found.name}`);
        } else {
          setAirportSearchInput('');
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [calcAirport, activeAirports]);

  // Filter list of airports matching user search input
  const filteredAirportsForCalc = activeAirports.filter(a => {
    const query = airportSearchInput.toLowerCase().trim();
    const selectedText = calcAirport ? (() => {
      const found = activeAirports.find(ap => ap.id === calcAirport);
      return found ? `${found.id} - ${found.name}`.toLowerCase() : '';
    })() : '';

    if (!query || query === selectedText) return true;
    return (
      a.id.toLowerCase().includes(query) ||
      a.name.toLowerCase().includes(query) ||
      a.city.toLowerCase().includes(query) ||
      a.state.toLowerCase().includes(query)
    );
  });

  // Reset highlight index when filter query changes
  useEffect(() => {
    setCalcSearchHighlightedIndex(-1);
  }, [airportSearchInput]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isAirportDropdownOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsAirportDropdownOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCalcSearchHighlightedIndex(prev => 
        prev < filteredAirportsForCalc.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCalcSearchHighlightedIndex(prev => 
        prev > 0 ? prev - 1 : filteredAirportsForCalc.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (calcSearchHighlightedIndex >= 0 && calcSearchHighlightedIndex < filteredAirportsForCalc.length) {
        const selected = filteredAirportsForCalc[calcSearchHighlightedIndex];
        setCalcAirport(selected.id);
        setIsAirportDropdownOpen(false);
      } else if (filteredAirportsForCalc.length > 0) {
        // Default to first option if enter pressed and no highlighted item
        setCalcAirport(filteredAirportsForCalc[0].id);
        setIsAirportDropdownOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsAirportDropdownOpen(false);
    }
  };

  // Find currently selected airport in calculator
  const selectedCalcAirportObj = activeAirports.find(a => a.id === calcAirport);

  // Automatically adjust default fuel type depending on selected airport
  useEffect(() => {
    if (selectedCalcAirportObj) {
      const types = selectedCalcAirportObj.fuelTypes || [];
      if (types.length > 0 && !types.includes(calcFuelType as FuelType)) {
        setCalcFuelType(types[0]);
      }
    }
  }, [calcAirport, selectedCalcAirportObj]);

  // Get fuel price per gallon
  const fuelPricePerGallon = selectedCalcAirportObj && calcFuelType
    ? selectedCalcAirportObj.fuelPrices?.[calcFuelType] || null
    : null;

  // Sync pricing overrides
  useEffect(() => {
    if (fuelPricePerGallon !== null) {
      setCustomPriceOverride(fuelPricePerGallon.toString());
    } else {
      setCustomPriceOverride('');
    }
    setUseCustomPrice(false);
  }, [calcAirport, calcFuelType, fuelPricePerGallon]);

  const activeRate = useCustomPrice && customPriceOverride ? parseFloat(customPriceOverride) : (fuelPricePerGallon || 0);
  const finalCalculatedCost = activeRate && calcGallons ? (activeRate * parseFloat(calcGallons)) : 0;

  const handleApplyToMemo = () => {
    let cardToUse = "";
    if (selectedCalcAirportObj) {
      if (selectedCalcAirportObj.cardRules?.byFbo && selectedCalcAirportObj.cardRules.byFbo[selectedFboIndex]) {
        cardToUse = selectedCalcAirportObj.cardRules.byFbo[selectedFboIndex].card;
      } else if (selectedCalcAirportObj.cardRules?.byFuelType?.[calcFuelType]) {
        cardToUse = selectedCalcAirportObj.cardRules.byFuelType[calcFuelType];
      } else if (selectedCalcAirportObj.cardRules?.primary) {
        cardToUse = selectedCalcAirportObj.cardRules.primary;
      }
    }

    setFormData(prev => ({
      ...prev,
      airport: calcAirport,
      gallons: calcGallons,
      usedCard: cardToUse || prev.usedCard
    }));
    setView('form');
  };
  
  // Initialize logs state
  const [logs, setLogs] = useState<FuelLogData[]>(() => {
    const savedList = localStorage.getItem(STORAGE_KEY);
    let initialLogs: FuelLogData[] = [];
    
    if (savedList) {
      try {
        initialLogs = JSON.parse(savedList);
      } catch (e) {
        console.error("Failed to parse saved fuel logs", e);
      }
    }

    // Migration: Check for old single draft and convert to list item
    const oldDraft = localStorage.getItem(OLD_STORAGE_KEY);
    if (oldDraft) {
      try {
        const draft = JSON.parse(oldDraft);
        if (draft.airport || draft.tailNumber || draft.notes) {
            const now = Date.now();
            const migratedLog = { 
                ...draft, 
                id: `log-${now}`,
                gallons: '', 
                usedCard: '',
                timestamp: now
            };
            initialLogs.push(migratedLog);
        }
        localStorage.removeItem(OLD_STORAGE_KEY);
      } catch (e) {}
    }
    
    return initialLogs;
  });

  // Sort logs by time (Newest first)
  const sortedLogs = [...logs].sort((a, b) => b.timestamp - a.timestamp);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const getEmptyForm = (): FuelLogData => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return {
      id: '',
      airport: '',
      tailNumber: '',
      gallons: '',
      usedCard: '',
      dateTime: now.toISOString().slice(0, 16),
      instructor: '',
      student: '',
      notes: '',
      timestamp: Date.now()
    };
  };

  const [formData, setFormData] = useState<FuelLogData>(() => {
    const savedDraft = localStorage.getItem('suu_fuel_log_form_draft');
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        return { ...getEmptyForm(), ...parsed };
      } catch (e) {
        console.error("Failed to parse saved fuel draft", e);
      }
    }
    return getEmptyForm();
  });

  useEffect(() => {
    if (!editingId && view === 'form') {
      localStorage.setItem('suu_fuel_log_form_draft', JSON.stringify(formData));
    }
  }, [formData, editingId, view]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    try {
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64Data = (reader.result as string).split(',')[1];
            
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            
            const response = await ai.models.generateContent({
                model: 'gemini-3.1-flash-lite',
                contents: [
                    {
                        inlineData: {
                            data: base64Data,
                            mimeType: file.type
                        }
                    },
                    "Extract the following information from this fuel receipt. Return ONLY a JSON object with these exact keys: 'airport' (ICAO code, e.g. KCDC), 'tailNumber' (e.g. N12345), 'gallons' (number as string), 'usedCard' (one of: 'PCard', 'AVFuel', 'White Card', or 'Unknown'). If you can't find a value, leave it as an empty string."
                ],
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            airport: { type: Type.STRING },
                            tailNumber: { type: Type.STRING },
                            gallons: { type: Type.STRING },
                            usedCard: { type: Type.STRING }
                        }
                    }
                }
            });

            if (response.text) {
                try {
                    const data = JSON.parse(response.text);
                    setFormData(prev => ({
                        ...prev,
                        airport: data.airport || prev.airport,
                        tailNumber: data.tailNumber || prev.tailNumber,
                        gallons: data.gallons || prev.gallons,
                        usedCard: data.usedCard || prev.usedCard
                    }));
                } catch (e) {
                    console.error("Failed to parse Gemini response", e);
                }
            }
            setIsAnalyzing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsDataURL(file);
    } catch (error) {
        console.error("Error analyzing image:", error);
        setIsAnalyzing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSmartFormat = async () => {
      if (!formData.notes) return;
      setIsFormatting(true);
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
          const response = await ai.models.generateContent({
              model: 'gemini-3.1-flash-lite',
              contents: `Format the following pilot notes to be professional, clear, and concise. Fix any typos. Notes: "${formData.notes}"`
          });
          if (response.text) {
              setFormData(prev => ({ ...prev, notes: response.text || prev.notes }));
          }
      } catch (error) {
          console.error("Error formatting notes:", error);
      }
      setIsFormatting(false);
  };

  // Persist logs
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  }, [logs]);

  // Auto-fill airport
  useEffect(() => {
    if (currentAirportId && isOpen && !editingId && !formData.airport && view === 'form') {
      setFormData(prev => ({ ...prev, airport: currentAirportId }));
    }
  }, [currentAirportId, isOpen, editingId, formData.airport, view]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    // Basic validation
    if (!formData.airport && !formData.tailNumber) {
        alert("Please enter at least an Airport or Tail Number.");
        return;
    }

    const newLog = { 
        ...formData, 
        id: editingId || `log-${Date.now()}`,
        timestamp: editingId ? formData.timestamp : Date.now()
    };
    
    if (editingId) {
        setLogs(prev => prev.map(l => l.id === editingId ? newLog : l));
    } else {
        setLogs(prev => [...prev, newLog]);
    }
    
    // Show feedback
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);

    // Switch to list
    setEditingId(null);
    setFormData(getEmptyForm());
    localStorage.removeItem('suu_fuel_log_form_draft');
    setView('list');
  };

  const handleEdit = (log: FuelLogData) => {
      // Merge with empty form to ensure new fields (gallons, usedCard) exist if editing an old log
      setFormData({
          ...getEmptyForm(),
          ...log
      });
      setEditingId(log.id);
      setView('form');
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (window.confirm("Delete this memo?")) {
          setLogs(prev => prev.filter(l => l.id !== id));
          if (editingId === id) {
              setEditingId(null);
              setFormData(getEmptyForm());
              localStorage.removeItem('suu_fuel_log_form_draft');
              setView('list');
          }
      }
  };

  const handleNewEntry = () => {
      setEditingId(null);
      
      const savedDraft = localStorage.getItem('suu_fuel_log_form_draft');
      if (savedDraft) {
          try {
              const parsed = JSON.parse(savedDraft);
              setFormData({ ...getEmptyForm(), ...parsed });
              setView('form');
              return;
          } catch (e) {}
      }

      setFormData(getEmptyForm());
      if (currentAirportId) {
          setFormData(prev => ({...prev, airport: currentAirportId}));
      }
      setView('form');
  };

  const handleClearForm = () => {
      if (window.confirm("Clear current form?")) {
          setFormData(getEmptyForm());
          if (currentAirportId) {
             setFormData(prev => ({...prev, airport: currentAirportId}));
          }
          localStorage.removeItem('suu_fuel_log_form_draft');
      }
  };

  const formatLogForSharing = (log: FuelLogData) => {
    return `SUU Fuel Memo
-------------------
Airport: ${log.airport || 'N/A'}
Tail #: ${log.tailNumber || 'N/A'}
Date/Time: ${new Date(log.dateTime).toLocaleString()}
Gallons: ${log.gallons || 'N/A'}
Card Used: ${log.usedCard || 'N/A'}
Instructor: ${log.instructor || 'N/A'}
Student: ${log.student || 'N/A'}
Notes: ${log.notes || 'None'}
`;
  };

  const [isFuelMenuOpen, setIsFuelMenuOpen] = useState(false);

  // Focus ref for dropdown
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsFuelMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.addEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  const handleShare = async (log: FuelLogData, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const text = formatLogForSharing(log);
    const title = `Fuel Memo - ${log.tailNumber || log.airport || 'Unknown'}`;
    
    if (navigator.share) {
        try {
            await navigator.share({
                title: title,
                text: text,
            });
        } catch (err) {
            console.error("Error sharing", err);
        }
    } else {
        // Fallback to clipboard
        navigator.clipboard.writeText(text);
        alert("Memo copied to clipboard!");
    }
  };

  const handleEmail = (log: FuelLogData, email: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const text = formatLogForSharing(log);
    const subject = `Fuel Memo - ${log.tailNumber || log.airport || 'Unknown'}`;
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
  };

  return (
    <>
      {/* Floating Action Buttons */}
      {!isOpen && !isFlightTimeOpen && !isHidden && (
        <div className={`absolute top-20 left-4 md:top-4 md:left-6 z-[1050] transition-all ${!isOnline ? 'mt-6' : ''}`} ref={dropdownRef}>
          <button
            onClick={() => setIsFuelMenuOpen(!isFuelMenuOpen)}
            className={`flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 rounded-full shadow-xl transition-all active:scale-95 group ${isFuelMenuOpen ? 'bg-red-700 text-white' : 'bg-red-600 text-white hover:bg-red-700 hover:scale-105'}`}
          >
            <Fuel size={16} className="md:w-5 md:h-5 group-hover:rotate-12 transition-transform" />
            <span className="font-bold tracking-wide text-sm md:text-base">Fuel Ops</span>
          </button>

          {isFuelMenuOpen && (
            <div className="absolute top-full mt-2 w-full min-w-[200px] bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col z-[1060]">
              <button
                onClick={() => {
                  setIsOpen(true);
                  setView('form');
                  setIsFuelMenuOpen(false);
                }}
                className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold text-left transition-colors"
              >
                <Fuel size={16} className="text-red-500" />
                Log Fuel
              </button>

              <button
                onClick={() => {
                  setIsOpen(true);
                  setView('calc');
                  setIsFuelMenuOpen(false);
                }}
                className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold text-left transition-colors"
              >
                <Calculator size={16} className="text-blue-500" />
                Fuel Price Calculator
              </button>
              
              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLScmBQPQeOxgMnq4UEvxzg5HwEe-x2Owj3kVpV4pWbpXrxhoHg/viewform"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsFuelMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold text-left transition-colors"
              >
                <AlertCircle size={16} className="text-orange-500" />
                Fuel Error Report
              </a>
            </div>
          )}
        </div>
      )}

      {/* Slide-up/Popover Panel - Bottom Sheet on Mobile */}
      {isOpen && (
        <div className="absolute z-[1060] bottom-0 left-0 right-0 md:bottom-auto md:top-20 md:left-6 md:right-auto md:w-96 bg-white dark:bg-slate-900 rounded-t-2xl md:rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden animate-slide-in-up h-[85vh] md:h-[600px] md:max-h-[75vh]">
          
          {/* Header */}
          <div className="bg-slate-900 text-white px-5 py-4 flex justify-between items-center flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="bg-red-600 p-1.5 rounded-lg">
                <Fuel size={18} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-base leading-tight">Quick Fuel Memo</h3>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white hover:bg-slate-700 p-1.5 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
              <button 
                onClick={() => setView('form')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors ${
                    view === 'form' 
                    ? 'bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 border-b-2 border-red-600 dark:border-red-400 font-extrabold' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Edit2 size={13} />
                {editingId ? 'Edit Memo' : 'New Memo'}
              </button>
              <button 
                onClick={() => setView('calc')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors ${
                    view === 'calc' 
                    ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 border-b-2 border-amber-600 dark:border-amber-400 font-extrabold' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Calculator size={13} />
                Calculator
              </button>
              <button 
                onClick={() => setView('list')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors ${
                    view === 'list' 
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 font-extrabold' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <List size={13} />
                Saved ({logs.length})
              </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 custom-scrollbar relative">
            
            {/* VIEW: FORM */}
            {view === 'form' && (
                <div className="p-5 space-y-4">
                    
                    {/* Instruction Sticky Note */}
                    <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r shadow-sm flex gap-3 items-start">
                    <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-900 font-medium leading-relaxed">
                        Use this for fuel log quick memo. Please note this is for temporary reference only before official portal entry.
                    </p>
                    </div>

                    {/* AI Receipt Scanner */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                            <Camera size={18} />
                            <span className="text-xs font-bold">Auto-fill from Receipt</span>
                        </div>
                        <div className="relative">
                            <input 
                                type="file" 
                                accept="image/*" 
                                capture="environment"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                onChange={handleImageUpload}
                                ref={fileInputRef}
                                disabled={isAnalyzing}
                            />
                            <button 
                                disabled={isAnalyzing}
                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1.5 px-3 rounded flex items-center gap-2 transition-colors disabled:opacity-50"
                            >
                                {isAnalyzing ? (
                                    <><Loader2 size={12} className="animate-spin" /> Analyzing...</>
                                ) : (
                                    'Take Photo'
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                    {/* Airport */}
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                        <Plane size={10} /> Airport
                        </label>
                        <div className="relative">
                        <input 
                            list="airports"
                            name="airport"
                            className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm font-bold text-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none uppercase"
                            placeholder="ICAO"
                            value={formData.airport}
                            onChange={handleChange}
                        />
                        <datalist id="airports">
                            {AIRPORT_DATABASE.map(a => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                        </datalist>
                        </div>
                    </div>

                    {/* Tail Number */}
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                        <Plane size={10} /> Tail #
                        </label>
                        <input 
                        type="text"
                        name="tailNumber"
                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm font-bold text-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none uppercase"
                        placeholder="N..."
                        value={formData.tailNumber}
                        onChange={handleChange}
                        />
                    </div>
                    </div>

                    {/* Gallons and Card (NEW) */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Gallons */}
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                                <Droplets size={10} /> Gallons
                            </label>
                            <input 
                                type="number"
                                name="gallons"
                                className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm font-bold text-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                                placeholder="0.0"
                                value={formData.gallons}
                                onChange={handleChange}
                            />
                        </div>

                        {/* Used Card */}
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                                <CreditCard size={10} /> Used Card
                            </label>
                            <select 
                                name="usedCard"
                                className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm font-bold text-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                                value={formData.usedCard}
                                onChange={handleChange}
                            >
                                <option value="">Select...</option>
                                <option value="PCard">PCard (US Bank)</option>
                                <option value="Avfuel">Avfuel (Black)</option>
                                <option value="White Card">White Card</option>
                                <option value="Reimbursement">Personal/Reimburse</option>
                            </select>
                        </div>
                    </div>

                    {/* Date Time */}
                    <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                        <Calendar size={10} /> Date & Time
                    </label>
                    <input 
                        type="datetime-local"
                        name="dateTime"
                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm font-medium text-slate-700 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                        value={formData.dateTime}
                        onChange={handleChange}
                    />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                    {/* Instructor */}
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                        <User size={10} /> Instructor
                        </label>
                        <input 
                        type="text"
                        name="instructor"
                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm text-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                        placeholder="Last Name"
                        value={formData.instructor}
                        onChange={handleChange}
                        />
                    </div>

                    {/* Student */}
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                        <User size={10} /> Student
                        </label>
                        <input 
                        type="text"
                        name="student"
                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm text-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                        placeholder="Last Name"
                        value={formData.student}
                        onChange={handleChange}
                        />
                    </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-1">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                            <FileText size={10} /> Notes / Issues
                        </label>
                        <button
                            onClick={handleSmartFormat}
                            disabled={isFormatting || !formData.notes}
                            className="text-[10px] font-bold text-blue-600 hover:text-blue-800 disabled:opacity-50 flex items-center gap-1"
                            title="Auto-format notes"
                        >
                            {isFormatting ? <Loader2 size={10} className="animate-spin" /> : <Wand2 size={10} />}
                            Smart Format
                        </button>
                    </div>
                    <textarea 
                        name="notes"
                        rows={3}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm text-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none resize-none"
                        placeholder="e.g. Pump was slow, grounding wire damaged..."
                        value={formData.notes}
                        onChange={handleChange}
                    />
                    </div>
                </div>
            )}

            {/* VIEW: CALCULATOR */}
            {view === 'calc' && (
                <div className="p-5 space-y-4">
                    <div className="bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-400 p-3 rounded-r shadow-sm flex gap-3 items-start">
                        <Calculator size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-900 dark:text-amber-200 font-medium leading-relaxed">
                            A dynamic price estimator. Choose an airport, specify your gallons, and calculate the estimated price per gallon using either original DB rates or automatic live data.
                        </p>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/60">
                        {/* 1. Airport Selector */}
                        <div className="space-y-1 relative" ref={airportContainerRef}>
                            <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                                <Plane size={10} /> Select Airport
                            </label>
                            
                            <div className="relative">
                                <input
                                    type="text"
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 pl-9 pr-14 text-sm font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all placeholder:text-slate-400 placeholder:font-normal"
                                    placeholder="Type code, name, city or state..."
                                    value={airportSearchInput}
                                    onFocus={() => setIsAirportDropdownOpen(true)}
                                    onChange={(e) => {
                                        setAirportSearchInput(e.target.value);
                                        setIsAirportDropdownOpen(true);
                                    }}
                                    onKeyDown={handleKeyDown}
                                />
                                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                    {airportSearchInput && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAirportSearchInput('');
                                                setCalcAirport('');
                                                setIsAirportDropdownOpen(true);
                                            }}
                                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                                            title="Clear airport selection"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setIsAirportDropdownOpen(!isAirportDropdownOpen)}
                                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                                    >
                                        <ChevronDown size={14} className={`transform transition-transform duration-200 ${isAirportDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                </div>
                            </div>

                            {/* Dropdown popup */}
                            {isAirportDropdownOpen && (
                                <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl divide-y divide-slate-100 dark:divide-slate-800">
                                    {filteredAirportsForCalc.length > 0 ? (
                                        filteredAirportsForCalc.map((a, idx) => {
                                            const isSelected = a.id === calcAirport;
                                            const isHighlighted = idx === calcSearchHighlightedIndex;
                                            return (
                                                <button
                                                    key={a.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setCalcAirport(a.id);
                                                        setIsAirportDropdownOpen(false);
                                                    }}
                                                    className={`w-full text-left px-3.5 py-2.5 flex justify-between items-center transition-colors ${
                                                        isSelected 
                                                        ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 font-bold' 
                                                        : isHighlighted
                                                        ? 'bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold'
                                                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                                                    }`}
                                                >
                                                    <div className="flex-1 min-w-0 pr-2">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-xs font-black tracking-wide text-slate-800 dark:text-slate-100">{a.id}</span>
                                                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold max-w-[200px] truncate">{a.name}</span>
                                                        </div>
                                                        <div className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">
                                                            {a.city}, {a.state}
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Fuel Types info badge */}
                                                    <div className="flex gap-1 items-center flex-shrink-0">
                                                        {(a.fuelTypes || []).map(f => (
                                                            <span key={f} className="text-[8px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded uppercase">
                                                                {f}
                                                            </span>
                                                        ))}
                                                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 ml-1.5"></span>}
                                                    </div>
                                                </button>
                                            );
                                        })
                                    ) : (
                                        <div className="p-4 text-xs text-center text-slate-400 dark:text-slate-500 font-medium font-sans">
                                            No matching regional airports found
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 2. Fuel Type Selector */}
                        {selectedCalcAirportObj && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                                    <Droplets size={10} /> Fuel Type
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {selectedCalcAirportObj.fuelTypes.map((type) => {
                                        const rate = selectedCalcAirportObj.fuelPrices?.[type];
                                        return (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setCalcFuelType(type)}
                                                className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all flex flex-col items-center justify-center ${
                                                    calcFuelType === type
                                                    ? 'bg-amber-500 border-amber-600 text-white shadow-sm'
                                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                                }`}
                                            >
                                                <span>{type}</span>
                                                <span className={`text-[10px] opacity-90 mt-0.5 font-mono`}>
                                                    {rate ? `$${rate.toFixed(2)}` : 'N/A'}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 3. Gallons Input with Preset Buttons */}
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                                <Droplets size={10} /> Gallons to Purchase
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    step="any"
                                    value={calcGallons}
                                    onChange={(e) => setCalcGallons(e.target.value)}
                                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm font-bold text-slate-800 dark:text-slate-105 outline-none"
                                    placeholder="0.0"
                                />
                                <div className="flex gap-1 shrink-0 items-center">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const current = parseFloat(calcGallons || '0');
                                            const newVal = Math.max(0, current - 0.5);
                                            setCalcGallons(Number(newVal.toFixed(1)).toString());
                                        }}
                                        className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-705 text-slate-600 dark:text-slate-300 text-[9px] font-bold h-7 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 transition-colors"
                                        title="Decrease by 0.5G"
                                    >
                                        -0.5G
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const current = parseFloat(calcGallons || '0');
                                            const newVal = current + 0.5;
                                            setCalcGallons(Number(newVal.toFixed(1)).toString());
                                        }}
                                        className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-705 text-slate-600 dark:text-slate-300 text-[9px] font-bold h-7 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 transition-colors"
                                        title="Increase by 0.5G"
                                    >
                                        +0.5G
                                    </button>
                                </div>
                            </div>
                            
                            {/* Preset Buttons */}
                            <div className="flex gap-1 mt-1.5 overflow-x-auto py-1">
                                {['10', '20', '25', '30', '35', '40', '50'].map((amt) => (
                                    <button
                                        key={amt}
                                        type="button"
                                        onClick={() => setCalcGallons(amt)}
                                        className="bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 text-[10px] font-bold px-2 py-1 rounded transition-colors whitespace-nowrap min-w-[32px] text-center"
                                    >
                                        {amt}G
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => setCalcGallons('')}
                                    className="bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-bold px-2 py-1 rounded transition-colors"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>

                        {/* 4. Price overrides */}
                        <div className="border-t border-slate-200/50 dark:border-slate-700/50 pt-2.5 mt-1">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={useCustomPrice}
                                    onChange={(e) => setUseCustomPrice(e.target.checked)}
                                    className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 h-3.5 w-3.5"
                                />
                                <span className="text-[10px] uppercase font-bold text-slate-500 select-none">
                                    Override Price Per Gallon
                                </span>
                            </label>
                            
                            {useCustomPrice && (
                                <div className="mt-1.5 flex items-center gap-1.5 animate-fade-in">
                                    <span className="text-sm font-bold text-slate-500">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={customPriceOverride}
                                        onChange={(e) => setCustomPriceOverride(e.target.value)}
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-105 outline-none"
                                        placeholder="0.00"
                                    />
                                    <span className="text-xs text-slate-400 font-bold whitespace-nowrap">/ gal</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Cost breakdown Display Card */}
                    <div className="bg-gradient-to-br from-slate-800 to-slate-950 dark:from-slate-950 dark:to-slate-905 text-white rounded-xl p-5 shadow-lg border border-slate-700/30 flex flex-col items-center justify-center text-center relative overflow-hidden">
                        {/* Subtle background glow */}
                        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-16 h-16 rounded-full bg-amber-500/10 blur-xl"></div>
                        <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-24 h-24 rounded-full bg-blue-500/10 blur-xl"></div>

                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                            Estimated Total Cost
                        </span>
                        
                        <div className="text-3xl font-black font-mono text-amber-400 tracking-tight flex items-baseline">
                            ${finalCalculatedCost.toLocaleString([], { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>

                        <div className="text-xs text-slate-300 mt-2 font-medium flex items-center gap-1.5">
                            {useCustomPrice ? (
                                <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded border border-amber-500/20 text-[10px]">
                                    Override Price: ${parseFloat(customPriceOverride || '0').toFixed(2)}/gal
                                </span>
                            ) : selectedCalcAirportObj && fuelPricePerGallon !== null ? (
                                selectedCalcAirportObj.fuelPricesLastUpdated ? (
                                    <span className="inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/20 text-[10px]">
                                        Live Price: ${fuelPricePerGallon.toFixed(2)}/gal
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 bg-slate-500/15 text-slate-300 px-2 py-0.5 rounded border border-slate-500/20 text-[10px]">
                                        DB Price: ${fuelPricePerGallon.toFixed(2)}/gal
                                    </span>
                                )
                            ) : (
                                <span className="text-[10px] text-red-300 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                                    No price data found for selected fuel type
                                </span>
                            )}
                        </div>

                        {selectedCalcAirportObj && (
                          selectedCalcAirportObj.cardRules?.byFbo ? (
                            <div className="mt-3 pt-2.5 border-t border-slate-700/50">
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wide block mb-1.5">Select FBO / Refueling Station:</span>
                              <div className="flex flex-col gap-1.5">
                                {selectedCalcAirportObj.cardRules.byFbo.map((fboRule, idx) => {
                                  const isSelected = selectedFboIndex === idx;
                                  return (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => setSelectedFboIndex(idx)}
                                      className={`text-left px-2.5 py-1.5 rounded transition-all flex justify-between items-center border text-[11px] ${
                                        isSelected
                                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 font-bold'
                                          : 'bg-slate-800/20 border-transparent text-slate-400 hover:text-slate-200'
                                      }`}
                                    >
                                      <div className="flex flex-col">
                                        <span className="font-bold">{fboRule.name}</span>
                                        {fboRule.vendor && (
                                          <span className="text-[9px] opacity-75 font-normal">Vendor: {fboRule.vendor}</span>
                                        )}
                                      </div>
                                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                        fboRule.card === CardType.WHITE_CARD 
                                          ? 'bg-red-500/10 text-red-305' 
                                          : fboRule.card === CardType.PCARD 
                                          ? 'bg-blue-500/10 text-blue-305' 
                                          : 'bg-slate-705 text-slate-305'
                                      }`}>
                                        {fboRule.card === CardType.WHITE_CARD ? 'White' : fboRule.card === CardType.PCARD ? 'PCard' : 'AVFuel'}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <p className="text-[9px] text-slate-500 mt-3 font-semibold uppercase tracking-wide">
                                {selectedCalcAirportObj.fbo}
                            </p>
                          )
                        )}
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-3.5 pt-1">
                        <button
                            type="button"
                            onClick={() => {
                                const rateStr = useCustomPrice ? `${parseFloat(customPriceOverride || '0').toFixed(2)} (Custom)` : `$${(fuelPricePerGallon || 0).toFixed(2)}`;
                                const text = `Fuel Estimate for ${calcAirport || 'N/A'}:\n--------------------\nFuel Rate: ${rateStr}/gal\nGallons: ${calcGallons || '0'}G\nEstimated Cost: $${finalCalculatedCost.toFixed(2)}`;
                                navigator.clipboard.writeText(text);
                                setIsCopied(true);
                                setTimeout(() => setIsCopied(false), 2000);
                            }}
                            className={`py-2.5 px-4 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                                isCopied 
                                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm'
                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-705 text-slate-700 dark:text-slate-205'
                            }`}
                        >
                            {isCopied ? (
                                <>
                                    <CheckCircle size={14} className="animate-fade-in" />
                                    Copied!
                                </>
                            ) : (
                                "Copy Estimate"
                            )}
                        </button>
                        
                        <button
                            type="button"
                            disabled={!calcAirport}
                            onClick={handleApplyToMemo}
                            className="py-2.5 px-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md"
                        >
                            Apply to Memo
                        </button>
                    </div>
                </div>
            )}

            {/* VIEW: LIST */}
            {view === 'list' && (
                <div className="p-4 space-y-3">
                    {logs.length === 0 ? (
                        <div className="text-center py-10 opacity-50 flex flex-col items-center">
                            <History size={48} className="text-slate-300 mb-2" />
                            <p className="text-sm font-bold text-slate-500">No saved memos</p>
                            <button 
                                onClick={handleNewEntry}
                                className="mt-4 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline"
                            >
                                Create your first memo
                            </button>
                        </div>
                    ) : (
                        sortedLogs.map((log, index) => {
                            const logNumber = logs.length - index;

                            return (
                                <div key={log.id} 
                                    onClick={() => handleEdit(log)}
                                    className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group relative"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-1.5 py-0.5 rounded">
                                                #{logNumber}
                                            </span>
                                            <span className="text-lg font-black text-slate-800">{log.airport || '---'}</span>
                                            <span className="text-sm font-bold text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                                {log.tailNumber || 'No Tail'}
                                            </span>
                                        </div>
                                        <div className="text-[10px] font-bold text-slate-400">
                                            {new Date(log.dateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </div>
                                    </div>
                                    
                                    {/* Gallons and Card Details (List View) */}
                                    <div className="flex gap-2 mb-2">
                                        {log.gallons && (
                                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 flex items-center gap-0.5">
                                                <Droplets size={10} /> {log.gallons} gal
                                            </span>
                                        )}
                                        {log.usedCard && (
                                            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 flex items-center gap-0.5">
                                                <CreditCard size={10} /> {log.usedCard}
                                            </span>
                                        )}
                                    </div>
                                    
                                    <div className="text-xs text-slate-600 mb-2 flex gap-4">
                                        <span><span className="text-slate-400">Instr:</span> {log.instructor || '-'}</span>
                                        <span><span className="text-slate-400">Stu:</span> {log.student || '-'}</span>
                                    </div>

                                    {log.notes && (
                                        <div className="text-xs italic text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 mb-2 truncate">
                                            "{log.notes}"
                                        </div>
                                    )}
                                    
                                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-50">
                                        <span className="text-[9px] text-slate-400">
                                            {new Date(log.dateTime).toLocaleDateString()}
                                        </span>
                                        <div className="flex gap-1 items-center">
                                            <button 
                                                onClick={(e) => handleEmail(log, 'katiebaca@suu.edu', e)} 
                                                className="flex items-center gap-1 text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100 hover:bg-blue-100 transition-colors"
                                                title="Send email report to Katie Baca"
                                            >
                                                <Mail size={10} />
                                                <span>Katie</span>
                                            </button>
                                            <button 
                                                onClick={(e) => handleEmail(log, 'suenghunjun@suu.edu', e)} 
                                                className="flex items-center gap-1 text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded border border-indigo-100 hover:bg-indigo-100 transition-colors"
                                                title="Send email report to Elon Jun"
                                            >
                                                <Mail size={10} />
                                                <span>Elon</span>
                                            </button>
                                            <button 
                                                onClick={(e) => handleShare(log, e)} 
                                                className="text-slate-400 hover:text-blue-500 transition-colors p-1 ml-1" 
                                                title="Share (Other)"
                                            >
                                                <Share2 size={14} />
                                            </button>
                                            <button 
                                                onClick={(e) => handleDelete(log.id, e)}
                                                className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                                title="Delete Log"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="absolute right-3 top-10 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500">
                                        <ChevronRight size={20} />
                                    </div>
                                </div>
                            );
                        })
                    )}
                    
                    {/* Add Button in List View */}
                    <button 
                        onClick={handleNewEntry}
                        className="w-full py-3 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 font-bold hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                    >
                        <Plus size={16} />
                        Log Another Fuel Stop
                    </button>
                </div>
            )}

          </div>

          {/* Footer Actions (Only for Form View) */}
          {view === 'form' && (
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
                <button 
                onClick={handleClearForm}
                className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-bold text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                >
                <Trash2 size={14} />
                Clear
                </button>

                <div className="flex items-center gap-3">
                    {showSavedToast && (
                        <span className="text-xs font-bold text-green-600 flex items-center gap-1 animate-pulse">
                            <CheckCircle size={12} /> Saved!
                        </span>
                    )}
                    <button 
                        onClick={handleSave}
                        className="flex items-center gap-2 px-6 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all transform active:scale-95"
                    >
                        <Save size={14} />
                        {editingId ? 'Update Log' : 'Save Log'}
                    </button>
                </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default FuelLogToggle;
