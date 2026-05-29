import React, { useState, useEffect, useRef } from 'react';
import { X, Wind, AlertTriangle, ArrowRight, CloudFog, Loader2 } from 'lucide-react';
import { fetchWeather } from '../services/aviationService';

interface WindComponentsCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WindComponentsCalculator: React.FC<WindComponentsCalculatorProps> = ({ isOpen, onClose }) => {
  const [runway, setRunway] = useState<string>('36');
  const [windDir, setWindDir] = useState<string>('030');
  const [windSpeed, setWindSpeed] = useState<string>('15');
  const [gustSpeed, setGustSpeed] = useState<string>('');
  const [useGust, setUseGust] = useState<boolean>(true);
  const [isFetchingWeather, setIsFetchingWeather] = useState(false);

  const fetchKCDCWeather = async () => {
    setIsFetchingWeather(true);
    try {
      const data = await fetchWeather('KCDC');
      if (data && data.wind) {
        setWindDir(data.wind.direction?.toString() || '0');
        setWindSpeed(data.wind.speed?.toString() || '0');
        setGustSpeed(data.wind.gust > 0 ? data.wind.gust.toString() : '');
        
        // Auto-select runway (KCDC has 2/20)
        let dir = data.wind.direction || 0;
        let hdg2 = 20;
        let hdg20 = 200;
        let hw2 = Math.cos((dir - hdg2) * (Math.PI / 180));
        let hw20 = Math.cos((dir - hdg20) * (Math.PI / 180));
        if (hw2 >= hw20) {
          setRunway('2');
        } else {
          setRunway('20');
        }
      }
    } catch (e) {
      console.error('Failed to fetch KCDC weather', e);
    }
    setIsFetchingWeather(false);
  };

  const runwayCanvasRef = useRef<HTMLCanvasElement>(null);
  const graphCanvasRef = useRef<HTMLCanvasElement>(null);

  const rwyNum = parseFloat(runway) || 0;
  const wDir = parseFloat(windDir) || 0;
  const wSpd = parseFloat(windSpeed) || 0;
  const gSpd = parseFloat(gustSpeed) || 0;

  const activeSpeed = (useGust && gSpd > wSpd) ? gSpd : wSpd;

  let rwyHeading = rwyNum * 10;
  let angleDiff = wDir - rwyHeading;
  while (angleDiff <= -180) angleDiff += 360;
  while (angleDiff > 180) angleDiff -= 360;

  const angleRad = angleDiff * (Math.PI / 180);
  const crosswind = Math.abs(Math.sin(angleRad) * activeSpeed);
  const headwind = Math.cos(angleRad) * activeSpeed; 
  const isTailwind = headwind < 0;
  const crosswindWarning = crosswind > 20;

