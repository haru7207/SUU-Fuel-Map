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
        <div className="absolute z-[1060] bottom-0 left-0 right-0 md:bottom-auto md:top-36 md:right-4 md:left-auto md:w-80 bg-white dark:bg-slate-900 rounded-t-2xl md:rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden animate-slide-in-up md:max-h-[75vh]">
          
          {/* Header */}
          <div className="bg-slate-900 text-white px-5 py-4 flex justify-between items-center flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-1.5 rounded-lg">
                <Target size={18} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-base leading-tight">Pivotal Altitude</h3>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white hover:bg-slate-700 p-1.5 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-5 overflow-y-auto flex-1">
             <div className="space-y-6">
                
                <div className="bg-blue-50 dark:bg-slate-800/50 p-4 rounded-xl border border-blue-100 dark:border-slate-700 text-center">
                   <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Pivotal Altitude (AGL)</div>
                   <div className="text-4xl font-black text-blue-600 dark:text-blue-400">
                     {pivotalAlt > 0 ? `${pivotalAlt} ft` : '--'}
                   </div>
                   <div className="text-xs text-slate-500 mt-2">GS² / 11.3</div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Ground Speed (KTS)</label>
                    <input
                      type="number"
                      value={groundSpeed}
                      onChange={(e) => setGroundSpeed(e.target.value)}
                      placeholder="e.g. 100"
                      className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-colors font-mono text-lg"
                    />
                  </div>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/80 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                    <span className="font-bold">Eights on Pylons:</span> The pivotal altitude is the height AGL at which the line of sight to the pylon remains stationary. Add your field elevation to this altitude to get your indicated altitude (MSL).
                </div>
             </div>
          </div>
        </div>
      )}
    </>
  );
};
