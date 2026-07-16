import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface WeatherRainOverlayProps {
  isHeavy?: boolean;
}

export const WeatherRainOverlay: React.FC<WeatherRainOverlayProps> = ({ isHeavy = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [show, setShow] = useState(true);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    // Start fading out after 3 seconds
    const fadeTimer = setTimeout(() => {
      setOpacity(0);
    }, 3000);
    // Remove completely after 4.5 seconds
    const removeTimer = setTimeout(() => {
      setShow(false);
    }, 4500); 

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;

    // Create an offscreen canvas for pre-rendering a single drop
    const dropWidth = 2;
    const dropHeight = 30;
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = dropWidth * dpr;
    offscreenCanvas.height = dropHeight * dpr;
    const offCtx = offscreenCanvas.getContext('2d');
    if (offCtx) {
      offCtx.scale(dpr, dpr);
      const gradient = offCtx.createLinearGradient(0, 0, 0, dropHeight);
      gradient.addColorStop(0, 'rgba(160, 190, 220, 0)');
      gradient.addColorStop(1, 'rgba(160, 190, 220, 0.8)');
      offCtx.fillStyle = gradient;
      offCtx.fillRect(0, 0, dropWidth, dropHeight);
    }

    const resizeCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const dropCount = isHeavy ? 600 : 250;
    const drops = new Float32Array(dropCount * 5); // x, y, speedY, speedX, scale

    for (let i = 0; i < dropCount; i++) {
      const idx = i * 5;
      drops[idx] = Math.random() * width; // x
      drops[idx + 1] = Math.random() * height - height; // y
      drops[idx + 2] = Math.random() * 15 + 15; // speedY
      drops[idx + 3] = Math.random() * 3 + 1; // speedX
      drops[idx + 4] = Math.random() * 0.8 + 0.5; // scale
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      
      for (let i = 0; i < dropCount; i++) {
        const idx = i * 5;
        let x = drops[idx];
        let y = drops[idx + 1];
        const speedY = drops[idx + 2];
        const speedX = drops[idx + 3];
        const scale = drops[idx + 4];

        const renderWidth = dropWidth * scale;
        const renderHeight = dropHeight * scale;

        // Use pre-rendered offscreen canvas for performance
        if (offCtx) {
            ctx.save();
            ctx.translate(x, y);
            // Add a slight rotation based on wind speed
            ctx.rotate(Math.atan2(speedX, speedY));
            ctx.globalAlpha = scale * 0.7; // Farther drops are more transparent
            ctx.drawImage(offscreenCanvas, 0, 0, dropWidth * dpr, dropHeight * dpr, 0, 0, renderWidth, renderHeight);
            ctx.restore();
        }

        y += speedY;
        x += speedX;

        if (y > height) {
          y = -renderHeight;
          x = Math.random() * width;
        }
        if (x > width) {
            x = -renderWidth;
        }

        drops[idx] = x;
        drops[idx + 1] = y;
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isHeavy]);

  if (!show || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 pointer-events-none z-[9999] transition-opacity duration-[1500ms]"
      style={{ opacity, background: 'linear-gradient(to bottom, rgba(15, 23, 42, 0.2), rgba(30, 58, 138, 0.1))' }}
    >
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 block w-full h-full"
        style={{ width: '100%', height: '100%' }}
      />
    </div>,
    document.body
  );
};
