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
    <div className="bg-white border rounded">
      {/* Header */}
      <div className="bg-[#E0E0E0] px-3 py-1.5 border-b shadow-sm">
        <h4 className="text-[11px] font-bold text-slate-600 uppercase tracking-widest leading-none">Current Conditions</h4>
      </div>

      <div className="p-0">
        <div className={`p-2 font-mono text-sm border-b ${getMetarColor()}`}>
          {weather.metar}
        </div>

        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b">
              <td className="py-1 px-3 text-slate-600 w-1/2">Flight Category</td>
              <td className="py-1 px-3 text-right flex justify-end items-center gap-1.5">
                 <div className={`h-3 w-3 rounded-full bg-current ${getFlightCategoryColor()}`}></div>
                 <span className={`font-medium ${getFlightCategoryColor()}`}>{weather.flightCategory}</span>
              </td>
            </tr>
            <tr className="border-b">
              <td className="py-1 px-3 text-slate-600">Observation</td>
              <td className="py-1 px-3 text-right font-medium">
                  {observationDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric'})} at {observationDate.toLocaleTimeString('en-US', {hour: 'numeric', minute:'2-digit', hour12:true})}
              </td>
            </tr>
            <tr className="border-b bg-gray-50/50">
              <td className="py-1 px-3 text-slate-600">Wind</td>
              <td className="py-1 px-3 text-right font-medium text-slate-800">
                {!weather.wind ? '-' : 
                 weather.wind.direction === 0 && weather.wind.speed === 0 ? 'Calm' : 
                 weather.wind.isVrb ? `Variable at ${weather.wind.speed} kts` : 
                 `${weather.wind.direction}° at ${weather.wind.speed} kts${weather.wind.gust ? ` G ${weather.wind.gust}` : ''}`}
              </td>
            </tr>
            <tr className="border-b">
              <td className="py-1 px-3 text-slate-600">Visibility</td>
              <td className="py-1 px-3 text-right font-medium text-slate-800">{weather.visibility || '-'} sm</td>
            </tr>
            <tr className="border-b bg-gray-50/50">
              <td className="py-1 px-3 text-slate-600">Clouds (AGL)</td>
              <td className="py-1 px-3 text-right font-medium text-slate-800">{getCloudsText()}</td>
            </tr>
            <tr className="border-b">
              <td className="py-1 px-3 text-slate-600">Temperature</td>
              <td className="py-1 px-3 text-right font-medium text-slate-800">
                 {temp !== null ? `${Math.round(temp)}°C (${Math.round(temp * 9/5 + 32)}°F)` : '-'}
              </td>
            </tr>
             <tr className="border-b bg-gray-50/50">
              <td className="py-1 px-3 text-slate-600">Dewpoint</td>
              <td className="py-1 px-3 text-right font-medium text-slate-800">
                 {dewp !== null ? `${Math.round(dewp)}°C (${Math.round(dewp * 9/5 + 32)}°F)` : '-'}
              </td>
            </tr>
            <tr className="border-b">
              <td className="py-1 px-3 text-slate-600">Altimeter</td>
              <td className="py-1 px-3 text-right font-medium text-slate-800">{altimInHg ? `${altimInHg} inHg` : '-'}</td>
            </tr>
            <tr className="border-b bg-gray-50/50">
              <td className="py-1 px-3 text-slate-600">Humidity</td>
              <td className="py-1 px-3 text-right font-medium text-slate-800">{humidity !== null ? `${humidity}%` : '-'}</td>
            </tr>
            <tr className="border-b">
              <td className="py-1 px-3 text-slate-600">Density Altitude</td>
              <td className="py-1 px-3 text-right font-medium text-slate-800">{densityAltitude !== null ? `${densityAltitude.toLocaleString()}'` : '-'}</td>
            </tr>
            
            {/* Sun & Moon */}
            <tr className="border-b bg-gray-50/50">
              <td className="py-1 px-3 text-slate-600">Sunrise</td>
              <td className="py-1 px-3 text-right font-medium flex items-center justify-end gap-1"><span className="text-amber-500">🌅</span> {formatTime(sunTimes.sunrise)}</td>
            </tr>
            <tr className="border-b">
              <td className="py-1 px-3 text-slate-600">Sunset</td>
              <td className="py-1 px-3 text-right font-medium flex items-center justify-end gap-1"><span className="text-orange-500">🌇</span> {formatTime(sunTimes.sunset)}</td>
            </tr>
            <tr className="border-b bg-gray-50/50">
              <td className="py-1 px-3 text-slate-600">Moon Illumination</td>
              <td className="py-1 px-3 text-right font-medium">{Math.round(moonIllumination.fraction * 100)}%</td>
            </tr>
            <tr className="border-b">
              <td className="py-1 px-3 text-slate-600">Moonrise</td>
              <td className="py-1 px-3 text-right font-medium flex items-center justify-end gap-1"><span className="text-yellow-300">🌕</span> {formatTime(moonTimes.rise)}</td>
            </tr>
            <tr className="border-b bg-gray-50/50">
              <td className="py-1 px-3 text-slate-600">Moonset</td>
              <td className="py-1 px-3 text-right font-medium flex items-center justify-end gap-1"><span className="opacity-50">🌑</span> {formatTime(moonTimes.set)}</td>
            </tr>
          </tbody>
        </table>

         <div className="p-3 border-b relative">
            {weather.taf === 'TAF NOT FETCHED' ? (
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <div className="animate-spin h-3 w-3 border-2 border-slate-500 border-t-transparent rounded-full"></div>
                    <span>Fetching TAF...</span>
                </div>
            ) : (
                <>
                    <p className="font-mono text-sm leading-relaxed text-slate-700">{weather.taf}</p>
                    <div className="absolute bottom-2 right-3">
                       <span className="text-blue-500 text-xs cursor-pointer hover:underline">decoded</span>
                    </div>
                </>
            )}
         </div>

         <div className="p-2 bg-gray-50/50 text-[10px] text-slate-400">
           Data sourced from Aviation Weather Center (NOAA & NWS) and local sources.
         </div>
      </div>
    </div>
  );
};
