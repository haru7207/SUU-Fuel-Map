import React, { useMemo } from 'react';
import { WeatherData } from '../types';

interface WeatherEffectsProps {
  weather: WeatherData;
}

export const WeatherEffects: React.FC<WeatherEffectsProps> = ({ weather }) => {
  const metar = weather.metar?.toUpperCase() || '';
  const taf = weather.taf?.toUpperCase() || '';
  
  const rawText = `${metar} ${taf}`;
  
  // Basic parsing for weather phenomena
  const hasTS = /\b(TS|TSRA|\+TSRA|-TSRA|VCTS)\b/.test(rawText);
  const hasRA = /\b(RA|\+RA|-RA|DZ|SHRA|\+SHRA|-SHRA|TSRA|\+TSRA|-TSRA)\b/.test(rawText);
  const hasSN = /\b(SN|\+SN|-SN|SHSN)\b/.test(rawText);

  if (!hasTS && !hasRA && !hasSN) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 rounded-lg">
       {/* Background gradient hint */}
       {hasTS && <div className="absolute inset-0 bg-gradient-to-b from-slate-900/10 to-transparent mix-blend-overlay"></div>}
       {(hasRA && !hasTS) && <div className="absolute inset-0 bg-gradient-to-b from-blue-900/5 to-transparent mix-blend-overlay"></div>}
       {hasSN && <div className="absolute inset-0 bg-gradient-to-b from-slate-200/20 to-transparent mix-blend-overlay"></div>}

       {hasRA && <RainEffect isHeavy={rawText.includes('+RA') || rawText.includes('+TSRA')} />}
       {hasTS && <ThunderstormEffect />}
       {hasSN && !hasRA && <SnowEffect />}
    </div>
  );
};

const RainEffect: React.FC<{ isHeavy: boolean }> = ({ isHeavy }) => {
    const drops = useMemo(() => Array.from({ length: isHeavy ? 40 : 20 }).map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        animationDuration: `${0.4 + Math.random() * 0.4}s`,
        animationDelay: `${Math.random() * 2}s`,
        opacity: 0.2 + Math.random() * 0.3
    })), [isHeavy]);

    return (
        <div className="absolute inset-0">
            <style>{`
                @keyframes fall {
                    0% { transform: translateY(-50px) rotate(10deg); opacity: 0; }
                    10% { opacity: var(--drop-opacity); }
                    80% { opacity: var(--drop-opacity); }
                    100% { transform: translateY(800px) rotate(10deg); opacity: 0; }
                }
            `}</style>
            {drops.map(drop => (
                <div 
                    key={drop.id}
                    className="absolute top-0 w-0.5 h-12 bg-blue-500 rounded-full"
                    style={{
                        left: drop.left,
                        '--drop-opacity': drop.opacity,
                        animation: `fall ${drop.animationDuration} linear infinite`,
                        animationDelay: drop.animationDelay
                    } as React.CSSProperties}
                />
            ))}
        </div>
    );
};

const ThunderstormEffect: React.FC = () => {
    return (
        <div className="absolute inset-0">
            <style>{`
                @keyframes flash {
                    0%, 95%, 98% { background-color: transparent; }
                    96%, 99% { background-color: rgba(255, 255, 255, 0.4); }
                    100% { background-color: transparent; }
                }
            `}</style>
            <div 
                className="absolute inset-0 mix-blend-overlay"
                style={{ animation: 'flash 7s infinite' }}
            />
        </div>
    );
};

const SnowEffect: React.FC = () => {
    const flakes = useMemo(() => Array.from({ length: 40 }).map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        size: `${2 + Math.random() * 5}px`,
        animationDuration: `${3 + Math.random() * 5}s`,
        animationDelay: `${Math.random() * 5}s`,
        opacity: 0.4 + Math.random() * 0.4
    })), []);

    return (
        <div className="absolute inset-0">
            <style>{`
                @keyframes snow {
                    0% { transform: translateY(-20px) translateX(0px); opacity: 0; }
                    10% { opacity: var(--flake-opacity); }
                    90% { opacity: var(--flake-opacity); }
                    100% { transform: translateY(800px) translateX(40px); opacity: 0; }
                }
            `}</style>
            {flakes.map(flake => (
                <div 
                    key={flake.id}
                    className="absolute top-0 bg-white rounded-full shadow-sm"
                    style={{
                        left: flake.left,
                        width: flake.size,
                        height: flake.size,
                        '--flake-opacity': flake.opacity,
                        animation: `snow ${flake.animationDuration} linear infinite`,
                        animationDelay: flake.animationDelay
                    } as React.CSSProperties}
                />
            ))}
        </div>
    );
};
