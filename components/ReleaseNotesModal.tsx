import React, { useState, useEffect } from 'react';
import { X, Moon, Compass, Calculator, Wind, ThermometerSun, Sparkles } from 'lucide-react';

export const ReleaseNotesModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if the user has already seen the v2.5.5 release notes
    const hasSeen = localStorage.getItem('saw_release_notes_v2_5_5');
    if (!hasSeen) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('saw_release_notes_v2_5_5', 'true');
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
            <h2 className="text-2xl font-black">SUU Fuel Map v2.5.5</h2>
            <p className="text-sm font-medium text-sky-100 mt-1">
              Introducing five new instructor tools to enhance your briefings and teaching workflows.
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
              <div className="shrink-0 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 p-3 rounded-xl h-fit">
                <Moon size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">Night Time Calculator</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Easily calculate official civil twilight times to determine loggable night flight and night currency periods for any active airport pin.
                </p>
              </div>
            </li>

            <li className="flex gap-4">
              <div className="shrink-0 bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 p-3 rounded-xl h-fit">
                <Calculator size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">Interactive E6B Flight Computer</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  A digital E6B to solve time-speed-distance, fuel consumption, CAS/TAS conversions, and groundspeed right from your dashboard.
                </p>
              </div>
            </li>

            <li className="flex gap-4">
              <div className="shrink-0 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 p-3 rounded-xl h-fit">
                <Compass size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">SR20 Maneuvering Speed (Va)</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Instantly calculate the correct V<sub>a</sub> for any given weight in the Cirrus SR20. Includes instructional visualization for student briefings.
                </p>
              </div>
            </li>

            <li className="flex gap-4">
              <div className="shrink-0 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 p-3 rounded-xl h-fit">
                <ThermometerSun size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">ISA Deviation Calculator</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Check International Standard Atmosphere variations. Understand how temperature and pressure affect aircraft performance visually.
                </p>
              </div>
            </li>

            <li className="flex gap-4">
              <div className="shrink-0 bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 p-3 rounded-xl h-fit">
                <Wind size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">Instructional Wind Components</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  A visual tool displaying crosswind and headwind components. Features a classic POH-style vector chart and an auto-fill option from current METARs.
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
