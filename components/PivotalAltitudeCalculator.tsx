import React, { useState } from 'react';
import { Target, X } from 'lucide-react';

interface PivotalAltitudeCalculatorProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  isHidden: boolean;
}

export const PivotalAltitudeCalculator: React.FC<PivotalAltitudeCalculatorProps> = ({
  isOpen,
  setIsOpen,
  isHidden
}) => {
  const [groundSpeed, setGroundSpeed] = useState<string>('');

  // Calculate function
  const calculatePivotalAltitude = (gs: string) => {
    const speed = parseFloat(gs);
    if (!isNaN(speed) && speed > 0) {
      return Math.round((speed * speed) / 11.3);
    }
    return 0;
  };

  if (isHidden) return null;

  const pivotalAlt = calculatePivotalAltitude(groundSpeed);

  return (
    <>
      {isOpen && (
        <div className="absolute z-[1060] bottom-0 left-0 right-0 md:bottom-auto md:top-36 md:right-4 md:left-auto md:w-80 ios-liquid-glass-heavy rounded-t-[32px] md:rounded-[28px] flex flex-col overflow-hidden animate-slide-in-up max-h-[88dvh] md:max-h-[75dvh]">
          
          {/* Header */}
          <div className="bg-white/6 dark:bg-slate-800/15 text-slate-900 dark:text-white px-5 py-4 flex justify-between items-center flex-shrink-0 border-b border-white/55 dark:border-slate-700/50">
            <div className="flex items-center gap-2.5">
              <div className="bg-indigo-500/20 border border-indigo-400/50 p-1.5 rounded-xl">
                <Target size={18} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="font-bold text-base leading-tight">Pivotal Altitude</h3>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="ios-liquid-pill text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white p-1.5 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-5 pb-20 md:pb-5 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y flex-1 custom-scrollbar">
             <div className="space-y-6">
                
                <div className="ios-liquid-card p-4 rounded-2xl text-center">
                   <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Pivotal Altitude (AGL)</div>
                   <div className="text-4xl font-black text-blue-600 dark:text-blue-400">
                     {pivotalAlt > 0 ? `${pivotalAlt} ft` : '--'}
                   </div>
                   <div className="text-xs text-slate-600 dark:text-slate-400 mt-2">GS² / 11.3</div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Ground Speed (KTS)</label>
                    <input
                      type="number"
                      value={groundSpeed}
                      onChange={(e) => setGroundSpeed(e.target.value)}
                      placeholder="e.g. 100"
                      className="w-full ios-liquid-input rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 transition-colors font-mono text-lg"
                    />
                  </div>
                </div>

                <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed ios-liquid-card p-3 rounded-xl">
                    <span className="font-bold">Eights on Pylons:</span> The pivotal altitude is the height AGL at which the line of sight to the pylon remains stationary. Add your field elevation to this altitude to get your indicated altitude (MSL).
                </div>
             </div>
          </div>
        </div>
      )}
    </>
  );
};
