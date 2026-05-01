import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, RefreshCw, Info } from 'lucide-react';
import { fetchAllNotamsWithGemini } from '../services/aviationService';
import { NotamData } from '../types';

interface KCDCNotamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KCDCNotamModal: React.FC<KCDCNotamModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<NotamData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      if (forceRefresh) {
        localStorage.removeItem('suu_notam_cache'); // Force refresh by clearing cache first
      }
      const notams = await fetchAllNotamsWithGemini(['KCDC']);
      if (notams && notams['KCDC']) {
        setData(notams['KCDC']);
      } else {
        setData({ rawNotams: [], hasFuelAlert: false });
      }
    } catch (e: any) {
      console.error("Error fetching KCDC NOTAMs", e);
      setError(e?.message || "Failed to fetch NOTAMs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !data && !loading) {
      fetchData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 md:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
              KCDC NOTAMs
            </h2>
            <p className="text-sm text-slate-500 font-medium">Cedar City Regional Airport</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2">
              <button 
                onClick={() => fetchData(true)}
                disabled={loading}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800/50 rounded shadow-sm hover:bg-cyan-100 dark:hover:bg-cyan-900/50 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
              </button>
              <button 
                onClick={onClose}
                className="text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors ml-2"
              >
                <X size={24} />
              </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 overflow-y-auto space-y-4">
            
            <div className="flex items-start gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-300 rounded-lg text-sm border border-indigo-200 dark:border-indigo-800/50">
                <Info size={16} className="mt-0.5 flex-shrink-0" />
                <p>This data is fetched using real-time AI and Google Search. Always verify official flight sources.</p>
            </div>

            {loading && !data ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                    <RefreshCw size={32} className="animate-spin mb-4 text-cyan-500" />
                    <p className="font-medium animate-pulse">Fetching latest NOTAMs...</p>
                </div>
            ) : error ? (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium border border-red-200 dark:border-red-800/50">
                    <AlertTriangle size={20} className="mb-2" />
                    Error: {error}
                </div>
            ) : data ? (
                <div className="space-y-4">
                    {data.hasFuelAlert && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-800 dark:text-red-300 text-sm font-bold flex items-center gap-2 rounded-r-md">
                            <AlertTriangle size={18} />
                            Fuel irregularity detected in these NOTAMs!
                        </div>
                    )}

                    {(!data.rawNotams || data.rawNotams.length === 0) ? (
                        <div className="py-8 text-center text-slate-500 dark:text-slate-400 font-medium bg-slate-50 dark:bg-slate-800 rounded-lg">
                            No active NOTAMs found for KCDC.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active NOTAMs Data</h3>
                            {data.rawNotams.map((notam, idx) => (
                                <div key={idx} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded p-3 font-mono text-xs text-slate-700 dark:text-slate-300 leading-relaxed shadow-sm">
                                    {notam}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : null}

        </div>
      </div>
    </div>
  );
};
