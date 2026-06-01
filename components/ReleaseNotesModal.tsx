import React, { useState, useEffect } from 'react';
import { X, Moon, Compass, Calculator, Wind, ThermometerSun, Sparkles, Fuel, Info, Clock, Database } from 'lucide-react';

export const ReleaseNotesModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if the user has already seen the v2.6.0 release notes
    const hasSeen = localStorage.getItem('saw_release_notes_v2_6_0');
    if (!hasSeen) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('saw_release_notes_v2_6_0', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-slide-in-up">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-600 to-blue-700 p-6 flex justify-between items-start relative overflow-hidden">
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-white/10 blur-2xl"></div>
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-40 h-40 rounded-full bg-white/10 blur-3xl"></div>
          
          <div className="relative z-10 text-white">
            <div className="flex items-center gap-2 mb-2 text-sky-100">
              <Sparkles size={16} />
              <span className="text-xs font-bold uppercase tracking-widest">What's New</span>
            </div>
            <h2 className="text-2xl font-black">SUU Fuel Map v2.6.0</h2>
            <p className="text-sm font-medium text-sky-100 mt-1">
              Optimizing application performance, enhancing instructor utilities, and delivering offline-first Local Remarks.
            </p>
          </div>
          <button 
            onClick={handleClose}
            className="relative z-10 bg-white/10 hover:bg-white/20 p-2 rounded-full text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
          <ul className="space-y-4">
            
            <li className="flex gap-4">
              <div className="shrink-0 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 p-3 rounded-xl h-fit">
                <Database size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">Local Remarks Database (Form 5010)</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  We have added a comprehensive offline-first Local Airport Remarks database. The Skyvector/FAA remarks for all main airfields load instantly and reliably without relying on external Google Sheets.
                </p>
              </div>
            </li>

            <li className="flex gap-4">
              <div className="shrink-0 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 p-3 rounded-xl h-fit">
                <Clock size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">Flight Time & Night Time Calculator</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Plan briefings with official civil twilight times, loggable night periods, and student solo dual hour splits right on your active map sidebar.
                </p>
              </div>
            </li>

            <li className="flex gap-4">
              <div className="shrink-0 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 p-3 rounded-xl h-fit">
                <ThermometerSun size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">ISA Deviation Calculator</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Visualize International Standard Atmosphere deviations. Teach students how temperature variations affect density altitude and power output with full visual indicators.
                </p>
              </div>
            </li>

            <li className="flex gap-4">
              <div className="shrink-0 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 p-3 rounded-xl h-fit">
                <Calculator size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">E6B Flight Computer</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Run standard aeronautical math calculations (speed, fuel burns, density/pressure heights, and unit conversions) dynamically inside the briefing tools.
                </p>
              </div>
            </li>

            <li className="flex gap-4">
              <div className="shrink-0 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 p-3 rounded-xl h-fit">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">Grounded Live AI Search</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  For smaller regional fields, click "Sync Live" to trigger a highly accurate AI Search using current FAA datasets securely proxying live details.
                </p>
              </div>
            </li>

          </ul>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
          <button
            onClick={handleClose}
            className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm"
          >
            Got it, thanks!
          </button>
        </div>

      </div>
    </div>
  );
};
