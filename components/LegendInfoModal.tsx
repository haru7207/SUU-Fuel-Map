import React from 'react';
import { X, Fuel, Droplets, CloudFog, CloudLightning, Wind, Snowflake, ShieldAlert, Flame, AlertTriangle } from 'lucide-react';

interface LegendInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LegendInfoModal: React.FC<LegendInfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/15 backdrop-blur-md transition-all duration-300" onClick={onClose}>
      <div 
        className="ios-liquid-glass-heavy rounded-t-[32px] sm:rounded-[28px] w-full max-w-2xl max-h-[90dvh] flex flex-col animate-pop-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/55 dark:border-slate-800/50 bg-white/6 dark:bg-slate-800/15 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-400/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">Map Legend & Info</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Color-coding and symbols guide</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full ios-liquid-pill text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 min-h-0 p-6 pb-24 sm:pb-6 overflow-y-auto overscroll-y-contain touch-pan-y space-y-8 custom-scrollbar">
          {/* Weather Categories */}
          <section>
            <h3 className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-4">Flight Categories</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 rounded-2xl ios-liquid-card">
                <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/30 border border-white/80"></div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">VFR</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">Vis {'>'} 5sm, Ceiling {'>'} 3000'</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-2xl ios-liquid-card">
                <div className="w-4 h-4 rounded-full bg-blue-500 shadow-sm shadow-blue-500/30 border border-white/80"></div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">MVFR</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">Vis 3-5sm, Ceiling 1000-3000'</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-2xl ios-liquid-card">
                <div className="w-4 h-4 rounded-full bg-red-500 shadow-sm shadow-red-500/30 border border-white/80"></div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">IFR</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">Vis 1-3sm, Ceiling 500-1000'</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-2xl ios-liquid-card">
                <div className="w-4 h-4 rounded-full bg-fuchsia-500 shadow-sm shadow-fuchsia-500/30 border border-white/80"></div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">LIFR</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">Vis {'<'} 1sm, Ceiling {'<'} 500'</div>
                </div>
              </div>
            </div>
          </section>

          {/* Fuel Prices */}
          <section>
            <h3 className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-4">Fuel Prices</h3>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 p-3 rounded-2xl ios-liquid-card">
                <div className="flex gap-2">
                  <div className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-1.5 rounded-xl border border-emerald-300/60 dark:border-emerald-800/50"><Fuel size={16} /></div>
                  <div className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-1.5 rounded-xl border border-emerald-300/60 dark:border-emerald-800/50"><Droplets size={16} /></div>
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">Green Price Icons</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">Price is below the SUU contract threshold (typically safe to buy).</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-2xl ios-liquid-card">
                <div className="flex gap-2">
                  <div className="bg-red-500/20 text-red-600 dark:text-red-400 p-1.5 rounded-xl border border-red-300/60 dark:border-red-800/50"><Fuel size={16} /></div>
                  <div className="bg-red-500/20 text-red-600 dark:text-red-400 p-1.5 rounded-xl border border-red-300/60 dark:border-red-800/50"><Droplets size={16} /></div>
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">Red Price Icons</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">Price is above the SUU contract threshold. You will pay the difference out-of-pocket!</div>
                </div>
              </div>
            </div>
          </section>

          {/* Map Hazards */}
          <section>
            <h3 className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-4">Map Overlays & Hazards</h3>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-3 p-3 rounded-2xl border border-purple-300/60 dark:border-purple-900/40 bg-purple-500/15 dark:bg-purple-900/20">
                <div className="text-purple-600 dark:text-purple-400"><CloudFog size={20} /></div>
                <div>
                  <div className="font-bold text-purple-900 dark:text-purple-300 text-sm">AIRMET Sierra (IFR / Mtn Obscn)</div>
                  <div className="text-xs text-purple-800/80 dark:text-purple-400/80">Widespread IFR conditions or extensive mountain obscuration.</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-2xl border border-orange-300/60 dark:border-orange-900/40 bg-orange-500/15 dark:bg-orange-900/20">
                <div className="text-orange-600 dark:text-orange-400"><Wind size={20} /></div>
                <div>
                  <div className="font-bold text-orange-900 dark:text-orange-300 text-sm">AIRMET Tango (Turbulence)</div>
                  <div className="text-xs text-orange-800/80 dark:text-orange-400/80">Moderate turbulence, sustained surface winds of 30+ knots, or LLWS.</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-2xl border border-blue-300/60 dark:border-blue-900/40 bg-blue-500/15 dark:bg-blue-900/20">
                <div className="text-blue-600 dark:text-blue-400"><Snowflake size={20} /></div>
                <div>
                  <div className="font-bold text-blue-900 dark:text-blue-300 text-sm">AIRMET Zulu (Icing)</div>
                  <div className="text-xs text-blue-800/80 dark:text-blue-400/80">Moderate icing and provides freezing level heights.</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-2xl border border-red-300/60 dark:border-red-900/40 bg-red-500/15 dark:bg-red-900/20">
                <div className="text-red-600 dark:text-red-400"><CloudLightning size={20} /></div>
                <div>
                  <div className="font-bold text-red-900 dark:text-red-300 text-sm">SIGMET & Convective SIGMET</div>
                  <div className="text-xs text-red-800/80 dark:text-red-400/80">Severe icing, severe/extreme turbulence, dust/sand storms, or thunderstorms/tornadoes.</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-2xl border border-rose-300/60 dark:border-rose-900/40 bg-rose-500/15 dark:bg-rose-900/20">
                <div className="text-rose-600 dark:text-rose-400"><ShieldAlert size={20} /></div>
                <div>
                  <div className="font-bold text-rose-900 dark:text-rose-300 text-sm">TFR (Temporary Flight Restriction)</div>
                  <div className="text-xs text-rose-800/80 dark:text-rose-400/80">Restricted airspace. Do not fly through without explicit permission/clearance.</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-2xl border border-orange-300/60 dark:border-orange-900/40 bg-orange-500/15 dark:bg-orange-900/20">
                <div className="text-orange-600 dark:text-orange-400"><Flame size={20} /></div>
                <div>
                  <div className="font-bold text-orange-900 dark:text-orange-300 text-sm">Wildfire Perimeters</div>
                  <div className="text-xs text-orange-800/80 dark:text-orange-400/80">Active wildfires from NIFC. Avoid these areas due to firefighting aircraft and smoke.</div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
