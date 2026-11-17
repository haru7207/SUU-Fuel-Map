import React, { useState } from 'react';
import { X, Plane } from 'lucide-react';

interface VaCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VaCalculator: React.FC<VaCalculatorProps> = ({ isOpen, onClose }) => {
  const [currentWeightStr, setCurrentWeightStr] = useState<string>('');

  if (!isOpen) return null;

  const maxGrossWeight = 3150;
  const maxVa = 133;

  const currentWeight = parseFloat(currentWeightStr);
  const isValid = !isNaN(currentWeight) && currentWeight > 0;

  let ratio = 0;
  let sqRt = 0;
  let finalVa = 0;

  if (isValid) {
    ratio = currentWeight / maxGrossWeight;
    sqRt = Math.sqrt(ratio);
    finalVa = Math.round(maxVa * sqRt);
  }

  return (
    <div className="absolute z-[1060] bottom-0 left-0 right-0 md:bottom-auto md:top-36 md:right-4 md:left-auto md:w-[28rem] lg:w-[32rem] ios-liquid-glass-heavy rounded-t-[28px] md:rounded-[28px] flex flex-col overflow-hidden animate-slide-in-up h-[88dvh] md:h-auto md:max-h-[85dvh]">
      
      {/* Header */}
      <div className="bg-white/8 dark:bg-slate-900/15 text-slate-900 dark:text-white px-5 py-4 flex justify-between items-center flex-shrink-0 border-b border-white/55 dark:border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/15 border border-emerald-400/30 p-2 rounded-2xl">
            <Plane size={22} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Maneuvering Speed (V<sub>a</sub>) Calculator</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Cirrus SR20 Specific</p>
          </div>
        </div>
        <button onClick={onClose} className="ios-liquid-pill text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors p-2 rounded-full">
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y p-5 pb-24 md:pb-5 custom-scrollbar bg-transparent flex flex-col gap-5">
        
        {/* Inputs */}
        <div className="ios-liquid-card p-4 rounded-2xl relative">
           <div className="absolute top-4 right-4 text-right">
             <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Constants</div>
             <div className="text-sm font-bold text-slate-800 dark:text-slate-200">Max Wt: {maxGrossWeight} lbs</div>
             <div className="text-sm font-bold text-slate-800 dark:text-slate-200">Max V<sub>a</sub>: {maxVa} kts</div>
           </div>
           
           <div className="w-2/3 pr-4">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-2">
                Current Aircraft Weight (lbs)
              </label>
              <input
                type="number"
                min="0"
                max={maxGrossWeight}
                value={currentWeightStr}
                onChange={(e) => setCurrentWeightStr(e.target.value)}
                placeholder="e.g. 2800"
                className="w-full ios-liquid-input rounded-xl p-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 font-mono text-lg font-bold"
              />
           </div>
        </div>

        {/* Calculation Steps */}
        <div className="ios-liquid-card p-4 rounded-2xl">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 border-b border-white/45 dark:border-slate-700/60 pb-2">
            Calculation Steps
          </h3>
          
          <div className="mb-4 text-sm font-mono bg-white/14 dark:bg-slate-900/30 p-3 rounded-xl border border-white/65 dark:border-slate-700 text-slate-700 dark:text-slate-300 overflow-x-auto text-center">
             V<sub>a</sub>(new) = V<sub>a</sub>(max) * &radic;(Current Weight / Max Gross Weight)
          </div>

          <div className="space-y-3 font-mono text-sm">
            <div className="flex justify-between items-center border-b border-white/40 dark:border-slate-700/50 pb-2">
               <span className="text-slate-600 dark:text-slate-400">Step 1 (Ratio):</span>
               <span className="text-slate-800 dark:text-slate-200">
                 {isValid ? `${currentWeight} / ${maxGrossWeight} = ` : '--- / 3150 = '}
                 <strong className="text-emerald-600 dark:text-emerald-400">{isValid ? ratio.toFixed(2) : '---'}</strong>
               </span>
            </div>
            <div className="flex justify-between items-center border-b border-white/40 dark:border-slate-700/50 pb-2">
               <span className="text-slate-600 dark:text-slate-400">Step 2 (Square Root):</span>
               <span className="text-slate-800 dark:text-slate-200">
                 {isValid ? <>&radic;{ratio.toFixed(2)} = </> : <>&radic;--- = </>}
                 <strong className="text-emerald-600 dark:text-emerald-400">{isValid ? sqRt.toFixed(2) : '---'}</strong>
               </span>
            </div>
            <div className="flex justify-between items-center">
               <span className="text-slate-600 dark:text-slate-400">Step 3 (Multiply):</span>
               <span className="text-slate-800 dark:text-slate-200">
                 {isValid ? `${maxVa} * ${sqRt.toFixed(2)} = ` : '133 * --- = '}
                 <strong className="text-emerald-600 dark:text-emerald-400">{isValid ? (maxVa * sqRt).toFixed(2) : '---'}</strong>
               </span>
            </div>
          </div>
        </div>

        {/* Final Output */}
        <div className="bg-emerald-500/15 dark:bg-emerald-900/20 backdrop-blur-md p-4 rounded-2xl border border-emerald-400/50 dark:border-emerald-700/40 flex flex-col items-center justify-center text-center shadow-[inset_0_1px_0.5px_rgba(255,255,255,0.75)]">
           <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-widest mb-1">
             New Maneuvering Speed (V<sub>a</sub>)
           </div>
           <div className="text-5xl font-black text-emerald-700 dark:text-emerald-400 drop-shadow-2xs flex items-baseline gap-2 font-mono">
              {isValid ? finalVa : '---'}
              <span className="text-xl font-bold text-emerald-700/75 dark:text-emerald-400/75">kts</span>
           </div>
        </div>

        {/* Pro-Tip */}
        <div className="bg-sky-500/15 dark:bg-sky-900/20 backdrop-blur-md p-4 rounded-2xl border border-sky-400/50 dark:border-sky-800/40 relative">
          <div className="absolute -top-2.5 left-4 bg-sky-600/85 backdrop-blur-md border border-white/50 text-white text-[10px] uppercase font-black tracking-wider px-2.5 py-0.5 rounded-full shadow-xs">
             CFI Pro-Tip
          </div>
          <p className="text-xs text-sky-950 dark:text-sky-200 leading-relaxed font-medium mt-1">
             <strong className="font-bold">Rule of Thumb:</strong> If doing square root math in the cockpit isn't practical, reduce your maneuvering speed by 1% for every 2% reduction in aircraft weight below maximum gross weight.
          </p>
        </div>

      </div>
    </div>
  );
};
