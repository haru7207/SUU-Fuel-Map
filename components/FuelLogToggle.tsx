
import React, { useState, useEffect } from 'react';
import { Fuel, X, Trash2, User, Plane, Calendar, FileText, CheckCircle, Info, Save, List, Plus, Edit2, ChevronRight, History, Droplets, CreditCard, Share2, Mail, AlertCircle } from 'lucide-react';
import { AIRPORT_DATABASE } from '../constants';

interface FuelLogToggleProps {
  currentAirportId: string | null;
  isOnline?: boolean;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  isHidden?: boolean;
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

const FuelLogToggle: React.FC<FuelLogToggleProps> = ({ currentAirportId, isOnline = true, isOpen, setIsOpen, isHidden = false }) => {
  const [view, setView] = useState<'form' | 'list'>('form');
  const [showSavedToast, setShowSavedToast] = useState(false);
  
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

  const [formData, setFormData] = useState<FuelLogData>(getEmptyForm());

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
              setView('list');
          }
      }
  };

  const handleNewEntry = () => {
      setEditingId(null);
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
      {!isOpen && !isHidden && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 md:bottom-auto md:translate-x-0 md:top-4 md:left-6 md:right-auto z-[1050] flex flex-col items-center md:items-start gap-3">
          <button
            onClick={() => setIsOpen(true)}
            className={`flex items-center gap-2 bg-red-600 text-white px-5 py-3 rounded-full shadow-xl hover:bg-red-700 hover:scale-105 transition-all active:scale-95 group`}
          >
            <Fuel size={20} className="group-hover:rotate-12 transition-transform" />
            <span className="font-bold tracking-wide">Log Fuel</span>
          </button>
          
          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLScmBQPQeOxgMnq4UEvxzg5HwEe-x2Owj3kVpV4pWbpXrxhoHg/viewform"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 px-4 py-2 rounded-full shadow-lg hover:bg-red-50 dark:hover:bg-slate-700 transition-all active:scale-95 text-xs font-bold"
          >
            <AlertCircle size={16} />
            <span>Fuel Error Report</span>
          </a>
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
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${
                    view === 'form' 
                    ? 'bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 border-b-2 border-red-600 dark:border-red-400' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Edit2 size={14} />
                {editingId ? 'Edit Memo' : 'New Memo'}
              </button>
              <button 
                onClick={() => setView('list')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${
                    view === 'list' 
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <List size={14} />
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
                    <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                        <FileText size={10} /> Notes / Issues
                    </label>
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
                                                className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100 hover:bg-blue-100 transition-colors"
                                                title="Email Katie Baca"
                                            >
                                                Katie
                                            </button>
                                            <button 
                                                onClick={(e) => handleEmail(log, 'suenghunjun@suu.edu', e)} 
                                                className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100 hover:bg-blue-100 transition-colors"
                                                title="Email Elon Jun"
                                            >
                                                Elon
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