  useEffect(() => {
    if (!isOpen) return;

    // Fast check for theme (for simplicity; a full solution would use a React context)
    const isDark = document.documentElement.classList.contains('dark');
    const colorText = isDark ? '#e2e8f0' : '#475569';
    const colorTextMuted = isDark ? '#94a3b8' : '#64748b';
    const colorBg = isDark ? '#0f172a' : '#f8fafc';
    const colorGrid = isDark ? '#334155' : '#cbd5e1';

    // --- Animation Scope Setup ---
    let animFrameId;
    let startTime = performance.now();

    const drawRunway = (time) => {
      // --- Runway View Drawing ---
      const rc = runwayCanvasRef.current;
      if (rc) {
        const dpr = window.devicePixelRatio || 1;
        const w = 400;
        const h = 400;
        rc.width = w * dpr;
        rc.height = h * dpr;
        
        const ctx = rc.getContext('2d');
        if (ctx) {
          ctx.scale(dpr, dpr);
          ctx.clearRect(0, 0, w, h);
          
          ctx.fillStyle = colorBg;
          ctx.fillRect(0, 0, w, h);

          const cx = w / 2;
          const cy = h / 2;

          // Pulse effect based on time
          const pulse = Math.sin((time - startTime) / 300); // -1 to 1
          const pulseScale = 1 + (pulse * 0.05); // 0.95 to 1.05

          // Runway Base
          ctx.fillStyle = '#334155'; 
          ctx.fillRect(cx - 40, cy - 160, 80, 320);
          
          // Runway Centerline
          ctx.strokeStyle = '#cbd5e1'; 
          ctx.setLineDash([20, 20]);
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(cx, cy - 150);
          ctx.lineTo(cx, cy + 150);
          ctx.stroke();
          ctx.setLineDash([]);

          // Rwy numbers
          ctx.fillStyle = '#cbd5e1';
          ctx.font = 'bold 32px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // Top number
          ctx.save();
          ctx.translate(cx, cy - 120);
          ctx.rotate(Math.PI);
          const opposite = (rwyNum + 18) > 36 ? rwyNum - 18 : rwyNum + 18;
          ctx.fillText(opposite.toString().padStart(2, '0'), 0, 0);
          ctx.restore();
          
          // Bottom number
          ctx.fillText(rwyNum.toString().padStart(2, '0'), cx, cy + 120);

          if (activeSpeed > 0) {
            // Normalize max wind vector to 120 pixels max length
            const displayScale = Math.min(140 / (activeSpeed || 1), 5);
            
            const windVx = Math.sin(angleRad) * activeSpeed * displayScale * pulseScale;
            const windVy = -Math.cos(angleRad) * activeSpeed * displayScale * pulseScale;

            const drawVector = (fx, fy, tx, ty, color, strokeW = 4, withDashInfo = null) => {
              if (Math.abs(fx - tx) < 0.1 && Math.abs(fy - ty) < 0.1) return; 
              
              if (withDashInfo) {
                ctx.setLineDash([withDashInfo.gap, withDashInfo.gap]);
                ctx.lineDashOffset = -((time - startTime) / 20) % (withDashInfo.gap * 2);
              } else {
                ctx.setLineDash([]);
              }

              ctx.strokeStyle = color;
              ctx.lineWidth = strokeW;
              ctx.beginPath();
              ctx.moveTo(fx, fy);
              ctx.lineTo(tx, ty);
              ctx.stroke();

              ctx.setLineDash([]);
              ctx.fillStyle = color;
              const headlen = 16;
              const angle = Math.atan2(ty - fy, tx - fx);
              ctx.beginPath();
              ctx.moveTo(tx, ty);
              ctx.lineTo(tx - headlen * Math.cos(angle - Math.PI / 6), ty - headlen * Math.sin(angle - Math.PI / 6));
              ctx.lineTo(tx - headlen * Math.cos(angle + Math.PI / 6), ty - headlen * Math.sin(angle + Math.PI / 6));
              ctx.fill();
            };

            const fromX = cx + windVx;
            const fromY = cy + windVy;

            // Crosswind Component (Horizontal)
            drawVector(fromX, cy, cx, cy, '#0ea5e9', 5, { gap: 10 }); // cyan-500
            
            // Headwind Component (Vertical)
            const hwColor = isTailwind ? '#ef4444' : '#10b981';
            drawVector(cx, fromY, cx, cy, hwColor, 5, { gap: 10 });

            // Total Wind (Solid, pulsating length)
            drawVector(fromX, fromY, cx, cy, '#f59e0b', 7); // amber-500

            // Labels
            ctx.fillStyle = '#0ea5e9';
            ctx.font = 'bold 20px sans-serif';
            ctx.fillText(`CW`, fromX < cx ? cx - 35 : cx + 35, cy - 15);
            
            ctx.fillStyle = hwColor;
            ctx.fillText(isTailwind ? 'TW' : 'HW', cx + 35, fromY < cy ? cy - 35 : cy + 35);
          }
        }
      }
      animFrameId = requestAnimationFrame(drawRunway);
    };

    animFrameId = requestAnimationFrame(drawRunway);

    // --- POH Graph Drawing ---
    const gc = graphCanvasRef.current;
    if (gc) {
      const dpr = window.devicePixelRatio || 1;
      const w = 600;
      const h = 500;
      gc.width = w * dpr;
      gc.height = h * dpr;
      
      const ctx = gc.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, w, h);

        ctx.fillStyle = colorBg;
        ctx.fillRect(0, 0, w, h);

        const originX = 80;
        // POH graph maxes at 60 CW, +60 HW, -20 TW
        const scale = 7.5; // pixels per knot
        const originY = h - Math.max(40, 20 * scale + 40); // space for -20 tails

        const getX = (kt: number) => originX + kt * scale;
        const getY = (kt: number) => originY - kt * scale;

        // Danger zone
        ctx.fillStyle = isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)'; 
        ctx.fillRect(getX(20), 0, w - getX(20), h);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(getX(20), 0);
        ctx.lineTo(getX(20), h);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('MAX SR20 DEMONSTRATED', getX(20) + 10, 30);

        // Arcs (10, 20, 30, 40, 50, 60)
        ctx.lineWidth = 1.5;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let v = 10; v <= 60; v += 10) {
          ctx.strokeStyle = colorGrid;
          ctx.beginPath();
          ctx.arc(originX, originY, v * scale, -Math.PI / 2 - 0.5, Math.PI / 2 + 0.5);
          ctx.stroke();

          ctx.fillStyle = colorTextMuted;
          ctx.font = 'bold 12px sans-serif';
          ctx.fillText(v.toString(), originX + 15, getY(v) + 14);
        }

