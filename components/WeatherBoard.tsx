import React from 'react';
import { WeatherData, Airport } from '../types';
import SunCalc from 'suncalc';

interface WeatherBoardProps {
  weather: WeatherData;
  airport: Airport;
}

export const WeatherBoard: React.FC<WeatherBoardProps> = ({ weather, airport }) => {
  // Calculations
  const temp = weather.temperature !== undefined ? weather.temperature : null;
  const dewp = weather.dewpoint !== undefined ? weather.dewpoint : null;
  const altimHpa = weather.altimeter !== undefined ? weather.altimeter : null;
  const altimInHg = altimHpa ? (altimHpa / 33.86389).toFixed(2) : null;
  
  // Humidity
  let humidity = null;
  if (temp !== null && dewp !== null) {
      const eT = Math.exp((17.625 * dewp) / (243.04 + dewp));
      const eT0 = Math.exp((17.625 * temp) / (243.04 + temp));
      humidity = Math.round((eT / eT0) * 100);
  }

  // Density Altitude
  let densityAltitude = null;
  const elevationFt = weather.elevation !== undefined ? weather.elevation * 3.28084 : null;
  if (temp !== null && altimInHg !== null && elevationFt !== null) {
      const pa = elevationFt + (29.92 - parseFloat(altimInHg)) * 1000;
      const isaTemp = 15 - (elevationFt / 1000) * 2;
      densityAltitude = Math.round(pa + 120 * (temp - isaTemp));
  }

  // Sun and Moon (using airport lat/lon)
  const lat = airport.lat;
  const lon = airport.lon;
  const now = new Date();
  
  const sunTimes = SunCalc.getTimes(now, lat, lon);
  const moonIllumination = SunCalc.getMoonIllumination(now);
  const moonTimes = SunCalc.getMoonTimes(now, lat, lon);

  const formatTime = (date: Date | undefined | null) => {
      if (!date || isNaN(date.getTime())) return '-';
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const getCloudsText = () => {
      const clouds = weather.clouds;
      if (!clouds || clouds.length === 0) return 'Clear';
      if (clouds[0].cover === 'CLR' || clouds[0].cover === 'SKC') return 'Clear';
      
      const layer = clouds[clouds.length - 1]; // take the highest layer as a rough display or maybe we just join them.
      // Wait, AWC returns clear below 12,000 for CLR. Let's list the lowest cloud layer for now or all 
      const mapped = clouds.map(c => {
          let cov = c.cover;
          if (cov === 'FEW') cov = 'Few at';
          if (cov === 'SCT') cov = 'Scattered at';
          if (cov === 'BKN') cov = 'Broken at';
          if (cov === 'OVC') cov = 'Overcast at';
          return `${cov} ${(c.base * 100).toLocaleString()}'`;
      });
      return mapped.join(', ');
  };

  const getFlightCategoryColor = () => {
    switch(weather.flightCategory) {
        case 'VFR': return 'text-green-500';
        case 'MVFR': return 'text-blue-500';
        case 'IFR': return 'text-red-500';
        case 'LIFR': return 'text-purple-500';
        default: return 'text-slate-500';
    }
  };

  const getMetarColor = () => {
       switch(weather.flightCategory) {
        case 'VFR': return 'text-green-600';
        case 'MVFR': return 'text-blue-600';
        case 'IFR': return 'text-red-500';
        case 'LIFR': return 'text-purple-500';
        default: return 'text-slate-600';
    }
  }

  const observationDate = weather.observationTime ? new Date(Number(weather.observationTime) * 1000) : new Date();

  return (
    <div className="ios-liquid-card rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-white/6 dark:bg-slate-800/15 px-4 py-2.5 border-b border-white/55 dark:border-slate-700/50">
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 tracking-tight">Current Surface Conditions</h4>
      </div>

      <div className="p-0">
        <div className={`px-4 py-3 font-mono text-xs font-semibold leading-relaxed border-b border-white/50 dark:border-slate-700/50 bg-white/8 dark:bg-slate-900/15 ${getMetarColor()}`}>
          {weather.metar}
        </div>

        <table className="w-full text-xs">
          <tbody className="divide-y divide-white/40 dark:divide-slate-700/40">
            <tr>
              <td className="py-2 px-4 text-slate-600 dark:text-slate-300 font-medium w-1/2">Flight Category</td>
              <td className="py-2 px-4 text-right">
                 <span className={`font-bold ${getFlightCategoryColor()}`}>{weather.flightCategory}</span>
              </td>
            </tr>
            <tr>
              <td className="py-2 px-4 text-slate-600 dark:text-slate-300 font-medium">Observation</td>
              <td className="py-2 px-4 text-right font-semibold text-slate-900 dark:text-slate-100 font-mono">
                  {observationDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric'})} · {observationDate.toLocaleTimeString('en-US', {hour: 'numeric', minute:'2-digit', hour12:true})}
              </td>
            </tr>
            <tr className="bg-white/6 dark:bg-slate-800/10">
              <td className="py-2 px-4 text-slate-600 dark:text-slate-300 font-medium">Wind</td>
              <td className="py-2 px-4 text-right font-semibold text-slate-900 dark:text-white font-mono">
                {!weather.wind ? '-' : 
                 weather.wind.direction === 0 && weather.wind.speed === 0 ? 'Calm' : 
                 weather.wind.isVrb ? `VRB at ${weather.wind.speed} kt` : 
                 `${weather.wind.direction}° at ${weather.wind.speed} kt${weather.wind.gust ? ` G ${weather.wind.gust}` : ''}`}
              </td>
            </tr>
            <tr>
              <td className="py-2 px-4 text-slate-600 dark:text-slate-300 font-medium">Visibility</td>
              <td className="py-2 px-4 text-right font-semibold text-slate-900 dark:text-white font-mono">{weather.visibility || '-'} sm</td>
            </tr>
            <tr className="bg-white/6 dark:bg-slate-800/10">
              <td className="py-2 px-4 text-slate-600 dark:text-slate-300 font-medium">Clouds (AGL)</td>
              <td className="py-2 px-4 text-right font-semibold text-slate-900 dark:text-white font-mono">{getCloudsText()}</td>
            </tr>
            <tr>
              <td className="py-2 px-4 text-slate-600 dark:text-slate-300 font-medium">Temperature</td>
              <td className="py-2 px-4 text-right font-semibold text-slate-900 dark:text-white font-mono">
                 {temp !== null ? `${Math.round(temp)}°C (${Math.round(temp * 9/5 + 32)}°F)` : '-'}
              </td>
            </tr>
             <tr className="bg-white/6 dark:bg-slate-800/10">
              <td className="py-2 px-4 text-slate-600 dark:text-slate-300 font-medium">Dewpoint</td>
              <td className="py-2 px-4 text-right font-semibold text-slate-900 dark:text-white font-mono">
                 {dewp !== null ? `${Math.round(dewp)}°C (${Math.round(dewp * 9/5 + 32)}°F)` : '-'}
              </td>
            </tr>
            <tr>
              <td className="py-2 px-4 text-slate-600 dark:text-slate-300 font-medium">Altimeter</td>
              <td className="py-2 px-4 text-right font-semibold text-slate-900 dark:text-white font-mono">{altimInHg ? `${altimInHg} inHg` : '-'}</td>
            </tr>
            <tr className="bg-white/6 dark:bg-slate-800/10">
              <td className="py-2 px-4 text-slate-600 dark:text-slate-300 font-medium">Humidity</td>
              <td className="py-2 px-4 text-right font-semibold text-slate-900 dark:text-white font-mono">{humidity !== null ? `${humidity}%` : '-'}</td>
            </tr>
            <tr>
              <td className="py-2 px-4 text-slate-600 dark:text-slate-300 font-medium">Density Altitude</td>
              <td className="py-2 px-4 text-right font-semibold text-slate-900 dark:text-white font-mono">{densityAltitude !== null ? `${densityAltitude.toLocaleString()}'` : '-'}</td>
            </tr>
            <tr className="bg-white/6 dark:bg-slate-800/10">
              <td className="py-2 px-4 text-slate-600 dark:text-slate-300 font-medium">Sunrise / Sunset</td>
              <td className="py-2 px-4 text-right font-semibold text-slate-900 dark:text-white font-mono">{formatTime(sunTimes.sunrise)} · {formatTime(sunTimes.sunset)}</td>
            </tr>
            <tr>
              <td className="py-2 px-4 text-slate-600 dark:text-slate-300 font-medium">Moon Illumination</td>
              <td className="py-2 px-4 text-right font-semibold text-slate-900 dark:text-white font-mono">{Math.round(moonIllumination.fraction * 100)}%</td>
            </tr>
          </tbody>
        </table>

         <div className="p-3.5 border-t border-white/50 dark:border-slate-700/50 bg-white/8 dark:bg-slate-900/15 relative">
            {weather.taf === 'TAF NOT FETCHED' ? (
                <div className="flex items-center gap-2 text-slate-600 text-xs">
                    <div className="animate-spin h-3 w-3 border-2 border-sky-500 border-t-transparent rounded-full"></div>
                    <span>Fetching TAF...</span>
                </div>
            ) : (
                <p className="font-mono text-xs leading-relaxed text-slate-800 dark:text-slate-200">{weather.taf}</p>
            )}
         </div>

         <div className="px-4 py-2 bg-white/5 dark:bg-slate-800/10 border-t border-white/40 dark:border-slate-700/40 text-[10px] text-slate-600 dark:text-slate-300">
           Data sourced from NOAA Aviation Weather Center (AWC).
         </div>
      </div>
    </div>
  );
};
