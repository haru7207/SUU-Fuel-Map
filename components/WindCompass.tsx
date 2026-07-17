import React, { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';
import { Airport, WeatherData } from '../types';
import { Navigation } from 'lucide-react';

interface WindCompassProps {
  weatherMap: Record<string, WeatherData>;
  airports: Airport[];
}

export const WindCompass: React.FC<WindCompassProps> = ({ weatherMap, airports }) => {
  const map = useMap();
  const [nearestWind, setNearestWind] = useState<{ direction: number; speed: number; airport: string } | null>(null);

  useEffect(() => {
    const updateNearestWind = () => {
      const center = map.getCenter();
      
      let minDistance = Infinity;
      let closestAirport = null;
      
      for (const apt of airports) {
        const dx = apt.lat - center.lat;
        const dy = apt.lon - center.lng;
        const dist = dx * dx + dy * dy;
        if (dist < minDistance) {
          minDistance = dist;
          closestAirport = apt;
        }
      }
      
      if (closestAirport) {
        const weatherId = closestAirport.weatherSource || closestAirport.id;
        const weather = weatherMap[weatherId];
        if (weather?.wind && !weather.wind.isVrb) {
          setNearestWind({
            direction: weather.wind.direction,
            speed: weather.wind.speed,
            airport: weatherId
          });
          return;
        }
      }
      
      setNearestWind(null);
    };

    updateNearestWind();
    map.on('moveend', updateNearestWind);
    
    return () => {
      map.off('moveend', updateNearestWind);
    };
  }, [map, airports, weatherMap]);

  if (!nearestWind) return null;

  return (
    <div className="group absolute top-4 right-4 z-[1000] pointer-events-auto bg-white/90 dark:bg-slate-800/90 backdrop-blur shadow-md rounded-full w-14 h-14 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center transition-all hover:scale-110">
      {/* Compass rose layout */}
      <div className="relative w-full h-full rounded-full flex items-center justify-center">
          <div className="absolute top-0.5 text-[8px] font-black text-slate-400">N</div>
          <div className="absolute bottom-0.5 text-[8px] font-black text-slate-400">S</div>
          <div className="absolute left-1 text-[8px] font-black text-slate-400">W</div>
          <div className="absolute right-1 text-[8px] font-black text-slate-400">E</div>
          
          <div 
             className="absolute inset-0 flex items-center justify-center transition-transform duration-1000 ease-in-out"
             style={{ transform: `rotate(${nearestWind.direction}deg)` }}
          >
             <Navigation size={18} className="text-red-500 transform rotate-180 drop-shadow-sm" fill="currentColor" />
          </div>
          
          {/* Inner stats */}
          <div className="absolute z-10 flex flex-col items-center justify-center pointer-events-none mt-1">
             <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 drop-shadow-md">{nearestWind.speed}</span>
             <span className="text-[6px] uppercase font-bold text-slate-500 drop-shadow-md">KT</span>
          </div>
      </div>
      
      <div className="absolute -bottom-4 bg-slate-800 dark:bg-slate-900 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        {nearestWind.airport}
      </div>
    </div>
  );
};
