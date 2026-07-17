import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { WeatherData } from '../types';
import { WeatherRainOverlay } from './WeatherRainOverlay';

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

  const [showFullScreen, setShowFullScreen] = useState(true);
  const [fadeFullScreen, setFadeFullScreen] = useState(false);

  useEffect(() => {
    // Start fading out after 3 seconds
    const fadeTimer = setTimeout(() => {
      setFadeFullScreen(true);
    }, 3000);
    // Remove completely after 4.5 seconds
    const removeTimer = setTimeout(() => {
      setShowFullScreen(false);
    }, 4500); 
    return () => {
        clearTimeout(fadeTimer);
        clearTimeout(removeTimer);
    };
  }, []);

  if (!hasTS && !hasRA && !hasSN) return null;

  const fullScreenOpacityClass = fadeFullScreen ? "opacity-0" : "opacity-100";
  const isHeavyRain = rawText.includes('+RA') || rawText.includes('+TSRA');

  return (
    <>
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 rounded-lg">
         {/* Background gradient hint */}
         {hasTS && <div className="absolute inset-0 bg-gradient-to-b from-slate-900/10 to-transparent mix-blend-overlay"></div>}
         {(hasRA && !hasTS) && <div className="absolute inset-0 bg-gradient-to-b from-blue-900/5 to-transparent mix-blend-overlay"></div>}
         {hasSN && <div className="absolute inset-0 bg-gradient-to-b from-slate-200/20 to-transparent mix-blend-overlay"></div>}
         
         {hasRA && <RainEffect isHeavy={isHeavyRain} />}
         {hasTS && <ThunderstormEffect />}
         {hasSN && !hasRA && <SnowEffect />}
      </div>

      {hasRA && <WeatherRainOverlay isHeavy={isHeavyRain} />}

      {showFullScreen && typeof document !== 'undefined' && createPortal(
        <div className={`fixed inset-0 pointer-events-none z-[9999] overflow-hidden transition-opacity duration-1000 ${fullScreenOpacityClass}`}>
           {hasTS && <div className="absolute inset-0 bg-slate-900/20"></div>}
           {hasSN && <div className="absolute inset-0 bg-slate-200/20"></div>}
           
           {hasTS && <ThunderstormEffect fullScreen={true} />}
           {hasSN && !hasRA && <SnowEffect fullScreen={true} />}
        </div>,
        document.body
      )}
    </>
  );
};

const RainEffect: React.FC<{ isHeavy: boolean }> = ({ isHeavy }) => {
    const dropCount = isHeavy ? 40 : 20;
    const drops = useMemo(() => Array.from({ length: dropCount }).map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        animationDuration: `${0.3 + Math.random() * 0.4}s`,
        animationDelay: `${Math.random() * 2}s`,
        opacity: 0.2 + Math.random() * 0.5,
        scale: 0.5 + Math.random() * 0.8
    })), [dropCount]);

    return (
        <div className="absolute inset-0">
            <style>{`
                @keyframes fall-rain-container {
                    0% { transform: translateY(-100px) rotate(15deg); opacity: 0; }
                    10% { opacity: var(--drop-opacity); }
                    80% { opacity: var(--drop-opacity); }
                    100% { transform: translateY(800px) rotate(15deg); opacity: 0; }
                }
            `}</style>
            {drops.map(drop => (
                <div 
                    key={drop.id}
                    className="absolute top-0 bg-gradient-to-b from-transparent to-blue-400/80 rounded-full blur-[0.5px]"
                    style={{
                        left: drop.left,
                        width: '2px',
                        height: '40px',
                        '--drop-opacity': drop.opacity,
                        animation: `fall-rain-container ${drop.animationDuration} linear infinite`,
                        animationDelay: drop.animationDelay,
                        transform: `scale(${drop.scale})`
                    } as React.CSSProperties}
                />
            ))}
        </div>
    );
};