        // Radial Lines
        for (let a = 0; a <= 90; a += 10) {
          const rad = a * Math.PI / 180;
          const maxR = 60; 
          const tx = getX(maxR * Math.sin(rad));
          const ty = getY(maxR * Math.cos(rad));
          
          ctx.strokeStyle = a === 0 ? colorTextMuted : colorGrid;
          ctx.beginPath();
          ctx.moveTo(originX, originY);
          ctx.lineTo(tx, ty);
          ctx.stroke();

          if (a > 0) {
            ctx.fillStyle = colorTextMuted;
            ctx.fillText(a + '°', tx + 14 * Math.sin(rad), ty - 14 * Math.cos(rad));
          }
        }

        // Axes
        ctx.strokeStyle = colorText;
        ctx.lineWidth = 2;
        
        // Y - Axis
        ctx.beginPath();
        ctx.moveTo(originX, getY(60));
        ctx.lineTo(originX, getY(-20)); // min tail
        ctx.stroke();
        
        // X - Axis
        ctx.beginPath();
        ctx.moveTo(originX - 10, originY);
        ctx.lineTo(getX(60), originY);
        ctx.stroke();

        // Labels
        ctx.fillStyle = colorText;
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('HEADWIND', originX - 15, getY(30));
        ctx.fillText('TAILWIND', originX - 15, getY(-10));
        ctx.textAlign = 'left';
        ctx.fillText('CROSSWIND COMPONENT', getX(20), originY - 15);

        // Axis ticks
        ctx.font = '12px sans-serif';
        for (let i = -20; i <= 60; i += 10) {
          ctx.beginPath(); ctx.moveTo(originX - 5, getY(i)); ctx.lineTo(originX + 5, getY(i)); ctx.stroke();
          if (i !== 0) {
            ctx.textAlign = 'right';
            ctx.fillStyle = colorTextMuted;
            ctx.fillText(Math.abs(i).toString(), originX - 15, getY(i));
          }
        }
        for (let i = 10; i <= 60; i += 10) {
          ctx.beginPath(); ctx.moveTo(getX(i), originY - 5); ctx.lineTo(getX(i), originY + 5); ctx.stroke();
          ctx.textAlign = 'center';
          ctx.fillText(i.toString(), getX(i), originY + 20);
        }

