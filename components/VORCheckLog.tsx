import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Radio, Share2, Copy, Save, Trash2, History, Edit3 } from 'lucide-react';

interface VORCheckLogProps {
  isOpen: boolean;
  onClose: () => void;
}

type CheckType = 'VOT' | 'Ground Checkpoint' | 'Dual VOR Cross-check' | 'Airborne Checkpoint' | 'Prominent Landmark';

export const VORCheckLog: React.FC<VORCheckLogProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
  const [history, setHistory] = useState<any[]>([]);

  const [checkType, setCheckType] = useState<CheckType>('VOT');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [place, setPlace] = useState('');
  const [tailNumber, setTailNumber] = useState('');
  
  // Errors for standard checks
  const [nav1Error, setNav1Error] = useState<number | ''>('');
  const [nav2Error, setNav2Error] = useState<number | ''>('');
  
  // Difference for Dual VOR
  const [dualDifference, setDualDifference] = useState<number | ''>('');

  const [logEntry, setLogEntry] = useState('');

  const loadDraft = () => {
    const saved = localStorage.getItem('vorCheckDraft');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.checkType) setCheckType(data.checkType);
        if (data.date) setDate(data.date);
        if (data.place) setPlace(data.place);
        if (data.tailNumber) setTailNumber(data.tailNumber);
        if (data.nav1Error !== undefined) setNav1Error(data.nav1Error);
        if (data.nav2Error !== undefined) setNav2Error(data.nav2Error);
        if (data.dualDifference !== undefined) setDualDifference(data.dualDifference);
        if (data.logEntry) setLogEntry(data.logEntry);
        setActiveTab('form');
        alert("Draft loaded successfully!");
      } catch (e) {
        console.error("Failed to parse saved VOR check data", e);
        alert("Failed to load draft.");
      }
    } else {
      alert("No saved draft found.");
    }
  };

  useEffect(() => {
    if (isOpen) {
      const savedHistory = localStorage.getItem('vorCheckHistory');
      if (savedHistory) {
        try {
          setHistory(JSON.parse(savedHistory));
        } catch (e) {
          console.error("Failed to parse saved VOR check history", e);
        }
      }
    }
  }, [isOpen]);

  const loadHistoryEntry = (item: any) => {
    setCheckType(item.checkType || 'VOT');
    setDate(item.date || new Date().toISOString().split('T')[0]);
    setPlace(item.place || '');
    setTailNumber(item.tailNumber || '');
    setNav1Error(item.nav1Error !== undefined ? item.nav1Error : '');
    setNav2Error(item.nav2Error !== undefined ? item.nav2Error : '');
    setDualDifference(item.dualDifference !== undefined ? item.dualDifference : '');
    setLogEntry(item.logEntry || '');
    setActiveTab('form');
  };

  const deleteHistoryEntry = (id: number) => {
    if (confirm("Delete this entry from history?")) {
      const newHistory = history.filter(item => item.id !== id);
      setHistory(newHistory);
      localStorage.setItem('vorCheckHistory', JSON.stringify(newHistory));
    }
  };

  const saveDraft = () => {
    const dataToSave = {
      checkType,
      date,
      place,
      tailNumber,
      nav1Error,
      nav2Error,
      dualDifference,
      logEntry
    };
    localStorage.setItem('vorCheckDraft', JSON.stringify(dataToSave));
    alert("Draft saved successfully!");
  };

  const clearDraft = () => {
    if (confirm("Clear all current data?")) {
      setCheckType('VOT');
      setDate(new Date().toISOString().split('T')[0]);
      setPlace('');
      setTailNumber('');
      setNav1Error('');
      setNav2Error('');
      setDualDifference('');
      setLogEntry('');
      localStorage.removeItem('vorCheckDraft');
    }
  };

  const getToleranceText = () => {
    switch (checkType) {
      case 'VOT': return 'Tolerance: ±4°';
      case 'Ground Checkpoint': return 'Tolerance: ±4°';
      case 'Dual VOR Cross-check': return 'Tolerance: 4° maximum difference';
      case 'Airborne Checkpoint': return 'Tolerance: ±6°';
      case 'Prominent Landmark': return 'Tolerance: ±6°';
      default: return '';
    }
  };

  const getToleranceLimit = () => {
    switch (checkType) {
      case 'VOT': return 4;
      case 'Ground Checkpoint': return 4;
      case 'Dual VOR Cross-check': return 4;
      case 'Airborne Checkpoint': return 6;
      case 'Prominent Landmark': return 6;
      default: return 0;
    }
  };

  const isNav1Exceeded = checkType !== 'Dual VOR Cross-check' && nav1Error !== '' && Math.abs(Number(nav1Error)) > getToleranceLimit();
  const isNav2Exceeded = checkType !== 'Dual VOR Cross-check' && nav2Error !== '' && Math.abs(Number(nav2Error)) > getToleranceLimit();
  const isDualExceeded = checkType === 'Dual VOR Cross-check' && dualDifference !== '' && Math.abs(Number(dualDifference)) > getToleranceLimit();
  
  const isErrorExceeded = isNav1Exceeded || isNav2Exceeded || isDualExceeded;

  const handleGenerate = () => {
    if (!place || !tailNumber) {
      alert("Please fill in Location and Tail Number.");
      return;
    }

    if (checkType === 'Dual VOR Cross-check' && dualDifference === '') {
        alert("Please enter the Dual VOR Difference.");
        return;
    }
    if (checkType !== 'Dual VOR Cross-check' && nav1Error === '' && nav2Error === '') {
        alert("Please enter a Bearing Error for at least NAV 1 or NAV 2.");
        return;
    }

    const dateParts = date.split('-');
    const year = dateParts[0];
    const month = dateParts[1];
    const day = dateParts[2];
    const formattedDate = `${month}/${day}/${year}`;

    let errorString = '';
    if (checkType === 'Dual VOR Cross-check') {
        errorString = `Diff: ${dualDifference}°`;
    } else {
        const errs = [];
        if (nav1Error !== '') errs.push(`NAV1: ${Number(nav1Error) > 0 ? '+' : ''}${nav1Error}°`);
        if (nav2Error !== '') errs.push(`NAV2: ${Number(nav2Error) > 0 ? '+' : ''}${nav2Error}°`);
        errorString = errs.join(', ');
    }

    const newLogEntry = `Date: ${formattedDate}
A/C: ${tailNumber.toUpperCase()}
Place: ${place} (${checkType})
Error: ${errorString}
Signature: ____________________`;

    setLogEntry(newLogEntry);

    // Save to history
    const newEntryObj = {
      id: Date.now(),
      checkType,
      date: formattedDate,
      place,
      tailNumber: tailNumber.toUpperCase(),
      nav1Error,
      nav2Error,
      dualDifference,
      logEntry: newLogEntry
    };
    
    const newHistory = [newEntryObj, ...history];
    setHistory(newHistory);
    localStorage.setItem('vorCheckHistory', JSON.stringify(newHistory));
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(logEntry).then(() => {
        alert("Copied to clipboard!");
    }).catch(err => {
        console.error("Failed to copy", err);
        alert("Failed to copy. Please copy manually.");
    });
  };

  const shareEntry = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `VOR Check - ${tailNumber.toUpperCase()}`,
          text: logEntry,
        });
      } catch (err) {
         if ((err as any).name !== 'AbortError') {
             console.error("Error sharing", err);
         }
      }
    } else {
      alert("Sharing is not supported on this browser. You can use 'Copy' instead.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-fadeIn">
        
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <Radio className="text-cyan-500" />
            VOR Receiver Check
          </h2>
          <div className="flex items-center gap-2">
              <button 
                onClick={saveDraft}
                title="Save Draft"
                className="text-slate-400 hover:text-emerald-500 transition-colors p-1"
              >
                <Save size={18} />
              </button>
              <div className="h-4 w-px bg-slate-300 dark:bg-slate-700"></div>
              <button 
                onClick={clearDraft}
                title="Clear Form"
                className="text-slate-400 hover:text-red-500 transition-colors p-1"
              >
                <Trash2 size={18} />
              </button>
              <button 
                onClick={onClose}
                className="text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors ml-2"
              >
                <X size={24} />
              </button>
          </div>
        </div>

        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <button
            onClick={() => setActiveTab('form')}
            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'form' ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
          >
            <Edit3 size={16} /> New Entry
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'history' ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
          >
            <History size={16} /> History {history.length > 0 && <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 rounded-full">{history.length}</span>}
          </button>
        </div>

        {/* Content */}
        {activeTab === 'form' ? (
        <div className="p-4 md:p-6 overflow-y-auto space-y-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between p-3 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-800 dark:text-cyan-400 rounded-lg border border-cyan-200 dark:border-cyan-800/50">
              <span className="text-sm font-medium">Ensure compliance with 14 CFR 91.171 for IFR operations. This tool formats the legally required logbook entry.</span>
              <button onClick={loadDraft} className="whitespace-nowrap text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-1.5 px-3 rounded shadow-sm transition-colors">
                Load Last Draft
              </button>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type of Check</label>
                    <select
                        value={checkType}
                        onChange={(e) => {
                            setCheckType(e.target.value as CheckType);
                            // don't clear everything on change so they can switch without losing date/tail etc.
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
                    >
                        <option value="VOT">VOT (FAA Test Signal)</option>
                        <option value="Ground Checkpoint">Ground Checkpoint</option>
                        <option value="Dual VOR Cross-check">Dual VOR Cross-check</option>
                        <option value="Airborne Checkpoint">Airborne Checkpoint</option>
                        <option value="Prominent Landmark">Prominent Landmark (Airway)</option>
                    </select>
                    <p className="mt-1.5 text-xs font-bold text-slate-400">
                        {getToleranceText()}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Aircraft Tail #</label>
                        <input
                            type="text"
                            placeholder="e.g. N12345"
                            value={tailNumber}
                            onChange={(e) => setTailNumber(e.target.value.toUpperCase())}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-sm uppercase"
                        />
                    </div>
                </div>
                
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Location/Place</label>
                    <input
                        type="text"
                        placeholder="e.g. KCDC Ground Check"
                        value={place}
                        onChange={(e) => setPlace(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium text-sm"
                    />
                </div>

                {checkType === 'Dual VOR Cross-check' ? (
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">NAV 1 vs NAV 2 Difference (°)</label>
                        <input
                            type="number"
                            placeholder="e.g. 2"
                            value={dualDifference}
                            onChange={(e) => setDualDifference(e.target.value !== '' ? Number(e.target.value) : '')}
                            className={`w-full bg-slate-50 dark:bg-slate-800 border rounded-lg p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 font-mono text-sm ${isDualExceeded ? 'border-red-400 focus:ring-red-500 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20' : 'border-slate-200 dark:border-slate-700 focus:ring-cyan-500'}`}
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700/50">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">NAV 1 Error (°)</label>
                            <input
                                type="number"
                                placeholder="e.g. +2 or -1"
                                value={nav1Error}
                                onChange={(e) => setNav1Error(e.target.value !== '' ? Number(e.target.value) : '')}
                                className={`w-full bg-white dark:bg-slate-800 border rounded-lg p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 font-mono text-sm ${isNav1Exceeded ? 'border-red-400 focus:ring-red-500 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20' : 'border-slate-200 dark:border-slate-700 focus:ring-cyan-500'}`}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">NAV 2 Error (°) <span className="text-[10px] lowercase text-slate-400 font-normal ml-1">optional</span></label>
                            <input
                                type="number"
                                placeholder="e.g. +1 or 0"
                                value={nav2Error}
                                onChange={(e) => setNav2Error(e.target.value !== '' ? Number(e.target.value) : '')}
                                className={`w-full bg-white dark:bg-slate-800 border rounded-lg p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 font-mono text-sm ${isNav2Exceeded ? 'border-red-400 focus:ring-red-500 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20' : 'border-slate-200 dark:border-slate-700 focus:ring-cyan-500'}`}
                            />
                        </div>
                    </div>
                )}


                {isErrorExceeded && (
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm font-bold bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-200 dark:border-red-800/50">
                        <AlertTriangle size={16} />
                        Error exceeds limits - IFR Prohibited
                    </div>
                )}
            </div>

            <button
                onClick={handleGenerate}
                disabled={isErrorExceeded}
                className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-md transition-colors flex items-center justify-center gap-2"
            >
                <CheckCircle size={18} />
                Generate Log Entry
            </button>

            {logEntry && (
                <div className="mt-6 border-t border-slate-200 dark:border-slate-800 pt-6 animate-fadeIn">
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase">Results/Memo</label>
                        <div className="flex gap-2">
                            <button 
                                onClick={copyToClipboard}
                                className="flex items-center gap-1.5 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-1.5 px-3 rounded shadow-sm transition-colors"
                            >
                                <Copy size={14} /> Copy
                            </button>
                            <button 
                                onClick={shareEntry}
                                className="flex items-center gap-1.5 text-xs font-bold bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800/50 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 py-1.5 px-3 rounded shadow-sm transition-colors"
                            >
                                <Share2 size={14} /> Share / Save
                            </button>
                        </div>
                    </div>
                    <textarea
                        readOnly
                        value={logEntry}
                        className="w-full h-32 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-slate-800 dark:text-slate-300 font-mono text-sm leading-relaxed resize-none focus:outline-none shadow-inner"
                    />
                </div>
            )}
        </div>
        ) : (
        <div className="p-4 md:p-6 overflow-y-auto max-h-[60vh] space-y-4">
            {history.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
                <History size={32} className="mx-auto mb-2 opacity-50" />
                <p>No logged VOR checks yet.</p>
            </div>
            ) : (
            history.map((item, idx) => (
                <div key={item.id || idx} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-sm group">
                <div className="flex justify-between items-start mb-2">
                    <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200">{item.tailNumber}</h4>
                    <p className="text-xs text-slate-500">{item.date} • {item.place} ({item.checkType})</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => loadHistoryEntry(item)} className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 hover:underline text-xs font-bold transition-colors">Load</button>
                        <div className="h-3 w-px bg-slate-300 dark:bg-slate-600"></div>
                        <button onClick={() => deleteHistoryEntry(item.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1" title="Delete entry"><Trash2 size={14} /></button>
                    </div>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-line bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 p-2.5 rounded font-mono">
                    {item.logEntry}
                </div>
                </div>
            ))
            )}
        </div>
        )}
      </div>
    </div>
  );
};

