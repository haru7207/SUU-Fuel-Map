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
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-2">Runways</span>
            <div className="flex flex-col gap-2">
                {airport.runways.map(r => {
                    const isBest = bestRunwayInfo?.parent === r;
                    const bestSide = isBest ? bestRunwayInfo?.id : null;
                    const length = airport.runwayLengths?.[r];
                    const details = airport.runwayDetails?.[r];

                    return (
                        <div key={r} className={`border rounded overflow-hidden transition-all duration-200 ${
                            isBest ? 'bg-green-50/30 border-green-200 shadow-sm' : 'bg-slate-50 border-slate-200'
                        }`}>
                            <div 
                                className="flex items-center justify-between px-3 py-2 bg-slate-100/30"
                            >
                                <div className="flex items-center gap-2">
                                    <ArrowUpCircle size={14} className={isBest ? 'text-green-600' : 'text-slate-400'} />
                                    <span className={`text-sm font-bold ${isBest ? 'text-green-900' : 'text-slate-700'}`}>{r}</span>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                    {isBest && bestSide && (
                                        <span className="text-[10px] uppercase font-black tracking-wider text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
                                            Best: {bestSide}
                                        </span>
                                    )}
                                    {length ? (
                                        <span className={`font-mono text-xs font-bold ${isBest ? 'text-green-700' : 'text-slate-500'}`}>{length.toLocaleString()} ft</span>
                                    ) : (
                                        <span className="text-slate-400 italic text-xs font-bold">Len N/A</span>
                                    )}
                                </div>
                            </div>
                            
                            {/* Expanded Details Default */}
                            {details ? (
                                <div className="px-3 pb-3 pt-1 border-t border-slate-100/50 bg-white">
                                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 mt-2 relative">
                                        <div>
                                            <span className="text-[9px] uppercase font-bold text-slate-400 block">Dimensions</span>
                                            <span className="text-xs font-medium text-slate-700 font-mono">{details.length} x {details.width} ft</span>
                                        </div>
                                        <div>
                                            <span className="text-[9px] uppercase font-bold text-slate-400 block">Surface</span>
                                            <span className="text-xs font-medium text-slate-700">{details.surface || 'Unknown'}</span>
                                        </div>
                                        <div>
                                            <span className="text-[9px] uppercase font-bold text-slate-400 block">TPA {airport.elevation ? '(AGL / MSL)' : '(AGL)'}</span>
                                            <span className="text-xs font-medium text-slate-700">
                                                {details.tpa 
                                                    ? `${details.tpa.toLocaleString()} ft${airport.elevation ? ` / ${(details.tpa + airport.elevation).toLocaleString()} ft` : ''}` 
                                                    : 'Standard'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="text-[9px] uppercase font-bold text-slate-400 block">Right Traffic</span>
                                                <span className="text-xs font-medium text-slate-700">
                                                    {details.rightTraffic && details.rightTraffic.length > 0 ? details.rightTraffic.join(', ') : 'None'}
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
                                                <button className="text-slate-400 hover:text-slate-600 transition-colors p-1" title="More Info">
                                                    <Info size={14} />
                                                </button>
                                                
                                                {/* Tooltip Content */}
                                                <div 
                                                    className={`absolute z-10 bottom-full right-0 mb-2 w-48 p-2.5 bg-slate-800 text-white text-xs rounded-md shadow-xl transition-all duration-200 transform origin-bottom-right ${
                                                        activeTooltip === r ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                                                    }`}
                                                >
                                                    <div className="font-bold mb-1.5 border-b border-slate-600 pb-1 flex items-center gap-1.5 text-slate-100">
                                                        <Info size={12} className="text-blue-400" />
                                                        Additional Details
                                                    </div>
                                                    <div className="flex justify-between items-center py-0.5">
                                                        <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Lighting</span>
                                                        <span className="font-mono">{details.lighting || 'Unknown'}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center py-0.5">
                                                        <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Slope</span>
                                                        <span className="font-mono">{details.slope || 'Unknown'}</span>
                                                    </div>
                                                    
                                                    {/* Triangle arrow */}
                                                    <div className="absolute top-full right-2 border-[5px] border-transparent border-t-slate-800"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="px-3 py-3 border-t border-slate-100/50 bg-white">
                                    <span className="text-xs text-slate-400 italic">Detailed information not available.</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
