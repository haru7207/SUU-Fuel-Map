import React, { useState, useEffect } from 'react';
import { X, Thermometer, Info, AlertTriangle } from 'lucide-react';
import { Airport, WeatherData } from '../types';

interface DensityAltitudeCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  airports: Airport[];
  weatherMap: Record<string, WeatherData>;
  selectedAirport: Airport | null;
}

export const DensityAltitudeCalculator: React.FC<DensityAltitudeCalculatorProps> = ({ isOpen, onClose, airports, weatherMap, selectedAirport }) => {
  const [elevationStr, setElevationStr] = useState('');
  const [altimeterStr, setAltimeterStr] = useState('29.92');
  const [tempStr, setTempStr] = useState('15');
  const [autoFillAirport, setAutoFillAirport] = useState<string>('');

  useEffect(() => {
    if (selectedAirport && isOpen) {
      setAutoFill(selectedAirport);
    }
  }, [selectedAirport, isOpen]);

  const setAutoFill = (airport: Airport) => {
    setElevationStr(airport.elevation.toString());
    const weather = weatherMap[airport.id];
    if (weather && weather.type === 'METAR') {
      if (weather.altim_in_hg) setAltimeterStr(weather.altim_in_hg.toString());
      if (weather.temp_c) setTempStr(weather.temp_c.toString());
    }
    setAutoFillAirport(airport.id);
  };

  if (!isOpen) return null;

  const elevation = parseFloat(elevationStr);
  const altimeter = parseFloat(altimeterStr);
  const temp = parseFloat(tempStr);

  const hasData = !isNaN(elevation) && !isNaN(altimeter) && !isNaN(temp);

  let pressureAltitude = 0;
  let standardTemp = 0;
  let densityAltitude = 0;

  if (hasData) {
    pressureAltitude = elevation + (29.92 - altimeter) * 1000;
    standardTemp = 15 - (pressureAltitude / 1000) * 2;
    densityAltitude = pressureAltitude + (120 * (temp - standardTemp));
  }

  return (
    <div className="absolute z-[1060] bottom-0 left-0 right-0 md:bottom-auto md:top-36 md:right-4 md:left-auto md:w-[28rem] lg:w-[32rem] bg-slate-50 dark:bg-slate-900 rounded-t-2xl md:rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden animate-slide-in-up h-[85vh] md:h-auto md:max-h-[85vh]">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white px-5 py-4 flex justify-between items-center flex-shrink-0 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="bg-red-100 dark:bg-red-900/40 p-2 rounded-lg border border-red-200 dark:border-red-800/50">
            <Thermometer size={24} className="text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">Density Altitude</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Performance impact estimator</p>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-slate-50 dark:bg-slate-900 flex flex-col gap-5">
        
        {selectedAirport && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800/50 flex justify-between items-center">
            <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Use {selectedAirport.id} METAR data?</span>
            <button 
              onClick={() => setAutoFill(selectedAirport)}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded shadow-sm transition-colors"
            >
              Auto-Fill
            </button>
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Field Elevation (ft)</label>
            <input 
              type="number" 
              value={elevationStr} 
              onChange={e => setElevationStr(e.target.value)} 
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="e.g. 5622"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Altimeter (inHg)</label>
              <input 
                type="number" 
                step="0.01"
                value={altimeterStr} 
                onChange={e => setAltimeterStr(e.target.value)} 
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="29.92"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">OAT (°C)</label>
              <input 
                type="number" 
                value={tempStr} 
                onChange={e => setTempStr(e.target.value)} 
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="15"
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700 pb-2">Results</h3>
          
          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
            <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">Pressure Altitude</span>
            <span className="text-lg font-bold text-slate-800 dark:text-slate-200">
              {hasData ? `${Math.round(pressureAltitude).toLocaleString()} ft` : '---'}
            </span>
          </div>

          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-700 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
            <span className="text-sm text-slate-600 dark:text-slate-400 font-medium pl-2">Density Altitude</span>
            <span className="text-xl font-black text-slate-800 dark:text-slate-100">
              {hasData ? `${Math.round(densityAltitude).toLocaleString()} ft` : '---'}
            </span>
          </div>
        </div>

        {hasData && densityAltitude > elevation + 2000 && (
          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-300 dark:border-orange-800/60 flex gap-3 animate-fade-in">
            <AlertTriangle className="text-orange-500 dark:text-orange-400 shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="text-sm font-bold text-orange-800 dark:text-orange-400">High Density Altitude</h4>
              <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                Takeoff roll will be longer and climb performance will be reduced. Verify aircraft performance charts.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
