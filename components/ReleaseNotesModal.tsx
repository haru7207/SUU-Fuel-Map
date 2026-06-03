import React, { useState, useEffect } from 'react';
import { X, Moon, Compass, Calculator, Wind, ThermometerSun, Sparkles, Fuel, Info, Clock, Database, Flame } from 'lucide-react';

export const ReleaseNotesModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if the user has already seen the v2.6.1 release notes
    const hasSeen = localStorage.getItem('saw_release_notes_v2_6_1');
    if (!hasSeen) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('saw_release_notes_v2_6_1', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-slide-in-up">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 via-sky-600 to-blue-700 p-6 flex justify-between items-start relative overflow-hidden">
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-white/10 blur-2xl"></div>
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-40 h-40 rounded-full bg-white/10 blur-3xl"></div>
          
          <div className="relative z-10 text-white">
            <div className="flex items-center gap-2 mb-2 text-sky-100">
              <Sparkles size={16} className="text-amber-300 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest">What's New</span>
            </div>
            <h2 className="text-2xl font-black">SUU Fuel Map v2.6.1</h2>
            <p className="text-sm font-medium text-sky-100 mt-1">
              Introducing Active Wildfire Hazards, real-time live METAR wind vectors, and offline-first Local Remarks.
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
              <div className="shrink-0 bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 p-3 rounded-xl h-fit">
                <Flame size={20} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">🔥 Active Wildfire Hazards (NIFC integration)</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Real-time active wildfire perimeter layers fetched directly from the National Interagency Fire Center (NIFC). Displays active burning zones clearly on your interactive briefing map with interactive popup metrics showing incident name, size in acres, and containment percentage.
                </p>
              </div>
            </li>

            <li className="flex gap-4">
              <div className="shrink-0 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 p-3 rounded-xl h-fit">
                <Wind size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">Enhanced Wind Vector Overlay</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  We have replaced basic flight category labels on the map pins with premium METAR wind indices. Instantly read reporting wind direction vector arrows, speed, and severe wind gust cautions.
                </p>
              </div>
            </li>

            <li className="flex gap-4">
              <div className="shrink-0 bg-slate-100 dark:bg-slate-850 text-slate-700 dark:text-slate-300 p-3 rounded-xl h-fit">
                <Database size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">Local Remarks Database (Form 5010)</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Fast offline-first runway, hazard, and airport remarks database. Flight notes load instantly with standard robust formatting without any loading delays.
                </p>
              </div>
            </li>

            <li className="flex gap-4">
              <div className="shrink-0 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 p-3 rounded-xl h-fit">
                <Clock size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">Flight Time & Night Calculator</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Calculate twilight cycles, loggable night periods, and student hour distributions directly in the briefing view.
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
