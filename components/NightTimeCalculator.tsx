import React, { useState, useEffect } from 'react';
import { Moon, X, Clock, HelpCircle } from 'lucide-react';
import SunCalc from 'suncalc';

interface NightTimeCalculatorProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  isHidden: boolean;
}

export const NightTimeCalculator: React.FC<NightTimeCalculatorProps> = ({
  isOpen,
  setIsOpen,
  isHidden
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [flightDate, setFlightDate] = useState<string>(todayStr);
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  
  // Display calculations
  const [results, setResults] = useState<{
    totalFlightTime: number;
    loggingNightTime: number;
    currencyNightTime: number;
    lightsTime: number;
  } | null>(null);

  const [times, setTimes] = useState<{
    sunset: string;
    dusk: string;
    dawn: string;
    sunrise: string;
    currencyStart: string;
    currencyEnd: string;
  } | null>(null);

  const lat = 37.7009; // KCDC
  const lon = -113.0988;

  useEffect(() => {
    if (!flightDate) return;
    
    // Parse selected date in local timezone
    const [year, month, day] = flightDate.split('-').map(Number);
    const baseDate = new Date(year, month - 1, day, 12, 0, 0); // Noon to avoid timezone boundary issues
    
    // Calculate sun times for the selected date
    const todaySun = SunCalc.getTimes(baseDate, lat, lon);
    const tomorrow = new Date(baseDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowSun = SunCalc.getTimes(tomorrow, lat, lon);

    // Format times for display (HH:mm)
    const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    
    const currencyStart = new Date(todaySun.sunset.getTime() + 60 * 60 * 1000);
    const currencyEnd = new Date(tomorrowSun.sunrise.getTime() - 60 * 60 * 1000);

    setTimes({
      sunset: formatTime(todaySun.sunset),
      dusk: formatTime(todaySun.dusk),
      currencyStart: formatTime(currencyStart),
      currencyEnd: formatTime(currencyEnd),
      dawn: formatTime(tomorrowSun.dawn),
      sunrise: formatTime(tomorrowSun.sunrise)
    });

    if (startTime && endTime) {
      // Calculate flight start and end Date objects
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      
      const flightStart = new Date(year, month - 1, day, sh, sm, 0);
      let flightEnd = new Date(year, month - 1, day, eh, em, 0);
      
      // If end time is mathematically less than start time, they flew through midnight
      if (flightEnd < flightStart) {
        flightEnd.setDate(flightEnd.getDate() + 1);
      }

      const getOverlap = (fStart: Date, fEnd: Date, vStart: Date, vEnd: Date) => {
        const overlapStart = Math.max(fStart.getTime(), vStart.getTime());
        const overlapEnd = Math.min(fEnd.getTime(), vEnd.getTime());
        const dur = overlapEnd - overlapStart;
        return dur > 0 ? (dur / 60000) / 60 : 0; // returns hours
      };

      // We need to check both yesterday's night (if morning flight) OR today's night (if evening flight)
      const yesterday = new Date(baseDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdaySun = SunCalc.getTimes(yesterday, lat, lon);
      
      const yCurrencyStart = new Date(yesterdaySun.sunset.getTime() + 60 * 60 * 1000);
      const tCurrencyEnd = new Date(todaySun.sunrise.getTime() - 60 * 60 * 1000);

      // Night 1: Yesterday evening -> Today morning
      const n1Logging = getOverlap(flightStart, flightEnd, yesterdaySun.dusk, todaySun.dawn);
      const n1Currency = getOverlap(flightStart, flightEnd, yCurrencyStart, tCurrencyEnd);
      const n1Lights = getOverlap(flightStart, flightEnd, yesterdaySun.sunset, todaySun.sunrise);

      // Night 2: Today evening -> Tomorrow morning
      const n2Logging = getOverlap(flightStart, flightEnd, todaySun.dusk, tomorrowSun.dawn);
      const n2Currency = getOverlap(flightStart, flightEnd, currencyStart, currencyEnd);
      const n2Lights = getOverlap(flightStart, flightEnd, todaySun.sunset, tomorrowSun.sunrise);

      const totalFlightTime = (flightEnd.getTime() - flightStart.getTime()) / (1000 * 60 * 60);

      setResults({
        totalFlightTime: totalFlightTime,
        loggingNightTime: Number((n1Logging + n2Logging).toFixed(1)),
        currencyNightTime: Number((n1Currency + n2Currency).toFixed(1)),
        lightsTime: Number((n1Lights + n2Lights).toFixed(1))
      });
    } else {
      setResults(null);
    }
  }, [flightDate, startTime, endTime]);

  if (isHidden) return null;

  return (
    <>
      {isOpen && (
        <div className="absolute z-[1060] bottom-0 left-0 right-0 md:bottom-auto md:top-36 md:right-4 md:left-auto md:w-96 bg-white dark:bg-slate-900 rounded-t-2xl md:rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden animate-slide-in-up h-[85vh] md:h-[600px] md:max-h-[75vh]">
          
          {/* Header */}
          <div className="bg-slate-900 text-white px-5 py-4 flex justify-between items-center flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-1.5 rounded-lg flex items-center justify-center">
                <Moon size={18} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-base leading-tight">FAA Night Calculator</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Logging, Currency & Equipment</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white hover:bg-slate-700 p-1.5 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-4">
            
            {/* Form */}
            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col gap-3">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 leading-relaxed">
                Enter your exact block-out and block-in times to calculate how much of your flight qualifies for each specific FAA night definition.
              </p>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Flight Date</label>
                <input 
                  type="date" 
                  value={flightDate}
                  onChange={(e) => setFlightDate(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 text-sm font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Start Time (Local)</label>
                  <input 
                    type="time" 
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">End Time (Local)</label>
                  <input 
                    type="time" 
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 text-sm font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Results Grid */}
            {results && startTime && endTime && (
              <div className="grid grid-cols-3 gap-2 text-center border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="bg-blue-50 dark:bg-slate-800/50 p-2 rounded border border-blue-100 dark:border-slate-700">
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-1 truncate px-1">Log Night</div>
                  <div className="text-xl font-black text-blue-600 dark:text-blue-400">{results.loggingNightTime}</div>
                </div>
                <div className="bg-purple-50 dark:bg-slate-800/50 p-2 rounded border border-purple-100 dark:border-slate-700">
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-1 truncate px-1">Currency</div>
                  <div className="text-xl font-black text-purple-600 dark:text-purple-400">{results.currencyNightTime}</div>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-1 truncate px-1">Total Flt</div>
                  <div className="text-xl font-black text-slate-700 dark:text-slate-200">{results.totalFlightTime.toFixed(1)}</div>
                </div>
              </div>
            )}

            {/* Explanations */}
            <div className="space-y-3">
              
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-black tracking-wider rounded-bl-lg border-b border-l border-blue-200 dark:border-blue-800 uppercase">
                  14 CFR 1.1
                </div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5 pr-16">
                  <Clock size={12} className="text-blue-500" />
                  Logging Flight Time
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed mb-2">
                  <span className="font-bold">End of Evening Civil Twilight to Beg. Morning Civil Twilight.</span> Used for logging night flight time and determining when night VFR equipment is required.
                </p>
                {times && (
                  <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 rounded px-2 py-1.5 text-[10px] font-mono font-medium text-slate-700 dark:text-slate-300">
                    <span className="flex gap-2"><span>Dusk:</span><span className="font-bold text-blue-600 dark:text-blue-400">{times.dusk}</span></span>
                    <span className="flex gap-2"><span>Dawn:</span><span className="font-bold text-blue-600 dark:text-blue-400">{times.dawn}</span></span>
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-[10px] font-black tracking-wider rounded-bl-lg border-b border-l border-purple-200 dark:border-purple-800 uppercase">
                  14 CFR 61.57(b)
                </div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5 pr-20">
                  <Moon size={12} className="text-purple-500" />
                  Passenger Currency
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed mb-2">
                  <span className="font-bold">1 hr after Sunset to 1 hr before Sunrise.</span> Logging takeoffs and landings to meet recent flight experience for carrying passengers at night.
                </p>
                {times && (
                  <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 rounded px-2 py-1.5 text-[10px] font-mono font-medium text-slate-700 dark:text-slate-300">
                    <span className="flex gap-2"><span>Starts:</span><span className="font-bold text-purple-600 dark:text-purple-400">{times.currencyStart}</span></span>
                    <span className="flex gap-2"><span>Ends:</span><span className="font-bold text-purple-600 dark:text-purple-400">{times.currencyEnd}</span></span>
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-black tracking-wider rounded-bl-lg border-b border-l border-amber-200 dark:border-amber-800 uppercase">
                  14 CFR 91.209
                </div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5 pr-16">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/>
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse -ml-2.5 outline outline-2 outline-white dark:outline-slate-800"/>
                  Aircraft Position Lights
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed mb-2">
                  <span className="font-bold">Sunset to Sunrise.</span> When an aircraft must have its position lights turned on.
                  {results && results.lightsTime > 0 && (
                    <span className="block mt-1 font-bold text-amber-600">⚠ Lights required for {results.lightsTime.toFixed(1)} hrs of this flight.</span>
                  )}
                </p>
                {times && (
                  <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 rounded px-2 py-1.5 text-[10px] font-mono font-medium text-slate-700 dark:text-slate-300">
                    <span className="flex gap-2"><span>Sunset:</span><span className="font-bold text-amber-600 dark:text-amber-400">{times.sunset}</span></span>
                    <span className="flex gap-2"><span>Sunrise:</span><span className="font-bold text-amber-600 dark:text-amber-400">{times.sunrise}</span></span>
                  </div>
                )}
              </div>

              <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-2 mb-4 justify-center">
                 <HelpCircle size={10} />
                 Times calculated for Cedar City, UT (KCDC) Base
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
};
