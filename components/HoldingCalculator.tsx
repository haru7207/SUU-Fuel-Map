import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, X, Compass } from 'lucide-react';

interface HoldingCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HoldingCalculator: React.FC<HoldingCalculatorProps> = ({ isOpen, onClose }) => {
  // Inputs
  const [heading, setHeading] = useState<number>(300);
  const [radial, setRadial] = useState<number>(360);
  const [turnDirection, setTurnDirection] = useState<'right' | 'left'>('right');

  // Outputs
  const [entryType, setEntryType] = useState<string>('Parallel');

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    calculateHoldingEntry();
  }, [heading, radial, turnDirection]);

  useEffect(() => {
    if (isOpen) {
      drawCanvas();
    }
  }, [isOpen, entryType, heading, radial, turnDirection]);

  const normalizeHeading = (h: number) => {
    while (h < 0) h += 360;
    while (h >= 360) h -= 360;
    return h;
  };

  const calculateHoldingEntry = () => {
    // Standard holding entry logic
    // Aircraft heading
    const hdg = normalizeHeading(heading);
    // The hold radial is the outbound course from the fix
    const outbound = normalizeHeading(radial);
    
    // Determine angle difference from heading to outbound course
    const diff = normalizeHeading(hdg - outbound);

    let type = 'Direct';

    if (turnDirection === 'right') { // Standard
      if (diff >= 290 || diff < 0) { // < 0 handle just in case, though normalizeHeading handles it
        type = 'Teardrop';
      } else if (diff >= 0 && diff < 110) {
        type = 'Parallel';
      } else {
        type = 'Direct';
      }
    } else { // Non-standard Left
      if (diff >= 0 && diff < 70) {
        type = 'Teardrop';
      } else if (diff >= 250 || diff < 0) {
        type = 'Parallel';
      } else {
        type = 'Direct';
      }
    }
    setEntryType(type);
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const r = Math.min(width, height) / 2 - 40;

    ctx.clearRect(0, 0, width, height);

    // Draw background sectors
    // Inbound course is the "top" reference for sectors, but actually let's draw north up
    const inboundCourse = normalizeHeading(radial + 180);
    const rad = Math.PI / 180;

    // Draw the sectors relative to the inbound course
    // We'll rotate the context so North is up, and draw sectors
    // Sectors are based on the inbound course
    // If Right turn: Direct is 180deg (70 to 250 rel to inbound), Teardrop 70deg (0 to 70), Parallel 110deg (250 to 360)
    // We visualize it from the perspective of North Up.

    // Calculate sector angles in standard math radians (0 is East, increasing clockwise if we want, but standard is counter-clockwise. Canvas is clockwise).
    // Let's use canvas angles: 0 is East, PI/2 is South. Wait, let's just use regular aviation degrees: 0 is North, 90 East.
    // Canvas: x = cx + r * sin(deg), y = cy - r * cos(deg)
    // To use arc(), 0 is East. angle = (deg - 90) * rad.

    const drawSector = (startDeg: number, endDeg: number, color: string) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      // arc(x, y, radius, startAngle, endAngle)
      ctx.arc(cx, cy, r, (startDeg - 90) * rad, (endDeg - 90) * rad);
      ctx.fillStyle = color;
      ctx.fill();
    };

    // Calculate boundaries based on inbound course
    let s_td_start, s_td_end, s_pl_start, s_pl_end, s_dr_start, s_dr_end;

    if (turnDirection === 'right') {
      s_td_start = inboundCourse + 290;
      s_td_end = inboundCourse + 360;
      s_pl_start = inboundCourse;
      s_pl_end = inboundCourse + 110;
      s_dr_start = inboundCourse + 110;
      s_dr_end = inboundCourse + 290;
    } else {
      s_td_start = inboundCourse;
      s_td_end = inboundCourse + 70;
      s_pl_start = inboundCourse + 250;
      s_pl_end = inboundCourse + 360;
      s_dr_start = inboundCourse + 70;
      s_dr_end = inboundCourse + 250;
    }

    // Colors roughly matching standard visualization
    // Direct: light green, Parallel: light blue, Teardrop: light red
    // For dark theme, we use darker, saturated tints
    const colDirect = '#14532d'; // dark green
    const colParallel = '#1e3a8a'; // dark blue
    const colTeardrop = '#7f1d1d'; // dark red

    const drawSafeSector = (startDeg: number, endDeg: number, color: string) => {
      let s = normalizeHeading(startDeg);
      let e = normalizeHeading(endDeg);
      if (s > e) {
        drawSector(s, 360, color);
        drawSector(0, e, color);
      } else {
        drawSector(s, e, color);
      }
    }

    drawSafeSector(s_dr_start, s_dr_end, colDirect);
    drawSafeSector(s_pl_start, s_pl_end, colParallel);
    drawSafeSector(s_td_start, s_td_end, colTeardrop);

    // Outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#475569';
    ctx.stroke();

    // North, East, South, West labels
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', cx, cy - r - 15);
    ctx.fillText('E', cx + r + 15, cy);
    ctx.fillText('S', cx, cy + r + 15);
    ctx.fillText('W', cx - r - 15, cy);

    // Draw Hold Pattern
    // Fix is at center
    // Inbound leg goes along inboundCourse TOWARDS the fix.
    // Outbound leg depends on turn direction.
    const outboundCourse = normalizeHeading(inboundCourse + 180);
    
    // Draw holding pattern shape (racetrack)
    ctx.beginPath();
    const holdLength = 60; // pixels
    const holdWidth = 30; // pixels

    // We can define the holding pattern in a local coordinate system and rotate it
    ctx.save();
    ctx.translate(cx, cy);
    // Rotate so Inbound course is pointing "UP" (0 degrees)
    // Aviation 0 is UP. Context 0 is RIGHT. We already translate.
    ctx.rotate(inboundCourse * rad);

    ctx.strokeStyle = '#f8fafc'; // white line for holding pattern
    ctx.lineWidth = 2;

    // Fix is at (0,0). Inbound comes from bottom (actually, inbound course points UP, so inbound comes from bottom to center? No, 'inbound' means the course you fly to the fix. If inbound is 360, you fly 360 towards fix, meaning you come from South.
    // So inbound line is from (0, holdLength) to (0,0)? Yes.
    
    // Right turn pattern: 
    // Arrive at fix (0,0). Turn right 180 to outbound.
    // Outbound is parallel to inbound, offset by holdWidth.
    const hd = turnDirection === 'right' ? 1 : -1;
    
    // Inbound leg
    ctx.beginPath();
    ctx.moveTo(0, holdLength);
    ctx.lineTo(0, 0);
    
    // Turn
    ctx.arc(
      hd * holdWidth / 2, 
      0, 
      holdWidth / 2, 
      turnDirection === 'right' ? Math.PI : 0, 
      turnDirection === 'right' ? 0 : Math.PI, 
      turnDirection !== 'right'
    );
    
    // Outbound leg
    ctx.lineTo(hd * holdWidth, holdLength);
    
    // Turn 2
    ctx.arc(
      hd * holdWidth / 2, 
      holdLength, 
      holdWidth / 2, 
      turnDirection === 'right' ? 0 : Math.PI, 
      turnDirection === 'right' ? Math.PI : 0, 
      turnDirection !== 'right'
    );
    
    ctx.stroke();
    
    // Draw fix
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();
    ctx.restore();

    // Draw the Aircraft
    const currentHdg = normalizeHeading(heading);
    const acX = cx + (r - 20) * Math.sin((inboundCourse + 180) * rad); // Roughly position it bottom
    // Instead of fixed position, let's just put it at bottom, pointing towards its heading.
    ctx.save();
    ctx.translate(cx + (r - 40) * Math.sin((inboundCourse + 180 - currentHdg + currentHdg) * rad), cy - (r - 40) * Math.cos((inboundCourse + 180) * rad));
    // Wait, let's just make aircraft at a fixed point on the circle for entry visualization
    
    // Let's place the aircraft on the edge of the circle, opposite to the sector it's coming from.
    // Actually, simply putting the aircraft on the aircraft's heading edge pointing to center:
    const fromDeg = normalizeHeading(currentHdg + 180);
    const startX = cx + r * Math.sin(fromDeg * rad);
    const startY = cy - r * Math.cos(fromDeg * rad);

    ctx.translate(startX, startY);
    ctx.rotate(currentHdg * rad);
    
    // Draw airplane simple shape
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(5, 5);
    ctx.lineTo(0, 0);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fillStyle = '#ef4444'; // Red airplane
    ctx.fill();
    ctx.restore();

    // Draw entry line (dotted)
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.moveTo(startX, startY);
    ctx.lineTo(cx, cy);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
  };

  if (!isOpen) return null;

  return (
    <div className="absolute z-[1060] bottom-0 left-0 right-0 md:bottom-auto md:top-36 md:right-4 md:left-auto md:w-[28rem] lg:w-[40rem] bg-slate-50 dark:bg-slate-900 rounded-t-2xl md:rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden animate-slide-in-up h-[85vh] md:h-[600px] md:max-h-[75vh]">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white px-5 py-4 flex justify-between items-center flex-shrink-0 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 dark:bg-blue-600/20 p-2 rounded-lg">
            <Compass size={24} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Holding Entry Calculator</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Determine appropriate entry based on FAA standards</p>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-slate-50 dark:bg-slate-900 flex flex-col lg:flex-row gap-6">
        
        {/* Visualization area */}
        <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 relative shadow-sm">
          <canvas ref={canvasRef} width={300} height={300} className="max-w-full h-auto drop-shadow-md" />
          
          <div className="absolute top-4 right-4 bg-white/90 dark:bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 backdrop-blur-sm shadow-sm">
             <div className="font-bold text-slate-600 dark:text-slate-200">Recommended Entry</div>
             <div className="text-lg font-black text-blue-600 dark:text-blue-400">{entryType}</div>
          </div>

          <div className="absolute bottom-4 left-4 flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
             <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-[#14532d] inline-block rounded border border-[#0f3e22]"></span> Direct</div>
             <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-[#1e3a8a] inline-block rounded border border-[#172e6e]"></span> Parallel</div>
             <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-[#7f1d1d] inline-block rounded border border-[#5c1515]"></span> Teardrop</div>
          </div>
        </div>

        {/* Form area */}
        <div className="w-full lg:w-64 flex flex-col gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 drop-shadow-sm">Aircraft Heading</label>
                <input
                  type="number"
                  min="0"
                  max="359"
                  value={heading}
                  onChange={(e) => setHeading(Number(e.target.value))}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-lg shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 drop-shadow-sm">Hold Radial (<span className="text-blue-600 dark:text-blue-400">Outbound</span>)</label>
                <input
                  type="number"
                  min="0"
                  max="359"
                  value={radial}
                  onChange={(e) => setRadial(Number(e.target.value))}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-lg shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 drop-shadow-sm">Turn Direction</label>
                <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                   <button 
                     onClick={() => setTurnDirection('left')}
                     className={`flex-1 py-2 text-sm font-bold transition-colors ${turnDirection === 'left' ? 'bg-blue-600 text-white shadow-inner' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                   >
                     Left
                   </button>
                   <button 
                     onClick={() => setTurnDirection('right')}
                     className={`flex-1 py-2 text-sm font-bold transition-colors border-l border-slate-200 dark:border-slate-700 ${turnDirection === 'right' ? 'bg-blue-600 text-white shadow-inner' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                   >
                     Right
                   </button>
                </div>
              </div>
            </div>
        </div>

      </div>
    </div>
  );
};
