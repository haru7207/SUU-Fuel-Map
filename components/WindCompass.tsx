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
    <div className="group absolute bottom-8 right-4 md:bottom-24 md:right-4 z-[1000] pointer-events-auto ios-liquid-pill rounded-full w-14 h-14 flex flex-col items-center justify-center transition-all hover:scale-110">
      {/* Compass rose layout */}
      <div className="relative w-full h-full rounded-full flex items-center justify-center">
          <div className="absolute top-1 text-[8px] font-extrabold text-slate-600 dark:text-slate-300">N</div>
          <div className="absolute bottom-1 text-[8px] font-extrabold text-slate-600 dark:text-slate-300">S</div>
          <div className="absolute left-1.5 text-[8px] font-extrabold text-slate-600 dark:text-slate-300">W</div>
          <div className="absolute right-1.5 text-[8px] font-extrabold text-slate-600 dark:text-slate-300">E</div>
          
          <div 
             className="absolute inset-0 flex items-center justify-center transition-transform duration-1000 ease-in-out"
             style={{ transform: `rotate(${nearestWind.direction}deg)` }}
          >
             <Navigation size={18} className="text-rose-500/90 transform rotate-180 drop-shadow-xs" fill="currentColor" />
          </div>
          
          {/* Inner stats */}
          <div className="absolute z-10 flex flex-col items-center justify-center pointer-events-none mt-1">
             <span className="text-[10px] font-black font-mono text-slate-900 dark:text-white drop-shadow-xs">{nearestWind.speed}</span>
             <span className="text-[6px] uppercase font-bold text-slate-600 dark:text-slate-300">KT</span>
          </div>
      </div>
      
      <div className="absolute -bottom-5 ios-liquid-pill text-slate-900 dark:text-white text-[8px] font-mono font-bold px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        {nearestWind.airport}
      </div>
    </div>
  );
};
