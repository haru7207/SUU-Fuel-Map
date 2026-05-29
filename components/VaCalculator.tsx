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
    <div className="absolute z-[1060] bottom-0 left-0 right-0 md:bottom-auto md:top-36 md:right-4 md:left-auto md:w-[28rem] lg:w-[32rem] bg-slate-50 dark:bg-slate-900 rounded-t-2xl md:rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden animate-slide-in-up h-[85vh] md:h-auto md:max-h-[85vh]">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white px-5 py-4 flex justify-between items-center flex-shrink-0 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 dark:bg-emerald-600/20 p-2 rounded-lg">
            <Plane size={24} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Maneuvering Speed (V<sub>a</sub>) Calculator</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Cirrus SR20 Specific</p>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-slate-50 dark:bg-slate-900 flex flex-col gap-6">
        
        {/* Inputs */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative">
           <div className="absolute top-4 right-4 text-right">
             <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Constants</div>
             <div className="text-sm font-bold text-slate-700 dark:text-slate-300">Max Wt: {maxGrossWeight} lbs</div>
             <div className="text-sm font-bold text-slate-700 dark:text-slate-300">Max V<sub>a</sub>: {maxVa} kts</div>
           </div>
           
           <div className="w-2/3 pr-4">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 drop-shadow-sm">
                Current Aircraft Weight (lbs)
              </label>
              <input
                type="number"
                min="0"
                max={maxGrossWeight}
                value={currentWeightStr}
                onChange={(e) => setCurrentWeightStr(e.target.value)}
                placeholder="e.g. 2800"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-lg shadow-inner"
              />
           </div>
        </div>

        {/* Calculation Steps */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 border-b border-slate-100 dark:border-slate-700 pb-2">
            Calculation Steps
          </h3>
          
          <div className="mb-4 text-sm font-mono bg-slate-100 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 overflow-x-auto text-center">
             V<sub>a</sub>(new) = V<sub>a</sub>(max) * &radic;(Current Weight / Max Gross Weight)
          </div>

          <div className="space-y-3 font-mono text-sm">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-2">
               <span className="text-slate-500 dark:text-slate-400">Step 1 (Ratio):</span>
               <span className="text-slate-700 dark:text-slate-200">
                 {isValid ? `${currentWeight} / ${maxGrossWeight} = ` : '--- / 3150 = '}
                 <strong className="text-emerald-600 dark:text-emerald-400">{isValid ? ratio.toFixed(2) : '---'}</strong>
               </span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-2">
               <span className="text-slate-500 dark:text-slate-400">Step 2 (Square Root):</span>
               <span className="text-slate-700 dark:text-slate-200">
                 {isValid ? <>&radic;{ratio.toFixed(2)} = </> : <>&radic;--- = </>}
                 <strong className="text-emerald-600 dark:text-emerald-400">{isValid ? sqRt.toFixed(2) : '---'}</strong>
               </span>
            </div>
            <div className="flex justify-between items-center">
               <span className="text-slate-500 dark:text-slate-400">Step 3 (Multiply):</span>
               <span className="text-slate-700 dark:text-slate-200">
                 {isValid ? `${maxVa} * ${sqRt.toFixed(2)} = ` : '133 * --- = '}
                 <strong className="text-emerald-600 dark:text-emerald-400">{isValid ? (maxVa * sqRt).toFixed(2) : '---'}</strong>
               </span>
            </div>
          </div>
        </div>

        {/* Final Output */}
        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/30 flex flex-col items-center justify-center text-center shadow-inner">
           <div className="text-sm font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-widest mb-1">
             New Maneuvering Speed (V<sub>a</sub>)
           </div>
           <div className="text-5xl font-black text-emerald-600 dark:text-emerald-400 drop-shadow-sm flex items-baseline gap-2">
              {isValid ? finalVa : '---'}
              <span className="text-xl font-bold text-emerald-600/70 dark:text-emerald-400/70">kts</span>
           </div>
        </div>

        {/* Pro-Tip */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800/40 relative">
          <div className="absolute -top-3 left-4 bg-blue-600 text-white text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded shadow">
             CFI Pro-Tip
          </div>
          <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed font-medium mt-1">
             <strong className="font-bold">Rule of Thumb:</strong> If doing square root math in the cockpit isn't practical, reduce your maneuvering speed by 1% for every 2% reduction in aircraft weight below maximum gross weight.
          </p>
        </div>

      </div>
    </div>
  );
};