        // Plot point
        if (activeSpeed > 0) {
          const px = getX(crosswind);
          const py = getY(Math.abs(headwind) * (isTailwind ? -1 : 1));

          ctx.setLineDash([6, 6]);
          ctx.strokeStyle = '#22d3ee'; // cyan-400
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, originY); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(originX, py); ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = '#facc15'; // yellow-400
          ctx.shadowColor = '#facc15';
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.arc(px, py, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          
          // Little text indicator near dot
          ctx.fillStyle = '#facc15';
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(`(${crosswind.toFixed(1)}, ${Math.abs(headwind).toFixed(1)})`, px + 12, py - 12);
        }
      }
    }
  return () => cancelAnimationFrame(animFrameId);
  }, [isOpen, runway, windDir, windSpeed, gustSpeed, useGust, activeSpeed, crosswind, headwind, isTailwind]);

  if (!isOpen) return null;

  return (
    <div className="absolute z-[1060] bottom-0 left-0 right-0 md:bottom-auto md:top-24 md:right-4 md:left-auto md:w-[40rem] lg:w-[54rem] bg-slate-50 dark:bg-slate-900 rounded-t-2xl md:rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden animate-slide-in-up md:animate-fade-in max-h-[90vh]">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 px-5 py-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-700 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-sky-100 dark:bg-sky-600/20 p-2 rounded-lg">
            <Wind size={24} className="text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Wind Components Calculator</h2>
            <p className="text-xs text-slate-500 font-medium">Instructional Vector Graph</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="overflow-y-auto p-4 custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          
          {/* Inputs Section */}
          <div className="flex flex-col gap-4">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 border-b border-slate-100 dark:border-slate-700 pb-2 flex justify-between items-center">
                <span>Wind Conditions</span>
                <button
                  onClick={fetchKCDCWeather}
                  disabled={isFetchingWeather}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold bg-sky-100/50 hover:bg-sky-100 dark:bg-sky-500/10 dark:hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 rounded-md transition-colors disabled:opacity-50"
                  title="Auto-fill latest KCDC METAR"
                >
                  {isFetchingWeather ? <Loader2 size={14} className="animate-spin" /> : <CloudFog size={14} />}
                  Auto KCDC
                </button>
              </h3>
              
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Runway (1-36)</label>
                  <input
                    type="number" min="1" max="36"
                    value={runway}
                    onChange={(e) => setRunway(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Wind Dir (°)</label>
                  <input
                    type="number" min="0" max="360"
                    value={windDir}
                    onChange={(e) => setWindDir(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Speed (kts)</label>
                  <input
                    type="number" min="0"
                    value={windSpeed}
                    onChange={(e) => setWindSpeed(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Gusts (kts)</label>
                  <input
                    type="number" min="0"
                    value={gustSpeed}
                    onChange={(e) => setGustSpeed(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
              
              <label className="flex items-center gap-2 cursor-pointer pt-2 group">
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${useGust ? 'bg-sky-500 border-sky-500 text-white' : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-600'}`}>
                   {useGust && <ArrowRight size={12} className="rotate-45 block" />}
                </div>
                <input
                  type="checkbox"
                  checked={useGust}
                  onChange={(e) => setUseGust(e.target.checked)}
                  className="hidden"
                />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors">
                  Use Gust Speed for highest crosswind limit
                </span>
              </label>
            </div>

            {/* Numerical Results */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex-1">
               <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">Component Results</h3>
               
               <div className="flex flex-col gap-4">
                 <div className="flex justify-between items-end">
                   <div>
                     <div className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider mb-1">Crosswind</div>
                     <div className="text-3xl font-black text-slate-800 dark:text-white">
                        {crosswind.toFixed(1)} <span className="text-lg text-slate-500 font-bold">kts</span>
                     </div>
                   </div>
                   <div className="text-right">
                     <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${isTailwind ? 'text-red-500 dark:text-red-400' : 'text-emerald-500 dark:text-emerald-400'}`}>
                       {isTailwind ? 'Tailwind' : 'Headwind'}
                     </div>
                     <div className={`text-3xl font-black ${isTailwind ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {Math.abs(headwind).toFixed(1)} <span className="text-lg opacity-70 font-bold">kts</span>
                     </div>
                   </div>
                 </div>
               </div>
            </div>
            
          </div>

          {/* Visual 1: Runway View */}
          <div className="bg-white dark:bg-slate-800 p-[2px] rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden flex flex-col min-h-[300px] justify-center items-center">
            <div className="absolute top-3 left-4 z-10 bg-white/90 dark:bg-slate-800/90 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-lg backdrop-blur-md">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">Vector Breakdown</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Top-down view</p>
            </div>
            <div className="w-full flex-1 aspect-square max-w-[400px] border border-slate-100 dark:border-slate-700/50 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-900 mt-2">
                <canvas ref={runwayCanvasRef} className="w-full h-full object-contain block" />
            </div>
          </div>

        </div>

        {/* Warning Feature */}
        {crosswindWarning && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 p-3 lg:p-4 rounded-xl border border-red-300 dark:border-red-800/60 flex gap-3 animate-fade-in shadow-sm mx-auto w-full">
             <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
             <div>
               <h4 className="text-sm font-bold text-red-800 dark:text-red-400 uppercase tracking-widest">Max Demonstrated Crosswind Exceeded</h4>
               <p className="text-xs lg:text-sm text-red-700 dark:text-red-300 mt-1 font-medium">
                 The calculated crosswind ({crosswind.toFixed(1)} kts) exceeds the Cirrus SR20 Max Demonstrated limit of 20 knots.
               </p>
             </div>
          </div>
        )}

        {/* Visual 2: POH Chart */}
        <div className="bg-white dark:bg-slate-800 p-[2px] rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
           <div className="absolute top-4 left-5 z-10 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-lg">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight">Standard POH Graph</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Plotting wind angle & velocity</p>
           </div>
           <div className="w-full flex justify-center bg-slate-50 dark:bg-[#0f172a] rounded-lg border border-slate-100 dark:border-slate-700/50">
              <div className="w-full max-w-[600px] aspect-[6/5]">
                  <canvas ref={graphCanvasRef} className="w-full h-full object-contain block" />
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};
