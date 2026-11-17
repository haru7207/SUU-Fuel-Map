import React, { useState } from 'react';
import { X, ThermometerSun, AlertTriangle, Info } from 'lucide-react';

interface ISACalculatorProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ISACalculator: React.FC<ISACalculatorProps> = ({ isOpen, onClose }) => {
  const [currentAltStr, setCurrentAltStr] = useState<string>('');
  const [currentOatStr, setCurrentOatStr] = useState<string>('');
  const [targetAltStr, setTargetAltStr] = useState<string>('');

  if (!isOpen) return null;

  const currentAlt = parseFloat(currentAltStr);
  const currentOat = parseFloat(currentOatStr);
  const targetAlt = parseFloat(targetAltStr);

  const hasObservation = !isNaN(currentAlt) && !isNaN(currentOat);
  const hasTarget = !isNaN(targetAlt);

  // Calculations
  const stdTempCurrent = hasObservation ? 15 - ((currentAlt / 1000) * 2) : 0;
  const isaDeviation = hasObservation ? currentOat - stdTempCurrent : 0;
  
  const stdTempTarget = hasTarget ? 15 - ((targetAlt / 1000) * 2) : 0;
  const expectedOatTarget = (hasObservation && hasTarget) ? stdTempTarget + isaDeviation : 0;
  
  const stdPressureTarget = hasTarget ? 29.92 * Math.pow((1 - 0.0000068756 * targetAlt), 5.256) : 0;

  // ISA Color Logic
  let isaColorClass = "text-emerald-600 dark:text-emerald-400";
  if (isaDeviation > 10) {
    isaColorClass = "text-red-600 dark:text-red-400";
  } else if (isaDeviation < -5) {
    isaColorClass = "text-blue-600 dark:text-blue-400";
  }

  // Format ISA string
  const formattedIsaDev = hasObservation 
    ? `ISA ${isaDeviation > 0 ? '+' : ''}${isaDeviation.toFixed(1)}°C` 
    : '---';

  return (
    <div className="absolute z-[1060] bottom-0 left-0 right-0 md:bottom-auto md:top-36 md:right-4 md:left-auto md:w-[28rem] lg:w-[32rem] ios-liquid-glass-heavy rounded-t-[32px] md:rounded-[28px] flex flex-col overflow-hidden animate-slide-in-up h-[88dvh] md:h-auto md:max-h-[85dvh]">
      
      {/* Header */}
      <div className="bg-white/6 dark:bg-slate-800/15 text-slate-900 dark:text-white px-5 py-4 flex justify-between items-center flex-shrink-0 border-b border-white/55 dark:border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500/20 border border-orange-400/50 p-2 rounded-xl">
            <ThermometerSun size={24} className="text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">ISA Deviation & Atmosphere</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">Atmosphere Calculator</p>
          </div>
        </div>
        <button onClick={onClose} className="ios-liquid-pill text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors p-2 rounded-full">
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y p-5 pb-24 md:pb-5 custom-scrollbar bg-transparent flex flex-col gap-6">
        
        {/* Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 ios-liquid-card p-4 rounded-2xl">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 border-b border-white/50 dark:border-slate-700/50 pb-2">
              Observation
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-2">
                  Current Altitude (ft)
                </label>
                <input
                  type="number"
                  value={currentAltStr}
                  onChange={(e) => setCurrentAltStr(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full ios-liquid-input rounded-xl p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-2">
                  Current OAT (°C)
                </label>
                <input
                  type="number"
                  value={currentOatStr}
                  onChange={(e) => setCurrentOatStr(e.target.value)}
                  placeholder="e.g. 15"
                  className="w-full ios-liquid-input rounded-xl p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>

          <div className="col-span-2 ios-liquid-card p-4 rounded-2xl">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 border-b border-white/50 dark:border-slate-700/50 pb-2">
              Prediction
            </h3>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-2">
                Target/Cruise Altitude (ft)
              </label>
              <input
                type="number"
                value={targetAltStr}
                onChange={(e) => setTargetAltStr(e.target.value)}
                placeholder="e.g. 8500"
                className="w-full ios-liquid-input rounded-xl p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="ios-liquid-card p-4 rounded-2xl">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 border-b border-white/50 dark:border-slate-700/50 pb-2">
            Atmosphere Results
          </h3>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center bg-white/15 dark:bg-slate-800/25 p-3 rounded-xl border border-white/55 dark:border-slate-700/50">
               <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">Standard Temp at Current Alt</span>
               <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                 {hasObservation && !isNaN(stdTempCurrent) ? `${stdTempCurrent.toFixed(1)}°C` : '---'}
               </span>
            </div>
            
            <div className="flex justify-between items-center bg-white/15 dark:bg-slate-800/25 p-3 rounded-xl border border-white/55 dark:border-slate-700/50">
               <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">ISA Deviation</span>
               <span className={`text-xl font-black ${isaColorClass}`}>
                 {formattedIsaDev}
               </span>
            </div>

            <div className="flex justify-between items-center bg-white/15 dark:bg-slate-800/25 p-3 rounded-xl border border-white/55 dark:border-slate-700/50 relative overflow-hidden">
               <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-400 dark:bg-orange-600"></div>
               <span className="text-sm text-slate-700 dark:text-slate-300 font-medium pl-2">Expected OAT @ Target Alt</span>
               <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                 {(hasObservation && hasTarget && !isNaN(expectedOatTarget)) ? `${expectedOatTarget.toFixed(1)}°C` : '---'}
               </span>
            </div>

            <div className="flex justify-between items-center bg-white/15 dark:bg-slate-800/25 p-3 rounded-xl border border-white/55 dark:border-slate-700/50">
               <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">Standard Pressure @ Target Alt</span>
               <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                 {(hasTarget && !isNaN(stdPressureTarget)) ? `${stdPressureTarget.toFixed(2)} inHg` : '---'}
               </span>
            </div>
          </div>
        </div>

        {/* Warning / Pro-Tip Box */}
        {hasObservation && isaDeviation > 10 && (
          <div className="bg-red-500/15 dark:bg-red-900/25 p-4 rounded-2xl border border-red-300/60 dark:border-red-800/60 flex gap-3 animate-fade-in">
             <AlertTriangle className="text-red-500 dark:text-red-400 shrink-0 mt-0.5" size={20} />
             <div>
               <h4 className="text-sm font-bold text-red-900 dark:text-red-400">High Density Altitude Alert</h4>
               <p className="text-xs text-red-800 dark:text-red-300 mt-1">
                 Aircraft performance (takeoff distance, climb rate) will be significantly degraded.
               </p>
             </div>
          </div>
        )}

        {hasObservation && isaDeviation < 0 && (
          <div className="bg-blue-500/15 dark:bg-blue-900/25 p-4 rounded-2xl border border-blue-300/60 dark:border-blue-800/60 flex gap-3 animate-fade-in">
             <Info className="text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" size={20} />
             <div>
               <h4 className="text-sm font-bold text-blue-900 dark:text-blue-400">CFI Pro-Tip</h4>
               <p className="text-xs text-blue-800 dark:text-blue-300 mt-1">
                 Better than standard performance. Watch for potential icing if visible moisture is present.
               </p>
             </div>
          </div>
        )}

      </div>
    </div>
  );
};
