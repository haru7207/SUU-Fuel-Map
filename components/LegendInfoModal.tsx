import React from 'react';
import { X, Fuel, Droplets, CloudFog, CloudLightning, Wind, Snowflake, ShieldAlert, Flame, AlertTriangle } from 'lucide-react';

interface LegendInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LegendInfoModal: React.FC<LegendInfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 animate-pop-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">Map Legend & Info</h2>
              <p className="text-xs text-slate-500 font-medium">Color-coding and symbols guide</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-8 custom-scrollbar">
          {/* Weather Categories */}
          <section>
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Flight Categories</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/30"></div>
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">VFR</div>
                  <div className="text-xs text-slate-500">Vis {'>'} 5sm, Ceiling {'>'} 3000'</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <div className="w-4 h-4 rounded-full bg-blue-500 shadow-sm shadow-blue-500/30"></div>
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">MVFR</div>
                  <div className="text-xs text-slate-500">Vis 3-5sm, Ceiling 1000-3000'</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <div className="w-4 h-4 rounded-full bg-red-500 shadow-sm shadow-red-500/30"></div>
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">IFR</div>
                  <div className="text-xs text-slate-500">Vis 1-3sm, Ceiling 500-1000'</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <div className="w-4 h-4 rounded-full bg-fuchsia-500 shadow-sm shadow-fuchsia-500/30"></div>
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">LIFR</div>
                  <div className="text-xs text-slate-500">Vis {'<'} 1sm, Ceiling {'<'} 500'</div>
                </div>
              </div>
            </div>
          </section>

          {/* Fuel Prices */}
          <section>
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Fuel Prices</h3>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <div className="flex gap-2">
                  <div className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 p-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/50"><Fuel size={16} /></div>
                  <div className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 p-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/50"><Droplets size={16} /></div>
                </div>
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">Green Price Icons</div>
                  <div className="text-xs text-slate-500">Price is below the SUU contract threshold (typically safe to buy).</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <div className="flex gap-2">
                  <div className="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 p-1.5 rounded-lg border border-red-200 dark:border-red-800/50"><Fuel size={16} /></div>
                  <div className="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 p-1.5 rounded-lg border border-red-200 dark:border-red-800/50"><Droplets size={16} /></div>
                </div>
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">Red Price Icons</div>
                  <div className="text-xs text-slate-500">Price is above the SUU contract threshold. You will pay the difference out-of-pocket!</div>
                </div>
              </div>
            </div>
          </section>

          {/* Map Hazards */}
          <section>
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Map Overlays & Hazards</h3>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-3 p-3 rounded-lg border border-purple-200/50 dark:border-purple-900/30 bg-purple-50/50 dark:bg-purple-900/10">
                <div className="text-purple-500"><CloudFog size={20} /></div>
                <div>
                  <div className="font-bold text-purple-700 dark:text-purple-300 text-sm">AIRMET Sierra (IFR / Mtn Obscn)</div>
                  <div className="text-xs text-purple-600/70 dark:text-purple-400/70">Widespread IFR conditions or extensive mountain obscuration.</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-orange-200/50 dark:border-orange-900/30 bg-orange-50/50 dark:bg-orange-900/10">
                <div className="text-orange-500"><Wind size={20} /></div>
                <div>
                  <div className="font-bold text-orange-700 dark:text-orange-300 text-sm">AIRMET Tango (Turbulence)</div>
                  <div className="text-xs text-orange-600/70 dark:text-orange-400/70">Moderate turbulence, sustained surface winds of 30+ knots, or LLWS.</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-blue-200/50 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-900/10">
                <div className="text-blue-500"><Snowflake size={20} /></div>
                <div>
                  <div className="font-bold text-blue-700 dark:text-blue-300 text-sm">AIRMET Zulu (Icing)</div>
                  <div className="text-xs text-blue-600/70 dark:text-blue-400/70">Moderate icing and provides freezing level heights.</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-red-200/50 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10">
                <div className="text-red-500"><CloudLightning size={20} /></div>
                <div>
                  <div className="font-bold text-red-700 dark:text-red-300 text-sm">SIGMET & Convective SIGMET</div>
                  <div className="text-xs text-red-600/70 dark:text-red-400/70">Severe icing, severe/extreme turbulence, dust/sand storms, or thunderstorms/tornadoes.</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-rose-200/50 dark:border-rose-900/30 bg-rose-50/50 dark:bg-rose-900/10">
                <div className="text-rose-600"><ShieldAlert size={20} /></div>
                <div>
                  <div className="font-bold text-rose-700 dark:text-rose-300 text-sm">TFR (Temporary Flight Restriction)</div>
                  <div className="text-xs text-rose-600/70 dark:text-rose-400/70">Restricted airspace. Do not fly through without explicit permission/clearance.</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-orange-200/50 dark:border-orange-900/30 bg-orange-50/50 dark:bg-orange-900/10">
                <div className="text-orange-600"><Flame size={20} /></div>
                <div>
                  <div className="font-bold text-orange-700 dark:text-orange-300 text-sm">Wildfire Perimeters</div>
                  <div className="text-xs text-orange-600/70 dark:text-orange-400/70">Active wildfires from NIFC. Avoid these areas due to firefighting aircraft and smoke.</div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
