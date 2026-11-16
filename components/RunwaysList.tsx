import React, { useState } from 'react';
import { Airport } from '../types';
import { ArrowUpCircle, Info } from 'lucide-react';

interface RunwaysListProps {
    airport: Airport;
    bestRunwayInfo?: { id: string; parent?: string } | null;
}

export const RunwaysList: React.FC<RunwaysListProps> = ({ airport, bestRunwayInfo }) => {
    const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

    if (!airport.runways || airport.runways.length === 0) {
        return (
            <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-2">Runways</span>
                <span className="text-xs text-slate-400 italic">No runway information available</span>
            </div>
        );
    }

    return (
        <div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2.5 px-1">Runway Directory</span>
            <div className="flex flex-col gap-2.5">
                {airport.runways.map(r => {
                    const isBest = bestRunwayInfo?.parent === r;
                    const bestSide = isBest ? bestRunwayInfo?.id : null;
                    const length = airport.runwayLengths?.[r];
                    const details = airport.runwayDetails?.[r];

                    return (
                        <div key={r} className={`rounded-2xl overflow-hidden transition-all duration-200 ${
                            isBest
                              ? 'bg-emerald-500/12 border border-emerald-300/70 dark:border-emerald-700/60 shadow-2xs'
                              : 'ios-liquid-card'
                        }`}>
                            <div 
                                className="flex items-center justify-between px-4 py-2.5 bg-white/15 dark:bg-slate-800/20 border-b border-white/45 dark:border-slate-700/50"
                            >
                                <div className="flex items-center gap-2">
                                    <ArrowUpCircle size={15} className={isBest ? 'text-emerald-600 dark:text-emerald-400' : 'text-sky-600 dark:text-sky-400'} />
                                    <span className={`text-sm font-extrabold font-mono ${isBest ? 'text-emerald-900 dark:text-emerald-200' : 'text-slate-900 dark:text-white'}`}>RWY {r}</span>
                                </div>
                                
                                <div className="flex items-center gap-2.5">
                                    {isBest && bestSide && (
                                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                                            Favored Rwy {bestSide} ·
                                        </span>
                                    )}
                                    {length ? (
                                        <span className={`font-mono text-xs font-bold ${isBest ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-300'}`}>{length.toLocaleString()} ft</span>
                                    ) : (
                                        <span className="text-slate-400 italic text-xs font-medium">Len N/A</span>
                                    )}
                                </div>
                            </div>
                            
                            {/* Expanded Details Default */}
                            {details ? (
                                <div className="px-4 pb-3.5 pt-2.5">
                                    <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 relative">
                                        <div>
                                            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">Dimensions</span>
                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">{details.length} × {details.width} ft</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">Surface</span>
                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{details.surface || 'Unknown'}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">TPA {airport.elevation ? '(AGL / MSL)' : '(AGL)'}</span>
                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                                                {details.tpa 
                                                    ? `${details.tpa.toLocaleString()} ft${airport.elevation ? ` / ${(details.tpa + airport.elevation).toLocaleString()} ft` : ''}` 
                                                    : 'Standard'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">Right Traffic</span>
                                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                                                    {details.rightTraffic && details.rightTraffic.length > 0 ? details.rightTraffic.join(', ') : 'Standard Left'}
                                                </span>
                                            </div>
                                            
                                            {/* Tooltip implementation */}
                                            <div 
                                                className="relative"
                                                onMouseEnter={() => setActiveTooltip(r)}
                                                onMouseLeave={() => setActiveTooltip(null)}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveTooltip(activeTooltip === r ? null : r);
                                                }}
                                            >
                                                <button className="text-slate-400 hover:text-sky-600 transition-colors p-1 rounded-full hover:bg-white/60" title="More Info">
                                                    <Info size={14} />
                                                </button>
                                                
                                                {/* Tooltip Content */}
                                                <div 
                                                    className={`absolute z-10 bottom-full right-0 mb-2 w-52 p-3 ios-liquid-glass-heavy text-slate-800 dark:text-white text-xs rounded-2xl transition-all duration-200 transform origin-bottom-right ${
                                                        activeTooltip === r ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                                                    }`}
                                                >
                                                    <div className="font-bold mb-1.5 border-b border-slate-200/60 dark:border-slate-700 pb-1 flex items-center gap-1.5">
                                                        <Info size={12} className="text-sky-500" />
                                                        Runway Specs
                                                    </div>
                                                    <div className="flex justify-between items-center py-0.5">
                                                        <span className="text-slate-500 dark:text-slate-400 text-[10px] font-semibold">Lighting</span>
                                                        <span className="font-mono font-bold">{details.lighting || 'Unknown'}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center py-0.5">
                                                        <span className="text-slate-500 dark:text-slate-400 text-[10px] font-semibold">Gradient</span>
                                                        <span className="font-mono font-bold">{details.slope || 'Unknown'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="px-4 py-3">
                                    <span className="text-xs text-slate-400 italic">Detailed runway specs not available.</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
