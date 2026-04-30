import React, { useState, useEffect } from 'react';
import { Calculator, X, Clock, Plane, Edit2, History, Save, Trash2, Plus, Target } from 'lucide-react';

interface FlightTimeCalculatorProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  isHidden: boolean;
}

interface FlightTimeRecord {
  id: string;
  tailNumber: string;
  startTach: string;
  endTach: string;
  startHobbs: string;
  endHobbs: string;
  timestamp: number;
}

const STORAGE_KEY = 'suu_flight_times';
const DRAFT_STORAGE_KEY = 'suu_flight_times_draft';

export const FlightTimeCalculator: React.FC<FlightTimeCalculatorProps> = ({
  isOpen,
  setIsOpen,
  isHidden
}) => {
  const [view, setView] = useState<'form' | 'list'>('form');
  const [records, setRecords] = useState<FlightTimeRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  // Load draft from local storage
  const [draft, setDraft] = useState(() => {
    const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (savedDraft) {
      try {
        return JSON.parse(savedDraft);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [editingId, setEditingId] = useState<string | null>(draft?.editingId || null);
  const [tailNumber, setTailNumber] = useState<string>(draft?.tailNumber || '');
  const [startTach, setStartTach] = useState<string>(draft?.startTach || '');
  const [endTach, setEndTach] = useState<string>(draft?.endTach || '');
  const [startHobbs, setStartHobbs] = useState<string>(draft?.startHobbs || '');
  const [endHobbs, setEndHobbs] = useState<string>(draft?.endHobbs || '');

  const [targetStartHobbs, setTargetStartHobbs] = useState<string>(draft?.targetStartHobbs || '');
  const [desiredHours, setDesiredHours] = useState<string>(draft?.desiredHours || '');

  const targetEndTime = React.useMemo(() => {
    const s = parseFloat(targetStartHobbs);
    const d = parseFloat(desiredHours);
    if (!isNaN(s) && !isNaN(d)) {
      return (s + d).toFixed(1);
    }
    return '0.0';
  }, [targetStartHobbs, desiredHours]);

  // Save records map
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [records]);

  // Save live draft form
  useEffect(() => {
    const activeDraft = {
        editingId,
        tailNumber,
        startTach,
        endTach,
        startHobbs,
        endHobbs,
        targetStartHobbs,
        desiredHours
    };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(activeDraft));
  }, [editingId, tailNumber, startTach, endTach, startHobbs, endHobbs, targetStartHobbs, desiredHours]);

  // Calculate functions
  const calculateChange = (start: string, end: string) => {
    const s = parseFloat(start);
    const e = parseFloat(end);
    if (!isNaN(s) && !isNaN(e) && e >= s) {
      return (e - s).toFixed(1);
    }
    return '0.0';
  };

  const tachTime = calculateChange(startTach, endTach);
  const hobbsTime = calculateChange(startHobbs, endHobbs);

  const handleSave = () => {
    if (!tailNumber) {
        alert("Please enter a tail number (e.g. N12345).");
        return;
    }

    const newRecord: FlightTimeRecord = {
      id: editingId || Date.now().toString(),
      tailNumber: tailNumber.toUpperCase(),
      startTach,
      endTach,
      startHobbs,
      endHobbs,
      timestamp: editingId ? (records.find(r => r.id === editingId)?.timestamp || Date.now()) : Date.now()
    };

    if (editingId) {
      setRecords(records.map(r => r.id === editingId ? newRecord : r));
    } else {
      setRecords([newRecord, ...records]);
    }
    
    resetForm();
    setView('list');
  };

  const editRecord = (record: FlightTimeRecord) => {
    setEditingId(record.id);
    setTailNumber(record.tailNumber);
    setStartTach(record.startTach);
    setEndTach(record.endTach);
    setStartHobbs(record.startHobbs);
    setEndHobbs(record.endHobbs);
    setView('form');
  };

  const deleteRecord = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Delete this flight record?")) {
        setRecords(records.filter(r => r.id !== id));
        if (editingId === id) {
            resetForm();
        }
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setTailNumber('');
    setStartTach('');
    setEndTach('');
    setStartHobbs('');
    setEndHobbs('');
  };

  return (
    <>
      {isOpen && (
        <div className="absolute z-[1060] bottom-0 left-0 right-0 md:bottom-auto md:top-36 md:right-4 md:left-auto md:w-[28rem] lg:w-[40rem] bg-white dark:bg-slate-900 rounded-t-2xl md:rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden animate-slide-in-up h-[85vh] md:h-[600px] md:max-h-[75vh]">
          
          {/* Header */}
          <div className="bg-slate-900 text-white px-5 py-4 flex justify-between items-center flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-1.5 rounded-lg">
                <Calculator size={18} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-base leading-tight">Flight Time Tracker</h3>
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
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex-shrink-0">
              <button 
                onClick={() => setView('form')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${
                    view === 'form' 
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Edit2 size={14} />
                {editingId ? 'Edit' : 'New Flight'}
              </button>
              <button 
                onClick={() => setView('list')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${
                    view === 'list' 
                    ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-b-2 border-slate-800 dark:border-slate-200 dark:border-slate-400' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <History size={14} />
                Saved ({records.length})
              </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {view === 'form' ? (
                <div className="p-5 space-y-6">
                    {/* Aircraft Section */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200 tracking-wide">
                            <Plane size={16} className="text-slate-500" />
                            AIRCRAFT TAIL NUMBER
                        </label>
                        <input
                            type="text"
                            value={tailNumber}
                            onChange={(e) => setTailNumber(e.target.value)}
                            onBlur={() => setTailNumber(tailNumber.toUpperCase())}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold placeholder:font-normal uppercase"
                            placeholder="e.g. N12345"
                        />
                    </div>

                    {/* Pre-Flight Target Time Calculator */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                           <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">🎯 PRE-FLIGHT: TARGET TIME</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Starting Hobbs/Tach</label>
                               <input
                                   type="number"
                                   step="0.1"
                                   value={targetStartHobbs}
                                   onChange={(e) => setTargetStartHobbs(e.target.value)}
                                   className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                                   placeholder="0.0"
                               />
                           </div>
                           <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Desired Flight Hours</label>
                               <input
                                   type="number"
                                   step="0.1"
                                   value={desiredHours}
                                   onChange={(e) => setDesiredHours(e.target.value)}
                                   className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                                   placeholder="0.0"
                               />
                           </div>
                        </div>
                        <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 p-3 rounded-lg flex justify-between items-center">
                           <span className="font-bold text-indigo-800 dark:text-indigo-300">Target End Time:</span>
                           <span className="font-mono text-xl font-bold text-indigo-700 dark:text-indigo-400">{targetEndTime}</span>
                        </div>
                    </div>

                    {/* Tach & Hobbs Sections in a grid on larger screens */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Tach Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                            <Clock size={16} className="text-slate-500" />
                            <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Tach Time</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start</label>
                                <input
                                type="number"
                                step="0.1"
                                value={startTach}
                                onChange={(e) => setStartTach(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                                placeholder="0.0"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">End</label>
                                <input
                                type="number"
                                step="0.1"
                                value={endTach}
                                onChange={(e) => setEndTach(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                                placeholder="0.0"
                                />
                            </div>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 p-3 rounded-lg flex justify-between items-center">
                            <span className="font-bold text-blue-800 dark:text-blue-300">Total Tach:</span>
                            <span className="font-mono text-xl font-bold text-blue-700 dark:text-blue-400">{tachTime} <span className="text-sm text-blue-600 dark:text-blue-500">hrs</span></span>
                            </div>
                        </div>

                        {/* Hobbs Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                            <Clock size={16} className="text-slate-500" />
                            <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Hobbs Time</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start</label>
                                <input
                                type="number"
                                step="0.1"
                                value={startHobbs}
                                onChange={(e) => setStartHobbs(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                                placeholder="0.0"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">End</label>
                                <input
                                type="number"
                                step="0.1"
                                value={endHobbs}
                                onChange={(e) => setEndHobbs(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                                placeholder="0.0"
                                />
                            </div>
                            </div>
                            <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 p-3 rounded-lg flex justify-between items-center">
                            <span className="font-bold text-emerald-800 dark:text-emerald-300">Total Hobbs:</span>
                            <span className="font-mono text-xl font-bold text-emerald-700 dark:text-emerald-400">{hobbsTime} <span className="text-sm text-emerald-600 dark:text-emerald-500">hrs</span></span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="pt-4 flex gap-3">
                        <button
                            onClick={resetForm}
                            className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold transition-colors border border-slate-200 dark:border-slate-700"
                        >
                            Clear
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex-[2] flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors shadow-md active:scale-95"
                        >
                            <Save size={18} />
                            Save {editingId ? 'Changes' : 'Draft'}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="p-4 flex flex-col gap-3 min-h-full bg-slate-50 dark:bg-slate-900/50">
                    {records.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center py-10 opacity-70">
                            <History size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
                            <h4 className="font-bold text-slate-600 dark:text-slate-400 mb-2">No saved flights</h4>
                            <p className="text-sm text-slate-400 dark:text-slate-500 mb-6 max-w-[200px]">
                                Your flight times will appear here for easy access.
                            </p>
                            <button
                                onClick={() => setView('form')}
                                className="flex items-center gap-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors font-bold text-sm"
                            >
                                <Plus size={16} />
                                Start a Draft
                            </button>
                        </div>
                    ) : (
                        records.map(record => {
                            const tTime = calculateChange(record.startTach, record.endTach);
                            const hTime = calculateChange(record.startHobbs, record.endHobbs);
                            
                            // Check if it's incomplete (missing end times)
                            const isIncomplete = !record.endTach || !record.endHobbs;

                            return (
                                <div 
                                    key={record.id} 
                                    onClick={() => editRecord(record)}
                                    className={`bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border ${isIncomplete ? 'border-amber-200 dark:border-amber-900/50 shadow-amber-50 dark:shadow-none' : 'border-slate-200 dark:border-slate-700'} hover:shadow-md cursor-pointer transition-all active:scale-[0.98] relative group`}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <Plane size={16} className={isIncomplete ? 'text-amber-500' : 'text-blue-500'} />
                                                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-lg">{record.tailNumber || 'No Tail #'}</h4>
                                                {isIncomplete && (
                                                    <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                        Draft
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-400 mt-1">
                                                {new Date(record.timestamp).toLocaleString(undefined, {
                                                    month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric'
                                                })}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={(e) => deleteRecord(record.id, e)}
                                            className="text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 p-1.5 rounded bg-slate-50 dark:bg-slate-800/50 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Tach ({tTime}h)</span>
                                            <div className="flex gap-1 text-sm font-mono mt-1">
                                                <span className="text-slate-600 dark:text-slate-400">{record.startTach || '-'}</span>
                                                <span className="text-slate-300 dark:text-slate-600">→</span>
                                                <span className="text-slate-800 dark:text-slate-200 font-bold">{record.endTach || '?'}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Hobbs ({hTime}h)</span>
                                            <div className="flex gap-1 text-sm font-mono mt-1">
                                                <span className="text-slate-600 dark:text-slate-400">{record.startHobbs || '-'}</span>
                                                <span className="text-slate-300 dark:text-slate-600">→</span>
                                                <span className="text-slate-800 dark:text-slate-200 font-bold">{record.endHobbs || '?'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
