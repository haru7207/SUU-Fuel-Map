import React, { useState, useEffect, useRef } from 'react';
import { X, Calculator, Droplet, Clock, Navigation } from 'lucide-react';

interface E6BCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
}

export const E6BCalculator: React.FC<E6BCalculatorProps> = ({ isOpen, onClose }) => {
  const [tc, setTc] = useState<string>('210');
  const [tas, setTas] = useState<string>('145');
  const [wd, setWd] = useState<string>('270');
  const [ws, setWs] = useState<string>('25');
  const [magVarVal, setMagVarVal] = useState<string>('11');
  const [magVarDir, setMagVarDir] = useState<string>('E');
  const [dist, setDist] = useState<string>('120');
  const [gph, setGph] = useState<string>('11.5');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  let wca = 0;
  let th = 0;
  let mh = 0;
  let gs = 0;
  let flightTimeStr = "00:00:00";
  let reqFuel = 0;
  let flightTimeMins = 0;

  const tcNum = Number(tc);
  const tasNum = Number(tas);
  const wdNum = Number(wd);
  const wsNum = Number(ws);
  const varNum = Number(magVarVal);
  
  if (!isNaN(tcNum) && !isNaN(tasNum) && !isNaN(wdNum) && !isNaN(wsNum) && tasNum > 0) {
     const waRad = (wdNum - tcNum) * Math.PI / 180;
     const sinWca = (wsNum * Math.sin(waRad)) / tasNum;
     
     if (Math.abs(sinWca) <= 1) {
         const wcaRad = Math.asin(sinWca);
         wca = wcaRad * 180 / Math.PI;
         
         th = (tcNum + wca) % 360;
         if (th < 0) th += 360;
         
         if (!isNaN(varNum)) {
             const varMulti = magVarDir === 'E' ? -1 : 1;
             mh = (th + (varNum * varMulti)) % 360;
             if (mh < 0) mh += 360;
         } else {
             mh = th;
         }
         
         gs = tasNum * Math.cos(wcaRad) - wsNum * Math.cos(waRad);
     }
  }

  const distNum = Number(dist);
  const gphNum = Number(gph);

  if (!isNaN(distNum) && gs > 0) {
      const timeHours = distNum / gs;
      flightTimeMins = timeHours * 60;
      
      let h = Math.floor(timeHours);
      let m = Math.floor((timeHours - h) * 60);
      let s = Math.round((timeHours - h - m/60) * 3600);
      
      if (s === 60) {
          s = 0;
          m += 1;
      }
      if (m === 60) {
          m = 0;
          h += 1;
      }
      
      flightTimeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      
      if (!isNaN(gphNum)) {
         reqFuel = timeHours * gphNum;
      }
  }

  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const padding = 30;
    const r = Math.min(width, height) / 2 - padding;

    ctx.clearRect(0, 0, width, height);

    // Draw outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#475569'; // slate-600
    ctx.stroke();

    // N, E, S, W markings
    ctx.fillStyle = '#94a3b8'; // slate-400
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', cx, cy - r - 15);
    ctx.fillText('E', cx + r + 15, cy);
    ctx.fillText('S', cx, cy + r + 15);
    ctx.fillText('W', cx - r - 15, cy);

    // Center dot
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, 2 * Math.PI);
    ctx.fillStyle = '#94a3b8';
    ctx.fill();

    let courseDeg = Number(tc) || 0;
    let headingDeg = th || 0;
    let magHeadingDeg = mh || 0;
    let windDirDeg = Number(wd) || 0;

    const rad = Math.PI / 180;
    
    // Helper to draw vectors from center
    const drawVector = (fromX: number, fromY: number, angleDeg: number, length: number, color: string, width: number = 3, dashed: boolean = false) => {
       const toX = fromX + length * Math.sin(angleDeg * rad);
       const toY = fromY - length * Math.cos(angleDeg * rad);
       
       ctx.beginPath();
       if (dashed) {
           ctx.setLineDash([5, 5]);
       } else {
           ctx.setLineDash([]);
       }
       ctx.moveTo(fromX, fromY);
       ctx.lineTo(toX, toY);
       ctx.strokeStyle = color;
       ctx.lineWidth = width;
       ctx.stroke();
       ctx.setLineDash([]);
       
       // Arrow head
       const headlen = 10;
       const angle = Math.atan2(toY - fromY, toX - fromX);
       ctx.beginPath();
       ctx.moveTo(toX, toY);
       ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
       ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
       ctx.lineTo(toX, toY);
       ctx.fillStyle = color;
       ctx.fill();
    };

    const maxLen = r - 10;
    
    // Draw Course (Red)
    drawVector(cx, cy, courseDeg, maxLen, '#ef4444', 3); 

    // Draw True Heading (White/Light Slate)
    drawVector(cx, cy, headingDeg, maxLen * 0.9, '#e2e8f0', 3);

    // Draw Mag Heading (Indigo) dashed
    drawVector(cx, cy, magHeadingDeg, maxLen * 0.8, '#6366f1', 2, true);

    // Draw Wind (Blue)
    // Wind is pointing from its direction towards the center.
    // For visualization, let's draw it coming from outside into the center to form the triangle
    // Or we can draw it from edge pointing inwards.
    const windStartX = cx + (r + 15) * Math.sin(windDirDeg * rad);
    const windStartY = cy - (r + 15) * Math.cos(windDirDeg * rad);
    drawVector(windStartX, windStartY, windDirDeg + 180, 45, '#3b82f6', 4);

  }, [isOpen, tc, tas, wd, ws, wca, th, mh, magVarVal, magVarDir]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden border border-slate-200 dark:border-slate-800">
        
        {/* Left Column - Inputs */}
        <div className="flex-1 overflow-y-auto border-r border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
              <Calculator className="text-blue-500" />
              E6B Flight Computer
            </h2>
            <button 
              onClick={onClose}
              className="md:hidden text-slate-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-8">
            {/* Section A */}
            <div className="space-y-4">
               <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                 <Navigation size={16} /> Heading, Ground Speed & WCA
               </h3>
               
               <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">True Course</label>
                      <input
                          type="number"
                          value={tc}
                          onChange={(e) => setTc(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">True Air Speed</label>
                      <input
                          type="number"
                          value={tas}
                          onChange={(e) => setTas(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Wind Dir (True)</label>
                      <input
                          type="number"
                          value={wd}
                          onChange={(e) => setWd(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Wind Speed</label>
                      <input
                          type="number"
                          value={ws}
                          onChange={(e) => setWs(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mag Variation</label>
                      <div className="flex gap-2">
                          <input
                              type="number"
                              value={magVarVal}
                              onChange={(e) => setMagVarVal(e.target.value)}
                              className="w-2/3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                          />
                          <select
                              value={magVarDir}
                              onChange={(e) => setMagVarDir(e.target.value)}
                              className="w-1/3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                          >
                              <option value="E">E</option>
                              <option value="W">W</option>
                          </select>
                      </div>
                  </div>
               </div>

               <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
                   <div className="bg-slate-100 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                       <span className="block text-xs font-bold text-slate-500 uppercase mb-1">WCA</span>
                       <span className="font-mono text-lg font-bold text-slate-800 dark:text-slate-200">
                           {wca > 0 ? '+' : ''}{wca.toFixed(1)}
                       </span>
                   </div>
                   <div className="bg-slate-100 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                       <span className="block text-xs font-bold text-slate-500 uppercase mb-1">True Hdg</span>
                       <span className="font-mono text-lg font-bold text-slate-800 dark:text-slate-200">
                           {th.toFixed(0).padStart(3, '0')}
                       </span>
                   </div>
                   <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg border border-indigo-200 dark:border-indigo-800">
                       <span className="block text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase mb-1">Mag Hdg</span>
                       <span className="font-mono text-lg font-bold text-indigo-800 dark:text-indigo-300">
                           {mh.toFixed(0).padStart(3, '0')}
                       </span>
                   </div>
                   <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                       <span className="block text-xs font-bold text-blue-600 dark:text-blue-400 uppercase mb-1">Ground Speed</span>
                       <span className="font-mono text-lg font-bold text-blue-800 dark:text-blue-300">
                           {gs > 0 ? gs.toFixed(1) : '---'}
                       </span>
                   </div>
               </div>
            </div>

            {/* Section B */}
            <div className="space-y-4">
               <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                 <Clock size={16} /> Flight Time
               </h3>
               
               <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Distance (NM)</label>
                      <input
                          type="number"
                          value={dist}
                          onChange={(e) => setDist(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                  </div>
                  <div>
                      <div className="h-full flex flex-col justify-end">
                         <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 flex-1 rounded-lg border border-emerald-100 dark:border-emerald-800">
                             <span className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1">Flight Time</span>
                             <span className="font-mono text-lg font-bold text-emerald-800 dark:text-emerald-300">
                                 {gs > 0 ? flightTimeStr : '--:--:--'}
                             </span>
                         </div>
                      </div>
                  </div>
               </div>
            </div>

            {/* Section C */}
            <div className="space-y-4">
               <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                 <Droplet size={16} /> Fuel Consumption
               </h3>
               
               <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fuel per Hour (GPH)</label>
                      <input
                          type="number"
                          value={gph}
                          onChange={(e) => setGph(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                  </div>
                  <div>
                      <div className="h-full flex flex-col justify-end">
                         <div className="bg-amber-50 dark:bg-amber-900/20 p-3 flex-1 rounded-lg border border-amber-100 dark:border-amber-800">
                             <span className="block text-xs font-bold text-amber-600 dark:text-amber-400 uppercase mb-1">Required Fuel</span>
                             <span className="font-mono text-lg font-bold text-amber-800 dark:text-amber-300">
                                 {gs > 0 ? reqFuel.toFixed(2) : '--'}
                             </span>
                         </div>
                      </div>
                  </div>
               </div>
            </div>

          </div>
        </div>

        {/* Right Column - Illustration */}
        <div className="hidden md:flex flex-1 bg-slate-50 dark:bg-slate-950 p-6 flex-col items-center justify-center relative">
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 uppercase tracking-wider">Illustration</h3>
            
            <div className="relative">
                <canvas 
                    ref={canvasRef} 
                    width={400} 
                    height={400} 
                    className="w-[300px] h-[300px] lg:w-[400px] lg:h-[400px]"
                ></canvas>

                {/* Legend Overlay */}
                <div className="absolute top-0 right-0 lg:-right-4 space-y-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm text-sm">
                   <div className="flex items-center gap-2">
                       <span className="w-4 h-4 bg-red-500 rounded-sm"></span>
                       <span className="font-mono text-slate-700 dark:text-slate-300">Course: {tc.padStart(3, '0')}</span>
                   </div>
                   <div className="flex items-center gap-2">
                       <span className="w-4 h-4 bg-slate-200 rounded-sm outline outline-1 outline-slate-400"></span>
                       <span className="font-mono text-slate-700 dark:text-slate-300">T Hdg: {th.toFixed(0).padStart(3, '0')}</span>
                   </div>
                   <div className="flex items-center gap-2">
                       <span className="w-4 h-4 bg-indigo-500 rounded-sm"></span>
                       <span className="font-mono text-slate-700 dark:text-slate-300">M Hdg: {mh.toFixed(0).padStart(3, '0')}</span>
                   </div>
                   <div className="flex items-center gap-2">
                       <span className="w-4 h-4 bg-blue-500 rounded-sm"></span>
                       <span className="font-mono text-slate-700 dark:text-slate-300">Wind: {wd.padStart(3, '0')} @ {ws}</span>
                   </div>
                   <div className="flex items-center gap-2 mt-4 pt-2 border-t border-slate-200 dark:border-slate-700">
                       <span className="w-4 h-4 font-black text-amber-500 flex items-center justify-center">∠</span>
                       <span className="font-mono text-slate-700 dark:text-slate-300">WCA: {wca > 0 ? '+' : ''}{wca.toFixed(1)}</span>
                   </div>
                   <div className="flex items-center gap-2">
                       <span className="w-4 h-4 font-black flex items-center justify-center text-blue-500">→</span>
                       <span className="font-mono text-slate-700 dark:text-slate-300">GS: {gs > 0 ? gs.toFixed(1) : '---'}</span>
                   </div>
                   <div className="flex items-center gap-2">
                       <span className="w-4 h-4 font-black flex items-center justify-center text-slate-500">TAS</span>
                       <span className="font-mono text-slate-700 dark:text-slate-300">TAS: {tas}</span>
                   </div>
                </div>
            </div>
            
        </div>
      </div>
    </div>
  );
};
