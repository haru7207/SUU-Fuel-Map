const fs = require('fs');
let code = fs.readFileSync('./components/WindComponentsCalculator.tsx', 'utf8');

const regex = /\/\/ --- Runway View Drawing ---\s+const rc = runwayCanvasRef\.current;[\s\S]*?\/\/ --- POH Graph Drawing ---/;

const replacement = `// --- Animation Scope Setup ---
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
            ctx.fillText(\`CW\`, fromX < cx ? cx - 35 : cx + 35, cy - 15);
            
            ctx.fillStyle = hwColor;
            ctx.fillText(isTailwind ? 'TW' : 'HW', cx + 35, fromY < cy ? cy - 35 : cy + 35);
          }
        }
      }
      animFrameId = requestAnimationFrame(drawRunway);
    };

    animFrameId = requestAnimationFrame(drawRunway);

    // --- POH Graph Drawing ---`;

const updatedCode = code.replace(regex, replacement);

fs.writeFileSync('./components/WindComponentsCalculator.tsx', updatedCode, 'utf8');

// The second thing we need to do is clear the timeout when component unmounts. Let's see the end of useEffect
const endRegex = /\]\);\n\n  if \(\!isOpen\)/;
const endReplacement = `  return () => cancelAnimationFrame(animFrameId);\n  }, [isOpen, runway, windDir, windSpeed, gustSpeed, useGust, activeSpeed, crosswind, headwind, isTailwind]);\n\n  if (!isOpen)`;
fs.writeFileSync('./components/WindComponentsCalculator.tsx', updatedCode.replace(endRegex, endReplacement), 'utf8');