const ThunderstormEffect: React.FC<{ fullScreen?: boolean }> = ({ fullScreen = false }) => {
    // Generate some random positions for lightning bolts
    const bolts = useMemo(() => Array.from({ length: 3 }).map((_, i) => ({
        id: i,
        left: `${15 + Math.random() * 70}%`,
        scale: 0.5 + Math.random() * 1.5,
        opacity: 0.6 + Math.random() * 0.4,
        delay: `${Math.random() * 8}s`,
        rotation: `${-15 + Math.random() * 30}deg`,
        flip: Math.random() > 0.5 ? -1 : 1
    })), []);

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <style>{`
                @keyframes flash-storm {
                    0%, 93%, 97%, 100% { background-color: transparent; }
                    95%, 98% { background-color: rgba(255, 255, 255, ${fullScreen ? 0.3 : 0.6}); }
                }
                @keyframes strike-bolt {
                    0%, 93%, 97%, 100% { opacity: 0; }
                    95%, 98% { opacity: var(--bolt-opacity); }
                }
            `}</style>
            
            <div 
                className="absolute inset-0 mix-blend-overlay"
                style={{ animation: 'flash-storm 6s infinite ease-in-out' }}
            />

            {bolts.map(bolt => (
                <div
                    key={bolt.id}
                    className="absolute top-0 origin-top opacity-0"
                    style={{
                        left: bolt.left,
                        transform: `scaleX(${bolt.flip}) scale(${bolt.scale}) rotate(${bolt.rotation})`,
                        '--bolt-opacity': bolt.opacity,
                        animation: 'strike-bolt 6s infinite ease-in-out',
                        animationDelay: bolt.delay
                    } as React.CSSProperties}
                >
                    {/* Glowing Lightning Bolt */}
                    <svg width="40" height="130" viewBox="0 0 40 130" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_0_15px_rgba(255,255,255,0.9)]">
                        <path d="M28 0L0 70H18L5 130L40 50H20L28 0Z" fill="#ffffff" />
                        <path d="M28 0L0 70H18L5 130L40 50H20L28 0Z" fill="#fde047" fillOpacity="0.3" />
                    </svg>
                </div>
            ))}
        </div>
    );
};

const SnowEffect: React.FC<{ fullScreen?: boolean }> = ({ fullScreen = false }) => {
    const flakeCount = fullScreen ? 150 : 40;
    const flakes = useMemo(() => Array.from({ length: flakeCount }).map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        size: `${2 + Math.random() * 6}px`,
        animationDuration: `${3 + Math.random() * 6}s`,
        animationDelay: `${Math.random() * 5}s`,
        opacity: 0.4 + Math.random() * 0.6,
        swayDuration: `${2 + Math.random() * 3}s`
    })), [flakeCount]);

    const distance = fullScreen ? '120vh' : '800px';

    return (
        <div className="absolute inset-0">
            <style>{`
                @keyframes snow-fall {
                    0% { transform: translateY(-50px) translateX(0px); opacity: 0; }
                    10% { opacity: var(--flake-opacity); }
                    90% { opacity: var(--flake-opacity); }
                    100% { transform: translateY(${distance}) translateX(40px); opacity: 0; }
                }
                @keyframes snow-sway {
                    0%, 100% { margin-left: 0; }
                    50% { margin-left: 20px; }
                }
            `}</style>
            {flakes.map(flake => (
                <div 
                    key={flake.id}
                    className="absolute top-0 bg-white rounded-full shadow-sm blur-[1px]"
                    style={{
                        left: flake.left,
                        width: flake.size,
                        height: flake.size,
                        '--flake-opacity': flake.opacity,
                        animation: `snow-fall ${flake.animationDuration} linear infinite, snow-sway ${flake.swayDuration} ease-in-out infinite alternate`,
                        animationDelay: `${flake.animationDelay}, ${flake.animationDelay}`
                    } as React.CSSProperties}
                />
            ))}
        </div>
    );
};
