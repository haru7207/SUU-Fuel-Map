import React, { useState, useEffect } from 'react';
import { X, Moon, Compass, Calculator, Wind, ThermometerSun, Sparkles, Fuel, Info, Clock, Database, Flame } from 'lucide-react';

export const ReleaseNotesModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if the user has already seen the v2.6.3 release notes
    const hasSeen = localStorage.getItem('saw_release_notes_v2_6_3');
    if (!hasSeen) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('saw_release_notes_v2_6_3', 'true');
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
            <h2 className="text-2xl font-black">SUU Fuel Map v2.6.3</h2>
            <p className="text-sm font-medium text-sky-100 mt-1">
              Introducing redesigned Weather information displays, Fire & TFR map visualization, flight & night time loggers, E6B & ISA calculators, and new airport reference features.
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
              <div className="shrink-0 bg-sky-100 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 p-3 rounded-xl h-fit">
                <Wind size={20} className="animate-spin-slow" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">🌤️ Redesigned Weather Display</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Enjoy a significantly improved layout for METARs, TAFs, density altitude, and solar/lunar phases on the location details pane.
                </p>
              </div>
            </li>

            <li className="flex gap-4">
              <div className="shrink-0 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 p-3 rounded-xl h-fit">
                <Flame size={20} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">🔥 Active Fire & TFR Map Layers</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Toggle real-time National Interagency Fire Center (NIFC) active wildfire boundaries and FAA Temporary Flight Restrictions (TFRs) directly on the map.
                </p>
              </div>
            </li>

            <li className="flex gap-4">
              <div className="shrink-0 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 p-3 rounded-xl h-fit">
                <Clock size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">🕒 Flight Time & Night Calculator</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Easily calculate precise flight times, day/night distributions, and twilight sequences directly from the briefing tools menu.
                </p>
              </div>
            </li>

            <li className="flex gap-4">
              <div className="shrink-0 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 p-3 rounded-xl h-fit">
                <Calculator size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">✈️ E6B Flight Computer Integration</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Perform critical wind components, heading corrections, GS/TAS calculations, and standard navigation formulas inside the application.
                </p>
              </div>
            </li>

            <li className="flex gap-4">
              <div className="shrink-0 bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 p-3 rounded-xl h-fit">
                <ThermometerSun size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">🌡️ ISA Deviation Calculator</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Determine atmospheric temperature differences from the International Standard Atmosphere (ISA) to evaluate aircraft performance accurately.
                </p>
              </div>
            </li>

            <li className="flex gap-4">
              <div className="shrink-0 bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 p-3 rounded-xl h-fit">
                <Info size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">ℹ️ Airport Cheat Sheet (Work In Progress)</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-semibold">
                  We are actively building out the Airport Cheat Sheet reference. Note that figures may currently be inaccurate or incomplete. <span className="text-red-600 dark:text-red-400 font-bold">NEVER use these cheat sheets for real-world navigation yet!</span>
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
