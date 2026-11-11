import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  RotateCcw, 
  HelpCircle, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  Compass, 
  ChevronUp, 
  ChevronDown, 
  Zap, 
  Layers, 
  Info,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface GFC500SimulatorProps {
  isOpen: boolean;
  onClose: () => void;
}

// AFCS Modes Definition
type LateralMode = 'ROL' | 'HDG' | 'TRK' | 'NAV' | 'APR' | 'LVL' | null;
type LateralArmedMode = 'NAV' | 'APR' | null;
type VerticalMode = 'PIT' | 'ALT' | 'VS' | 'FLC' | 'VNAV' | 'ALTS' | 'LVL' | 'GS' | 'GP' | null;
type VerticalArmedMode = 'ALTS' | 'ALT' | 'GS' | 'GP' | 'VNAV' | null;

interface AFCSState {
  power: boolean;
  fd: boolean;
  ap: boolean;
  yd: boolean;
  lateralActive: LateralMode;
  lateralArmed: LateralArmedMode;
  verticalActive: VerticalMode;
  verticalArmed: VerticalArmedMode;
  selectedHeading: number;      // Degrees (0-359)
  selectedAltitude: number;     // Feet (e.g., 2200)
  targetVS: number;             // FPM (e.g. +500)
  targetFLC: number;            // Knots (e.g. 100)
  targetPitch: number;          // Degrees (-15 to +15)
  targetBank: number;           // Commanded bank by FD (-25 to +25)
  apFlash: boolean;             // Flashing yellow on disconnect
}

export const GFC500Simulator: React.FC<GFC500SimulatorProps> = ({ isOpen, onClose }) => {
  // Simulator State
  const [afcs, setAfcs] = useState<AFCSState>({
    power: true,
    fd: false,
    ap: false,
    yd: false,
    lateralActive: null,
    lateralArmed: null,
    verticalActive: null,
    verticalArmed: null,
    selectedHeading: 360,
    selectedAltitude: 2200,
    targetVS: 0,
    targetFLC: 100,
    targetPitch: 0,
    targetBank: 0,
    apFlash: false
  });

  // Simulated Aircraft Dynamics
  const aircraftRef = useRef({
    pitch: 0,           // degrees
    bank: 0,            // degrees
    heading: 345,       // degrees
    altitude: 2200,     // feet
    airspeed: 100,      // knots
    vs: 0,              // fpm
    turnRate: 0         // deg/s
  });

  const [displayMetrics, setDisplayMetrics] = useState({
    pitch: 0,
    bank: 0,
    heading: 345,
    altitude: 2200,
    airspeed: 100,
    vs: 0
  });

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeScenario, setActiveScenario] = useState<string>('custom');
  const [showHelp, setShowHelp] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Audio synthesize helpers
  const playBeep = useCallback((freq = 800, duration = 0.08, type: OscillatorType = 'sine') => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio not supported or blocked
    }
  }, [soundEnabled]);

  const playApDisconnect = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const times = [0, 0.12, 0.24, 0.36];
      times.forEach((t) => {
        setTimeout(() => playBeep(1200, 0.09, 'triangle'), t * 1000);
      });
    } catch {}
  }, [soundEnabled, playBeep]);

  // Reset to initial test values
  const resetSimulator = useCallback(() => {
    aircraftRef.current = {
      pitch: 0,
      bank: 0,
      heading: 345,
      altitude: 2200,
      airspeed: 100,
      vs: 0,
      turnRate: 0
    };
    setAfcs({
      power: true,
      fd: false,
      ap: false,
      yd: false,
      lateralActive: null,
      lateralArmed: null,
      verticalActive: null,
      verticalArmed: null,
      selectedHeading: 360,
      selectedAltitude: 2200,
      targetVS: 0,
      targetFLC: 100,
      targetPitch: 0,
      targetBank: 0,
      apFlash: false
    });
    setActiveScenario('custom');
    playBeep(440, 0.1);
  }, [playBeep]);

  // Load Guided Scenarios
  const loadScenario = (name: string) => {
    setActiveScenario(name);
    playBeep(600, 0.05);

    if (name === 'takeoff') {
      aircraftRef.current = { pitch: 7, bank: 0, heading: 345, altitude: 2300, airspeed: 85, vs: 700, turnRate: 0 };
      setAfcs(prev => ({
        ...prev,
        fd: true,
        ap: true,
        lateralActive: 'HDG',
        verticalActive: 'VS',
        targetVS: 800,
        selectedAltitude: 5500,
        verticalArmed: 'ALTS',
        selectedHeading: 345
      }));
    } else if (name === 'cruise') {
      aircraftRef.current = { pitch: 0, bank: 0, heading: 360, altitude: 6500, airspeed: 120, vs: 0, turnRate: 0 };
      setAfcs(prev => ({
        ...prev,
        fd: true,
        ap: true,
        yd: true,
        lateralActive: 'NAV',
        verticalActive: 'ALT',
        selectedAltitude: 6500,
        verticalArmed: null,
        selectedHeading: 360
      }));
    } else if (name === 'intercept') {
      aircraftRef.current = { pitch: 0, bank: 15, heading: 300, altitude: 4500, airspeed: 110, vs: 0, turnRate: 2 };
      setAfcs(prev => ({
        ...prev,
        fd: true,
        ap: true,
        lateralActive: 'HDG',
        lateralArmed: 'NAV',
        verticalActive: 'ALT',
        selectedAltitude: 4500,
        selectedHeading: 30
      }));
    } else if (name === 'emergency_level') {
      aircraftRef.current = { pitch: -10, bank: 35, heading: 180, altitude: 3800, airspeed: 140, vs: -1500, turnRate: 3.5 };
      setAfcs(prev => ({
        ...prev,
        fd: true,
        ap: true,
        lateralActive: 'LVL',
        verticalActive: 'LVL',
        targetPitch: 0,
        targetBank: 0,
        verticalArmed: null
      }));
    } else {
      resetSimulator();
    }
  };

  // Button Handlers for GFC 500 Panel
  const handleFDClick = () => {
    playBeep(900, 0.04);
    setAfcs(prev => {
      if (prev.ap) {
        // If AP is ON, FD cannot be turned OFF directly without disengaging AP
        return prev;
      }
      if (!prev.fd) {
        // Turning FD ON: defaults to ROL and PIT
        const armAlts = prev.selectedAltitude !== Math.round(aircraftRef.current.altitude);
        return {
          ...prev,
          fd: true,
          lateralActive: prev.lateralActive || 'ROL',
          verticalActive: prev.verticalActive || 'PIT',
          verticalArmed: armAlts ? 'ALTS' : null,
          targetPitch: Math.round(aircraftRef.current.pitch)
        };
      } else {
        // Turning FD OFF
        return {
          ...prev,
          fd: false,
          lateralActive: null,
          lateralArmed: null,
          verticalActive: null,
          verticalArmed: null
        };
      }
    });
  };

  const handleAPClick = () => {
    setAfcs(prev => {
      if (!prev.ap) {
        playBeep(1000, 0.06);
        // Engaging AP turns on FD if not already ON
        const armAlts = prev.selectedAltitude !== Math.round(aircraftRef.current.altitude);
        return {
          ...prev,
          ap: true,
          fd: true,
          lateralActive: prev.lateralActive || 'ROL',
          verticalActive: prev.verticalActive || 'PIT',
          verticalArmed: armAlts ? 'ALTS' : null,
          targetPitch: prev.verticalActive === 'PIT' ? Math.round(aircraftRef.current.pitch) : prev.targetPitch
        };
      } else {
        // Disengaging AP
        playApDisconnect();
        return {
          ...prev,
          ap: false,
          apFlash: true
        };
      }
    });
  };

  const handleYDClick = () => {
    playBeep(850, 0.04);
    setAfcs(prev => ({ ...prev, yd: !prev.yd }));
  };

  const handleHDGModeClick = () => {
    playBeep(900, 0.04);
    setAfcs(prev => {
      const fd = true;
      const lat = prev.lateralActive === 'HDG' ? 'ROL' : 'HDG';
      return {
        ...prev,
        fd,
        lateralActive: lat,
        verticalActive: prev.verticalActive || 'PIT'
      };
    });
  };

  const handleTRKModeClick = () => {
    playBeep(900, 0.04);
    setAfcs(prev => {
      const fd = true;
      const lat = prev.lateralActive === 'TRK' ? 'ROL' : 'TRK';
      return {
        ...prev,
        fd,
        lateralActive: lat,
        verticalActive: prev.verticalActive || 'PIT'
      };
    });
  };

  const handleNAVModeClick = () => {
    playBeep(900, 0.04);
    setAfcs(prev => {
      const fd = true;
      if (prev.lateralActive === 'NAV') {
        return { ...prev, lateralActive: 'ROL', lateralArmed: null };
      }
      return {
        ...prev,
        fd,
        lateralActive: prev.lateralActive || 'ROL',
        lateralArmed: 'NAV',
        verticalActive: prev.verticalActive || 'PIT'
      };
    });
  };

  const handleAPRModeClick = () => {
    playBeep(900, 0.04);
    setAfcs(prev => {
      const fd = true;
      if (prev.lateralActive === 'APR') {
        return { ...prev, lateralActive: 'ROL', lateralArmed: null, verticalArmed: null };
      }
      return {
        ...prev,
        fd,
        lateralActive: prev.lateralActive || 'ROL',
        lateralArmed: 'APR',
        verticalArmed: 'GS',
        verticalActive: prev.verticalActive || 'PIT'
      };
    });
  };

  const handleLVLClick = () => {
    // Blue Level Button: Emergency Level Recovery
    playBeep(1200, 0.1, 'square');
    setAfcs(prev => ({
      ...prev,
      fd: true,
      ap: true,
      lateralActive: 'LVL',
      verticalActive: 'LVL',
      lateralArmed: null,
      verticalArmed: null,
      targetPitch: 0,
      targetBank: 0,
      targetVS: 0
    }));
  };

  const handleALTModeClick = () => {
    playBeep(900, 0.04);
    setAfcs(prev => {
      const fd = true;
      if (prev.verticalActive === 'ALT') {
        return { ...prev, verticalActive: 'PIT', verticalArmed: 'ALTS' };
      }
      return {
        ...prev,
        fd,
        verticalActive: 'ALT',
        verticalArmed: null,
        lateralActive: prev.lateralActive || 'ROL'
      };
    });
  };

  const handleVSModeClick = () => {
    playBeep(900, 0.04);
    setAfcs(prev => {
      const fd = true;
      if (prev.verticalActive === 'VS') {
        return { ...prev, verticalActive: 'PIT', verticalArmed: 'ALTS' };
      }
      // Set initial VS to nearest 100 fpm
      const currentVsRound = Math.round(aircraftRef.current.vs / 100) * 100;
      return {
        ...prev,
        fd,
        verticalActive: 'VS',
        targetVS: currentVsRound,
        verticalArmed: 'ALTS',
        lateralActive: prev.lateralActive || 'ROL'
      };
    });
  };

  const handleFLCModeClick = () => {
    playBeep(900, 0.04);
    setAfcs(prev => {
      const fd = true;
      if (prev.verticalActive === 'FLC') {
        return { ...prev, verticalActive: 'PIT', verticalArmed: 'ALTS' };
      }
      return {
        ...prev,
        fd,
        verticalActive: 'FLC',
        targetFLC: Math.round(aircraftRef.current.airspeed),
        verticalArmed: 'ALTS',
        lateralActive: prev.lateralActive || 'ROL'
      };
    });
  };

  const handleVNAVModeClick = () => {
    playBeep(900, 0.04);
    setAfcs(prev => {
      const fd = true;
      if (prev.verticalActive === 'VNAV') {
        return { ...prev, verticalActive: 'PIT', verticalArmed: null };
      }
      return {
        ...prev,
        fd,
        verticalActive: prev.verticalActive || 'PIT',
        verticalArmed: 'VNAV',
        lateralActive: prev.lateralActive || 'ROL'
      };
    });
  };

  // Rotary Knob Adjustments
  const adjustHeading = (delta: number) => {
    playBeep(700, 0.02);
    setAfcs(prev => {
      let newHdg = (prev.selectedHeading + delta) % 360;
      if (newHdg < 0) newHdg += 360;
      return { ...prev, selectedHeading: newHdg };
    });
  };

  const syncHeading = () => {
    playBeep(880, 0.05);
    setAfcs(prev => ({
      ...prev,
      selectedHeading: Math.round(aircraftRef.current.heading) % 360
    }));
  };

  const adjustAltitude = (delta: number) => {
    playBeep(750, 0.02);
    setAfcs(prev => {
      const newAlt = Math.max(0, Math.min(25000, prev.selectedAltitude + delta));
      const shouldArmAlts = prev.verticalActive === 'VS' || prev.verticalActive === 'PIT' || prev.verticalActive === 'FLC';
      return { 
        ...prev, 
        selectedAltitude: newAlt,
        verticalArmed: shouldArmAlts ? 'ALTS' : prev.verticalArmed
      };
    });
  };

  const syncAltitude = () => {
    playBeep(880, 0.05);
    setAfcs(prev => ({
      ...prev,
      selectedAltitude: Math.round(aircraftRef.current.altitude / 100) * 100
    }));
  };

  // Nose Trim / Pitch Wheel (DN / UP)
  const adjustPitchWheel = (direction: 'UP' | 'DN') => {
    playBeep(650, 0.02);
    const sign = direction === 'UP' ? 1 : -1;

    setAfcs(prev => {
      if (prev.verticalActive === 'VS') {
        // Adjust VS by 100 fpm
        const newVs = prev.targetVS + (sign * 100);
        return { ...prev, targetVS: Math.max(-3000, Math.min(3000, newVs)) };
      } else if (prev.verticalActive === 'FLC') {
        // Adjust FLC by 1 kt (UP wheel slows down / increases pitch, DN wheel speeds up)
        const newIas = prev.targetFLC - (sign * 1);
        return { ...prev, targetFLC: Math.max(60, Math.min(180, newIas)) };
      } else if (prev.verticalActive === 'PIT' || !prev.verticalActive) {
        // Adjust pitch reference by 0.5 degrees
        const newPitch = prev.targetPitch + (sign * 0.5);
        return { ...prev, targetPitch: Math.max(-15, Math.min(15, newPitch)) };
      } else if (prev.verticalActive === 'ALT') {
        // In ALT mode, wheel temporarily commands VS climb/descent
        return {
          ...prev,
          verticalActive: 'VS',
          targetVS: sign * 200,
          verticalArmed: 'ALTS'
        };
      }
      return prev;
    });
  };

  // Physics and Flight Dynamics Loop
  useEffect(() => {
    if (!isOpen) return;

    let flashTimer = 0;

    const updatePhysics = (timestamp: number) => {
      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = timestamp;

      const ac = aircraftRef.current;

      // 1. Calculate Autopilot / Flight Director Commanded Pitch & Bank
      let cmdBank = 0;
      let cmdPitch = 0;

      // Lateral guidance
      if (afcs.fd || afcs.ap) {
        if (afcs.lateralActive === 'LVL') {
          cmdBank = 0;
        } else if (afcs.lateralActive === 'HDG' || afcs.lateralActive === 'TRK') {
          let hdgDiff = afcs.selectedHeading - ac.heading;
          while (hdgDiff > 180) hdgDiff -= 360;
          while (hdgDiff < -180) hdgDiff += 360;
          // Standard rate turn bank command: limit to 22 degrees
          cmdBank = Math.max(-22, Math.min(22, hdgDiff * 1.5));
        } else if (afcs.lateralActive === 'NAV' || afcs.lateralActive === 'APR') {
          // Track 041 course (demo course)
          let crsDiff = 41 - ac.heading;
          while (crsDiff > 180) crsDiff -= 360;
          while (crsDiff < -180) crsDiff += 360;
          cmdBank = Math.max(-20, Math.min(20, crsDiff * 1.2));
        } else if (afcs.lateralActive === 'ROL') {
          // ROL mode holds current bank if > 6 deg, or levels wings if < 6 deg
          cmdBank = Math.abs(ac.bank) < 6 ? 0 : ac.bank;
        }

        // Vertical guidance
        if (afcs.verticalActive === 'LVL') {
          cmdPitch = 0;
        } else if (afcs.verticalActive === 'ALT') {
          // Hold altitude
          const altDiff = afcs.selectedAltitude - ac.altitude;
          cmdPitch = Math.max(-6, Math.min(8, altDiff * 0.04));
        } else if (afcs.verticalActive === 'VS') {
          // VS mode pitch command
          const vsError = afcs.targetVS - ac.vs;
          cmdPitch = ac.pitch + (vsError * 0.002);
          cmdPitch = Math.max(-12, Math.min(12, cmdPitch));
        } else if (afcs.verticalActive === 'FLC') {
          // Pitch to maintain FLC: too slow -> pitch down; too fast -> pitch up
          const spdError = ac.airspeed - afcs.targetFLC;
          cmdPitch = Math.max(-12, Math.min(12, spdError * 0.6));
        } else if (afcs.verticalActive === 'PIT') {
          cmdPitch = afcs.targetPitch;
        }

        // Check for ALTS Capture across all modes that climb/descend
        if (afcs.verticalArmed === 'ALTS' && afcs.verticalActive !== 'ALT' && afcs.verticalActive !== 'GS' && afcs.verticalActive !== 'GP') {
          const altDistance = afcs.selectedAltitude - ac.altitude;
          const isClimbingToTarget = ac.vs > 0 && altDistance > 0;
          const isDescendingToTarget = ac.vs < 0 && altDistance < 0;
          
          if (isClimbingToTarget || isDescendingToTarget) {
            const captureWindow = Math.max(100, Math.abs(ac.vs) * 0.15); // ~10 seconds out, min 100ft
            if (Math.abs(altDistance) <= captureWindow) {
              setAfcs(prev => ({
                ...prev,
                verticalActive: 'ALT',
                verticalArmed: null
              }));
              // Instant pitch adjustment for smooth capture
              cmdPitch = Math.max(-6, Math.min(8, altDistance * 0.04));
            }
          }
        }
      }

      // 2. Apply AP Servo or Aircraft Response
      if (afcs.ap) {
        // Smoothly fly towards commanded attitude
        ac.bank += (cmdBank - ac.bank) * Math.min(dt * 3.5, 1.0);
        ac.pitch += (cmdPitch - ac.pitch) * Math.min(dt * 3.0, 1.0);
      } else {
        // Natural aircraft stability if AP is off (damps back towards level unless perturbed)
        ac.bank += (0 - ac.bank) * Math.min(dt * 0.2, 1.0);
        ac.pitch += (0 - ac.pitch) * Math.min(dt * 0.2, 1.0);
      }

      // 3. Integrate Flight Dynamics
      // Turn rate based on bank angle: rate = g * tan(bank) / V ≈ 1091 * tan(bank) / KTAS
      const bankRad = (ac.bank * Math.PI) / 180;
      ac.turnRate = (1091 * Math.tan(bankRad)) / Math.max(ac.airspeed, 50); // deg/sec
      ac.heading = (ac.heading + ac.turnRate * dt + 360) % 360;

      // Vertical speed based on pitch and airspeed: VS ≈ KTAS * 101.27 * sin(pitch)
      const pitchRad = (ac.pitch * Math.PI) / 180;
      const targetInstantVS = Math.max(ac.airspeed, 40) * 101.27 * Math.sin(pitchRad);
      ac.vs += (targetInstantVS - ac.vs) * Math.min(dt * 4, 1.0);

      // Altitude integration
      ac.altitude += (ac.vs / 60) * dt;

      // Airspeed changes with pitch (trade altitude for speed)
      const targetSpeed = 100 - (ac.pitch * 3.5);
      ac.airspeed += (targetSpeed - ac.airspeed) * Math.min(dt * 0.8, 1.0);

      // Flash timer for AP disconnect
      if (afcs.apFlash) {
        flashTimer += dt;
        if (flashTimer > 3.0) {
          setAfcs(prev => ({ ...prev, apFlash: false }));
          flashTimer = 0;
        }
      }

      // Sync display state
      setDisplayMetrics({
        pitch: ac.pitch,
        bank: ac.bank,
        heading: ac.heading,
        altitude: Math.round(ac.altitude),
        airspeed: Math.round(ac.airspeed),
        vs: Math.round(ac.vs)
      });

      // 4. Render PFD Canvas
      drawPFD(cmdPitch, cmdBank);

      animationFrameRef.current = requestAnimationFrame(updatePhysics);
    };

    animationFrameRef.current = requestAnimationFrame(updatePhysics);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isOpen, afcs]);

  // Primary Flight Display (PFD) Canvas Renderer
  const drawPFD = (cmdPitch: number, cmdBank: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const ac = aircraftRef.current;

    ctx.clearRect(0, 0, w, h);

    // ==========================================
    // 1. ATTITUDE INDICATOR (Horizon & Sky/Ground)
    // ==========================================
    const horizonCenterY = h * 0.44;
    const horizonCenterX = w * 0.50;
    const pixelsPerDegreePitch = 7.5;

    ctx.save();
    // Clip horizon to main center area
    ctx.beginPath();
    ctx.rect(0, 32, w, h - 32);
    ctx.clip();

    ctx.translate(horizonCenterX, horizonCenterY);
    ctx.rotate((-ac.bank * Math.PI) / 180);
    const pitchOffsetY = ac.pitch * pixelsPerDegreePitch;
    ctx.translate(0, pitchOffsetY);

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, -600, 0, 0);
    skyGrad.addColorStop(0, '#0052cc');
    skyGrad.addColorStop(1, '#0077ff');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(-w * 1.5, -900, w * 3, 900);

    // Ground gradient
    const groundGrad = ctx.createLinearGradient(0, 0, 0, 600);
    groundGrad.addColorStop(0, '#66401f');
    groundGrad.addColorStop(1, '#422812');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(-w * 1.5, 0, w * 3, 900);

    // Horizon line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-w * 1.5, 0);
    ctx.lineTo(w * 1.5, 0);
    ctx.stroke();

    // Pitch ladder (10°, 20°, 30°, -10°, -20°, -30°)
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let deg = -30; deg <= 30; deg += 5) {
      if (deg === 0) continue;
      const y = -deg * pixelsPerDegreePitch;
      const isMajor = deg % 10 === 0;
      const ladderWidth = isMajor ? 50 : 25;

      ctx.beginPath();
      ctx.lineWidth = isMajor ? 2.2 : 1.5;

      if (deg > 0) {
        // Positive pitch: solid line
        ctx.moveTo(-ladderWidth, y);
        ctx.lineTo(ladderWidth, y);
      } else {
        // Negative pitch: dashed lines
        ctx.setLineDash([4, 4]);
        ctx.moveTo(-ladderWidth, y);
        ctx.lineTo(ladderWidth, y);
        ctx.setLineDash([]);
      }
      ctx.stroke();

      // Pitch angle numbers on major lines
      if (isMajor) {
        ctx.fillText(Math.abs(deg).toString(), -ladderWidth - 14, y);
        ctx.fillText(Math.abs(deg).toString(), ladderWidth + 14, y);
      }
    }

    ctx.restore();

    // Roll Arc Scale (Bank indicator at top of horizon)
    ctx.save();
    ctx.translate(horizonCenterX, horizonCenterY);
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = 2;
    const arcRadius = 140;

    // Draw roll arc
    ctx.beginPath();
    ctx.arc(0, 0, arcRadius, (-140 * Math.PI) / 180, (-40 * Math.PI) / 180);
    ctx.stroke();

    // Arc tick marks (0, 10, 20, 30, 45, 60)
    const bankTicks = [-60, -45, -30, -20, -10, 0, 10, 20, 30, 45, 60];
    bankTicks.forEach(tick => {
      const rad = ((tick - 90) * Math.PI) / 180;
      const len = (tick === 0 || Math.abs(tick) === 30 || Math.abs(tick) === 60) ? 14 : 7;
      ctx.beginPath();
      ctx.moveTo(Math.cos(rad) * arcRadius, Math.sin(rad) * arcRadius);
      ctx.lineTo(Math.cos(rad) * (arcRadius + len), Math.sin(rad) * (arcRadius + len));
      ctx.stroke();
    });

    // Roll Pointer Triangle (rotates with aircraft bank)
    ctx.save();
    ctx.rotate((-ac.bank * Math.PI) / 180);
    ctx.beginPath();
    ctx.fillStyle = '#ffffff';
    ctx.moveTo(0, -arcRadius + 2);
    ctx.lineTo(-7, -arcRadius + 14);
    ctx.lineTo(7, -arcRadius + 14);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.restore();

    // ==========================================
    // 2. FLIGHT DIRECTOR COMMAND BARS (Magenta)
    // ==========================================
    if (afcs.fd || afcs.ap) {
      ctx.save();
      ctx.translate(horizonCenterX, horizonCenterY);
      // FD cross-pointers or V-bars
      const fdPitchDiff = (cmdPitch - ac.pitch) * pixelsPerDegreePitch;
      const fdBankDiff = (cmdBank - ac.bank);
      const fdY = -fdPitchDiff;

      ctx.save();
      ctx.translate(0, fdY);
      ctx.rotate((-fdBankDiff * Math.PI) / 180);

      // Magenta command bar wings
      ctx.strokeStyle = '#ff00ff';
      ctx.fillStyle = '#ff00ff';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#ff00ff';
      ctx.shadowBlur = 6;

      // Left bar
      ctx.beginPath();
      ctx.moveTo(-90, 0);
      ctx.lineTo(-25, 0);
      ctx.stroke();

      // Right bar
      ctx.beginPath();
      ctx.moveTo(25, 0);
      ctx.lineTo(90, 0);
      ctx.stroke();

      // Center Chevron / V-bar tip
      ctx.beginPath();
      ctx.moveTo(-25, 0);
      ctx.lineTo(0, -10);
      ctx.lineTo(25, 0);
      ctx.stroke();

      ctx.restore();
      ctx.restore();
    }

    // ==========================================
    // 3. AIRCRAFT REFERENCE SYMBOL (Yellow Wings)
    // ==========================================
    ctx.save();
    ctx.translate(horizonCenterX, horizonCenterY);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.fillStyle = '#ffdd00';

    // Left wing
    ctx.beginPath();
    ctx.rect(-95, -4, 55, 8);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.rect(-45, -4, 8, 20);
    ctx.fill();
    ctx.stroke();

    // Right wing
    ctx.beginPath();
    ctx.rect(40, -4, 55, 8);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.rect(37, -4, 8, 20);
    ctx.fill();
    ctx.stroke();

    // Center pip dot
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // ==========================================
    // 4. AIRSPEED TAPE (Left Side)
    // ==========================================
    const speedTapeX = 75;
    const speedTapeW = 48;
    const tapeTop = 50;
    const tapeHeight = 240;

    ctx.save();
    ctx.fillStyle = 'rgba(20, 25, 35, 0.88)';
    ctx.strokeStyle = '#555566';
    ctx.lineWidth = 1.5;
    ctx.fillRect(speedTapeX - speedTapeW, tapeTop, speedTapeW, tapeHeight);
    ctx.strokeRect(speedTapeX - speedTapeW, tapeTop, speedTapeW, tapeHeight);

    // Color bands (red/white/green)
    // Red stall band (0-45)
    ctx.fillStyle = '#cc0000';
    ctx.fillRect(speedTapeX - 4, tapeTop + 140, 4, 100);
    // Green normal operating band (45-120)
    ctx.fillStyle = '#00cc44';
    ctx.fillRect(speedTapeX - 4, tapeTop + 20, 4, 120);

    // Speed markings
    const pixelsPerKnot = 2.4;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const currentSpd = ac.airspeed;
    for (let s = Math.floor((currentSpd - 40) / 10) * 10; s <= currentSpd + 40; s += 10) {
      if (s < 0) continue;
      const y = tapeTop + (tapeHeight / 2) - ((s - currentSpd) * pixelsPerKnot);
      if (y >= tapeTop && y <= tapeTop + tapeHeight) {
        ctx.beginPath();
        ctx.moveTo(speedTapeX - 10, y);
        ctx.lineTo(speedTapeX, y);
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
        ctx.fillText(s.toString(), speedTapeX - 14, y);
      }
    }

    // Speed Rolling Drum Box
    const drumY = tapeTop + (tapeHeight / 2);
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(speedTapeX - speedTapeW + 2, drumY - 14);
    ctx.lineTo(speedTapeX - 10, drumY - 14);
    ctx.lineTo(speedTapeX, drumY);
    ctx.lineTo(speedTapeX - 10, drumY + 14);
    ctx.lineTo(speedTapeX - speedTapeW + 2, drumY + 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(Math.round(currentSpd).toString(), speedTapeX - 25, drumY);

    // TAS readout below
    ctx.fillStyle = '#000000';
    ctx.fillRect(speedTapeX - speedTapeW, tapeTop + tapeHeight + 4, speedTapeW + 15, 18);
    ctx.fillStyle = '#ffffff';
    ctx.font = '9px sans-serif';
    ctx.fillText(`TAS ${Math.round(currentSpd)}KT`, speedTapeX - 16, tapeTop + tapeHeight + 16);

    ctx.restore();

    // ==========================================
    // 5. ALTITUDE TAPE (Right Side)
    // ==========================================
    const altTapeX = w - 85;
    const altTapeW = 55;

    ctx.save();
    ctx.fillStyle = 'rgba(20, 25, 35, 0.88)';
    ctx.strokeStyle = '#555566';
    ctx.lineWidth = 1.5;
    ctx.fillRect(altTapeX, tapeTop, altTapeW, tapeHeight);
    ctx.strokeRect(altTapeX, tapeTop, altTapeW, tapeHeight);

    // Selected Altitude Target Readout Box atop tape
    ctx.fillStyle = '#000000';
    ctx.fillRect(altTapeX - 4, tapeTop - 22, altTapeW + 8, 20);
    ctx.strokeStyle = '#00ffff';
    ctx.strokeRect(altTapeX - 4, tapeTop - 22, altTapeW + 8, 20);
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(afcs.selectedAltitude.toString(), altTapeX + (altTapeW / 2), tapeTop - 8);

    // Altitude markings
    const pixelsPerFoot = 0.55;
    const currentAlt = ac.altitude;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    for (let a = Math.floor((currentAlt - 300) / 100) * 100; a <= currentAlt + 300; a += 100) {
      if (a < 0) continue;
      const y = tapeTop + (tapeHeight / 2) - ((a - currentAlt) * pixelsPerFoot);
      if (y >= tapeTop && y <= tapeTop + tapeHeight) {
        ctx.beginPath();
        ctx.moveTo(altTapeX, y);
        ctx.lineTo(altTapeX + 10, y);
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
        ctx.fillText(a.toString(), altTapeX + 14, y);
      }
    }

    // Selected Altitude Bug (Cyan notched bracket)
    const bugY = tapeTop + (tapeHeight / 2) - ((afcs.selectedAltitude - currentAlt) * pixelsPerFoot);
    if (bugY >= tapeTop && bugY <= tapeTop + tapeHeight) {
      ctx.fillStyle = '#00ffff';
      ctx.beginPath();
      ctx.moveTo(altTapeX, bugY);
      ctx.lineTo(altTapeX - 8, bugY - 8);
      ctx.lineTo(altTapeX - 16, bugY - 8);
      ctx.lineTo(altTapeX - 16, bugY + 8);
      ctx.lineTo(altTapeX - 8, bugY + 8);
      ctx.closePath();
      ctx.fill();
    }

    // Altitude Rolling Drum Readout
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(altTapeX + altTapeW - 2, drumY - 14);
    ctx.lineTo(altTapeX + 12, drumY - 14);
    ctx.lineTo(altTapeX, drumY);
    ctx.lineTo(altTapeX + 12, drumY + 14);
    ctx.lineTo(altTapeX + altTapeW - 2, drumY + 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#00ff00';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(Math.round(currentAlt).toString(), altTapeX + 32, drumY);

    // Baro readout below tape
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('29.92 IN', altTapeX + (altTapeW / 2), tapeTop + tapeHeight + 14);

    // ==========================================
    // 6. VERTICAL SPEED INDICATOR (VSI Tape)
    // ==========================================
    const vsiX = w - 24;
    const vsiW = 16;
    ctx.fillStyle = 'rgba(20, 25, 35, 0.7)';
    ctx.fillRect(vsiX, tapeTop + 20, vsiW, tapeHeight - 40);

    // VSI Scale Ticks (-2, -1, 0, 1, 2)
    ctx.strokeStyle = '#888899';
    const vsiCenterY = tapeTop + (tapeHeight / 2);
    ctx.beginPath();
    ctx.moveTo(vsiX, vsiCenterY);
    ctx.lineTo(vsiX + vsiW, vsiCenterY);
    ctx.moveTo(vsiX, vsiCenterY - 40);
    ctx.lineTo(vsiX + 8, vsiCenterY - 40);
    ctx.moveTo(vsiX, vsiCenterY + 40);
    ctx.lineTo(vsiX + 8, vsiCenterY + 40);
    ctx.stroke();

    // VSI Needle Pointer
    const currentVsClamped = Math.max(-2000, Math.min(2000, ac.vs));
    const needleY = vsiCenterY - (currentVsClamped * 0.04);
    ctx.fillStyle = '#ff00ff';
    ctx.beginPath();
    ctx.moveTo(vsiX + vsiW, needleY);
    ctx.lineTo(vsiX + 2, needleY - 4);
    ctx.lineTo(vsiX + 2, needleY + 4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // ==========================================
    // 7. HSI (COMPASS ROSE) AT BOTTOM
    // ==========================================
    const hsiCenterX = w * 0.50;
    const hsiCenterY = h * 0.75;
    const hsiRadius = 78;

    ctx.save();
    ctx.translate(hsiCenterX, hsiCenterY);

    // Current Heading Readout Box above HSI
    ctx.fillStyle = '#000000';
    ctx.fillRect(-24, -hsiRadius - 26, 48, 20);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-24, -hsiRadius - 26, 48, 20);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(ac.heading).toString().padStart(3, '0')}°`, 0, -hsiRadius - 12);

    // Selected Heading cyan box
    ctx.fillStyle = '#000000';
    ctx.fillRect(-hsiRadius - 42, -hsiRadius - 20, 52, 16);
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(`HDG ${afcs.selectedHeading.toString().padStart(3, '0')}°`, -hsiRadius - 16, -hsiRadius - 8);

    // Course magenta box
    ctx.fillStyle = '#000000';
    ctx.fillRect(hsiRadius - 10, -hsiRadius - 20, 52, 16);
    ctx.fillStyle = '#ff00ff';
    ctx.fillText(`CRS 041°`, hsiRadius + 16, -hsiRadius - 8);

    // Rotating Compass Card
    ctx.save();
    ctx.rotate((-ac.heading * Math.PI) / 180);

    // Compass circle
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, hsiRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Tick marks & Numbers
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let deg = 0; deg < 360; deg += 10) {
      const rad = ((deg - 90) * Math.PI) / 180;
      const isMajor = deg % 30 === 0;
      const innerR = isMajor ? hsiRadius - 10 : hsiRadius - 5;

      ctx.beginPath();
      ctx.moveTo(Math.cos(rad) * hsiRadius, Math.sin(rad) * hsiRadius);
      ctx.lineTo(Math.cos(rad) * innerR, Math.sin(rad) * innerR);
      ctx.stroke();

      if (isMajor) {
        let label = (deg / 10).toString();
        if (deg === 0) label = 'N';
        else if (deg === 90) label = 'E';
        else if (deg === 180) label = 'S';
        else if (deg === 270) label = 'W';

        const textR = hsiRadius - 18;
        ctx.fillText(label, Math.cos(rad) * textR, Math.sin(rad) * textR);
      }
    }

    // Cyan Selected Heading Bug on Compass Rose
    const bugRad = ((afcs.selectedHeading - 90) * Math.PI) / 180;
    ctx.save();
    ctx.translate(Math.cos(bugRad) * hsiRadius, Math.sin(bugRad) * hsiRadius);
    ctx.rotate(bugRad + (Math.PI / 2));
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-7, 8);
    ctx.lineTo(-7, 14);
    ctx.lineTo(7, 14);
    ctx.lineTo(7, 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Magenta Course Pointer (041°)
    const crsRad = ((41 - 90) * Math.PI) / 180;
    ctx.strokeStyle = '#ff00ff';
    ctx.fillStyle = '#ff00ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(crsRad) * (hsiRadius - 22), Math.sin(crsRad) * (hsiRadius - 22));
    ctx.lineTo(Math.cos(crsRad) * (hsiRadius + 4), Math.sin(crsRad) * (hsiRadius + 4));
    ctx.stroke();

    ctx.restore(); // end rotating compass card

    // Fixed Miniature Aircraft at Center of HSI
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    // Fuselage
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    // Wings
    ctx.moveTo(-16, 2);
    ctx.lineTo(16, 2);
    // Tail
    ctx.moveTo(-7, 12);
    ctx.lineTo(7, 12);
    ctx.moveTo(0, -10);
    ctx.lineTo(0, 14);
    ctx.stroke();
    ctx.fill();

    // Lubber Line (White triangle at 12 o'clock)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -hsiRadius + 1);
    ctx.lineTo(-6, -hsiRadius - 7);
    ctx.lineTo(6, -hsiRadius - 7);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // ==========================================
    // 8. TOP AFCS ANNUNCIATION BAR (The 3-Box AFCS)
    // ==========================================
    const barH = 30;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, barH);
    ctx.strokeStyle = '#333344';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, w, barH);

    // Dividers for 3 boxes: Lateral (Left) | AP/Status (Center) | Vertical (Right)
    const boxW = w / 3;
    ctx.beginPath();
    ctx.moveTo(boxW, 0);
    ctx.lineTo(boxW, barH);
    ctx.moveTo(boxW * 2, 0);
    ctx.lineTo(boxW * 2, barH);
    ctx.stroke();

    // Box 1: Lateral Channel (Left)
    if (afcs.fd || afcs.ap) {
      // Active mode in GREEN
      ctx.fillStyle = '#00ff00';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const latActiveText = afcs.lateralActive || 'ROL';
      ctx.fillText(latActiveText, boxW * 0.38, barH / 2);

      // Armed mode in WHITE
      if (afcs.lateralArmed) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(afcs.lateralArmed, boxW * 0.78, barH / 2);
      }
    }

    // Box 2: AP / YD Status (Center)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (afcs.ap) {
      ctx.fillStyle = '#00ff00';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('AP', (boxW * 1.5) - (afcs.yd ? 16 : 0), barH / 2);
    } else if (afcs.apFlash) {
      ctx.fillStyle = '#ffff00';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('AP', (boxW * 1.5) - (afcs.yd ? 16 : 0), barH / 2);
    }

    if (afcs.yd) {
      ctx.fillStyle = '#00ff00';
      ctx.font = 'bold 13px monospace';
      ctx.fillText('YD', (boxW * 1.5) + (afcs.ap ? 18 : 0), barH / 2);
    }

    // Box 3: Vertical Channel (Right)
    if (afcs.fd || afcs.ap) {
      ctx.fillStyle = '#00ff00';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      let vertText = afcs.verticalActive || 'PIT';
      if (afcs.verticalActive === 'VS') {
        const sign = afcs.targetVS >= 0 ? '+' : '';
        vertText = `VS ${sign}${afcs.targetVS}`;
      } else if (afcs.verticalActive === 'FLC') {
        vertText = `FLC ${afcs.targetFLC}KT`;
      } else if (afcs.verticalActive === 'ALT') {
        vertText = `ALT ${afcs.selectedAltitude}FT`;
      }

      ctx.fillText(vertText, (boxW * 2) + (boxW * 0.42), barH / 2);

      // Armed vertical mode in WHITE (e.g. ALTS, GS, GP)
      if (afcs.verticalArmed) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(afcs.verticalArmed, (boxW * 2) + (boxW * 0.82), barH / 2);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[2000] flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in">
      <div className={`bg-slate-950 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
        isFullScreen ? 'w-full h-full max-w-none rounded-none' : 'w-full max-w-4xl max-h-[96vh]'
      }`}>
        
        {/* Top Title Bar */}
        <div className="px-4 py-2.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-800 flex items-center justify-between select-none">
          <div className="flex items-center gap-3">
            <div className="bg-sky-500/20 text-sky-400 p-1.5 rounded-lg border border-sky-500/30">
              <Compass size={18} className="animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-widest text-sky-400 uppercase">CFI Digital Trainer</span>
                <span className="bg-blue-600/30 text-blue-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-500/40">GFC 500 AFCS</span>
              </div>
              <h1 className="text-sm font-black text-white leading-tight">Garmin GFC 500 Autopilot & PFD Simulator</h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? "Mute Audio" : "Enable Audio"}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              {soundEnabled ? <Volume2 size={16} className="text-emerald-400" /> : <VolumeX size={16} />}
            </button>

            <button
              onClick={() => setShowHelp(!showHelp)}
              title="Instructor Guide & AFCS Logic"
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <HelpCircle size={16} className={showHelp ? 'text-amber-400' : ''} />
            </button>

            <button
              onClick={resetSimulator}
              title="Reset Simulator to Default"
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <RotateCcw size={16} />
            </button>

            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              title={isFullScreen ? "Exit Fullscreen" : "Fullscreen"}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            <button
              onClick={onClose}
              title="Close Trainer"
              className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Guided Scenarios Quick Bar */}
        <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto select-none scrollbar-none text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Zap size={13} className="text-amber-400" /> Presets:
          </span>
          <button
            onClick={() => loadScenario('takeoff')}
            className={`px-2.5 py-1 rounded-md font-bold whitespace-nowrap transition-all ${
              activeScenario === 'takeoff' ? 'bg-sky-600 text-white shadow' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Climb Out (VS 800)
          </button>
          <button
            onClick={() => loadScenario('cruise')}
            className={`px-2.5 py-1 rounded-md font-bold whitespace-nowrap transition-all ${
              activeScenario === 'cruise' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Cruise (NAV + ALT)
          </button>
          <button
            onClick={() => loadScenario('intercept')}
            className={`px-2.5 py-1 rounded-md font-bold whitespace-nowrap transition-all ${
              activeScenario === 'intercept' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Heading Intercept (HDG+NAV)
          </button>
          <button
            onClick={() => loadScenario('emergency_level')}
            className={`px-2.5 py-1 rounded-md font-bold whitespace-nowrap transition-all ${
              activeScenario === 'emergency_level' ? 'bg-rose-600 text-white shadow' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Upset Recovery (LVL)
          </button>
          <button
            onClick={resetSimulator}
            className={`px-2.5 py-1 rounded-md font-bold whitespace-nowrap transition-all ${
              activeScenario === 'custom' ? 'bg-slate-700 text-white' : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Pre-flight Reset
          </button>
        </div>

        {/* Main Content Area: PFD Display + Autopilot Panel */}
        <div className="p-3 sm:p-4 flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar">

          {/* TOP PANEL: PFD DISPLAY (HTML5 Canvas) */}
          <div className="relative w-full bg-black rounded-xl border-2 border-slate-800 shadow-inner overflow-hidden flex flex-col items-center justify-center">
            
            {/* Top G1000 Nav/Com Header Graphic */}
            <div className="w-full bg-[#111827] px-3 py-1 border-b border-slate-800 flex justify-between items-center text-[10px] font-mono text-emerald-400 select-none">
              <div>
                <span className="text-slate-400 mr-1">NAV1</span>
                <span className="text-cyan-400 font-bold">117.20</span>
                <span className="text-slate-500 mx-1">↔</span>
                <span className="text-slate-400">113.70</span>
              </div>
              <div className="text-slate-300 font-sans font-bold text-[11px]">
                GARMIN G1000 PFD
              </div>
              <div>
                <span className="text-slate-400 mr-1">COM1</span>
                <span className="text-cyan-400 font-bold">128.300</span>
                <span className="text-slate-500 mx-1">↔</span>
                <span className="text-slate-400">128.250</span>
              </div>
            </div>

            {/* PFD Canvas */}
            <canvas
              ref={canvasRef}
              width={760}
              height={440}
              className="w-full max-h-[380px] object-contain bg-[#0f172a]"
            />

            {/* Bottom G1000 Softkey Bar */}
            <div className="w-full bg-[#0a0f1d] px-2 py-1 border-t border-slate-800/80 flex justify-between items-center text-[9px] font-bold text-slate-400 select-none overflow-x-auto">
              <span className="px-1.5 py-0.5 border border-slate-700/50 rounded bg-slate-900">INSET</span>
              <span className="px-1.5 py-0.5 border border-slate-700/50 rounded bg-slate-900">PFD</span>
              <span className="px-1.5 py-0.5 border border-slate-700/50 rounded bg-slate-900">OBS</span>
              <span className="px-1.5 py-0.5 border border-slate-700/50 rounded bg-slate-900 text-cyan-400">CDI (GPS)</span>
              <span className="px-1.5 py-0.5 border border-slate-700/50 rounded bg-slate-900">XPDR 1200 ALT</span>
              <span className="px-1.5 py-0.5 border border-slate-700/50 rounded bg-slate-900">IDENT</span>
              <span className="px-1.5 py-0.5 border border-slate-700/50 rounded bg-slate-900">TMR/REF</span>
            </div>
          </div>

          {/* BOTTOM PANEL: GFC 500 AUTOPILOT CONTROLLER (Photorealistic Replication) */}
          <div className="w-full bg-gradient-to-b from-[#222428] via-[#1a1c20] to-[#121315] p-4 sm:p-5 rounded-2xl border-4 border-[#3a3d44] shadow-2xl relative select-none">
            
            {/* Corner Hex Screws for realism */}
            <div className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full bg-slate-600 border border-slate-800 shadow-inner flex items-center justify-center">
              <div className="w-1.5 h-0.5 bg-slate-900" />
            </div>
            <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-slate-600 border border-slate-800 shadow-inner flex items-center justify-center">
              <div className="w-1.5 h-0.5 bg-slate-900" />
            </div>
            <div className="absolute bottom-2 left-2 w-2.5 h-2.5 rounded-full bg-slate-600 border border-slate-800 shadow-inner flex items-center justify-center">
              <div className="w-1.5 h-0.5 bg-slate-900" />
            </div>
            <div className="absolute bottom-2 right-2 w-2.5 h-2.5 rounded-full bg-slate-600 border border-slate-800 shadow-inner flex items-center justify-center">
              <div className="w-1.5 h-0.5 bg-slate-900" />
            </div>

            <div className="flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-4 px-2 w-full max-w-4xl mx-auto">
              {/* 1. LEFT ROTARY KNOB: HDG/TRK */}
              <div className="flex flex-col items-center justify-center shrink-0">
                <span className="text-[10px] sm:text-[11px] font-black text-slate-300 tracking-wider mb-1">HDG/TRK</span>
                <div className="relative group flex items-center justify-center">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-b from-[#33373d] via-[#1e2125] to-[#141517] border-2 border-[#454a52] shadow-xl flex items-center justify-center cursor-pointer active:scale-95 transition-transform">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-dashed border-slate-500/50 bg-[#16181b] flex flex-col items-center justify-center">
                      <button
                        onClick={syncHeading}
                        className="text-[8px] sm:text-[9px] font-extrabold text-cyan-400 hover:text-cyan-200 transition-colors uppercase tracking-tight text-center leading-tight"
                        title="Click to Sync Heading"
                      >
                        SYNC
                      </button>
                    </div>
                  </div>
                  <button onClick={() => adjustHeading(-5)} className="absolute -left-2 top-3 w-5 h-5 rounded-full bg-slate-800 border border-slate-600 text-white text-[10px] font-bold flex items-center justify-center hover:bg-slate-700 active:scale-90">◀</button>
                  <button onClick={() => adjustHeading(5)} className="absolute -right-2 top-3 w-5 h-5 rounded-full bg-slate-800 border border-slate-600 text-white text-[10px] font-bold flex items-center justify-center hover:bg-slate-700 active:scale-90">▶</button>
                </div>
                <span className="text-[9px] font-bold text-slate-400 mt-1">PUSH SYNC</span>
              </div>

              {/* 2. CENTER SECTION: Buttons & Wheel */}
              <div className="flex flex-row items-center gap-4 sm:gap-6 lg:gap-8 bg-[#1e2126] p-3 sm:p-4 rounded-xl border border-slate-700/50 shadow-inner">
                
                {/* Lateral & AP Buttons Grid */}
                <div className="grid grid-cols-4 gap-2 sm:gap-3">
                  <button onClick={handleHDGModeClick} className={`h-10 sm:h-12 w-12 sm:w-16 rounded-lg font-black text-xs sm:text-sm tracking-wider flex items-center justify-center border-2 transition-all active:scale-95 shadow-md ${afcs.lateralActive === 'HDG' ? 'bg-[#1b3320] text-emerald-300 border-emerald-500 shadow-emerald-950' : 'bg-[#2a2d33] hover:bg-[#343840] text-slate-200 border-[#4a4f59]'}`}>
                    <div className="flex flex-col items-center">
                      {afcs.lateralActive === 'HDG' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse -mt-0.5 mb-0.5" />}
                      <span>HDG</span>
                    </div>
                  </button>
                  <button onClick={handleNAVModeClick} className={`h-10 sm:h-12 w-12 sm:w-16 rounded-lg font-black text-xs sm:text-sm tracking-wider flex items-center justify-center border-2 transition-all active:scale-95 shadow-md ${afcs.lateralActive === 'NAV' || afcs.lateralArmed === 'NAV' ? 'bg-[#1b3320] text-emerald-300 border-emerald-500 shadow-emerald-950' : 'bg-[#2a2d33] hover:bg-[#343840] text-slate-200 border-[#4a4f59]'}`}>
                    <div className="flex flex-col items-center">
                      {(afcs.lateralActive === 'NAV' || afcs.lateralArmed === 'NAV') && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse -mt-0.5 mb-0.5" />}
                      <span>NAV</span>
                    </div>
                  </button>
                  <button onClick={handleAPRModeClick} className={`h-10 sm:h-12 w-12 sm:w-16 rounded-lg font-black text-xs sm:text-sm tracking-wider flex items-center justify-center border-2 transition-all active:scale-95 shadow-md ${afcs.lateralActive === 'APR' || afcs.lateralArmed === 'APR' ? 'bg-[#1b3320] text-emerald-300 border-emerald-500 shadow-emerald-950' : 'bg-[#2a2d33] hover:bg-[#343840] text-slate-200 border-[#4a4f59]'}`}>
                    <div className="flex flex-col items-center">
                      {(afcs.lateralActive === 'APR' || afcs.lateralArmed === 'APR') && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse -mt-0.5 mb-0.5" />}
                      <span>APR</span>
                    </div>
                  </button>
                  <button onClick={handleTRKModeClick} className={`h-10 sm:h-12 w-12 sm:w-16 rounded-lg font-black text-xs sm:text-sm tracking-wider flex items-center justify-center border-2 transition-all active:scale-95 shadow-md ${afcs.lateralActive === 'TRK' ? 'bg-[#1b3320] text-emerald-300 border-emerald-500 shadow-emerald-950' : 'bg-[#2a2d33] hover:bg-[#343840] text-slate-200 border-[#4a4f59]'}`}>
                    <span>TRK</span>
                  </button>

                  <button onClick={handleAPClick} className={`h-10 sm:h-12 w-12 sm:w-16 rounded-lg font-black text-xs sm:text-sm tracking-wider flex items-center justify-center border-2 transition-all active:scale-95 shadow-lg ${afcs.ap ? 'bg-[#143d22] text-emerald-300 border-emerald-400 shadow-emerald-950' : 'bg-[#2c3038] hover:bg-[#363a44] text-white border-white'}`}>
                    <div className="flex flex-col items-center">
                      <div className={`w-2 h-2 rounded-full mb-0.5 shadow ${afcs.ap ? 'bg-emerald-400 animate-pulse shadow-emerald-500/50' : 'bg-slate-700 border border-slate-900'}`} />
                      <span>AP</span>
                    </div>
                  </button>
                  <button onClick={handleLVLClick} className={`h-10 sm:h-12 w-12 sm:w-16 rounded-lg font-black text-xs sm:text-sm tracking-wider flex items-center justify-center border-2 transition-all active:scale-95 shadow-lg ${afcs.lateralActive === 'LVL' ? 'bg-cyan-500 text-black border-white shadow-cyan-500/50' : 'bg-[#0099cc] hover:bg-[#00aadd] text-white border-cyan-300'}`}>
                    <span>LVL</span>
                  </button>
                  <button onClick={handleYDClick} className={`h-10 sm:h-12 w-12 sm:w-16 rounded-lg font-black text-xs sm:text-sm tracking-wider flex items-center justify-center border-2 transition-all active:scale-95 shadow-md ${afcs.yd ? 'bg-[#1b3320] text-emerald-300 border-emerald-500 shadow-emerald-950' : 'bg-[#2a2d33] hover:bg-[#343840] text-slate-200 border-[#4a4f59]'}`}>
                    <span>YD</span>
                  </button>
                  <button onClick={handleFDClick} className={`h-10 sm:h-12 w-12 sm:w-16 rounded-lg font-black text-xs sm:text-sm tracking-wider flex items-center justify-center border-2 transition-all active:scale-95 shadow-md ${afcs.fd ? 'bg-[#1b3320] text-emerald-300 border-emerald-500 shadow-emerald-950' : 'bg-[#2a2d33] hover:bg-[#343840] text-slate-200 border-[#4a4f59]'}`}>
                    <span>FD</span>
                  </button>
                </div>

                {/* Pitch Wheel */}
                <div className="flex flex-col items-center justify-center shrink-0 border-l border-r border-slate-700/60 px-4">
                  <span className="text-[10px] font-black text-slate-300 flex items-center gap-0.5">DN <ChevronUp size={12} className="text-sky-400" /></span>
                  <div className="my-1 flex flex-col items-center gap-1">
                    <button onClick={() => adjustPitchWheel('DN')} className="w-10 sm:w-12 h-6 rounded-t-md bg-gradient-to-b from-[#3a3e47] to-[#25282f] border border-slate-600 text-slate-300 hover:text-white flex items-center justify-center active:scale-90 shadow">▲</button>
                    <div onWheel={(e) => { e.deltaY < 0 ? adjustPitchWheel('DN') : adjustPitchWheel('UP') }} className="w-8 sm:w-10 h-14 rounded-md bg-[#121418] border-2 border-slate-800 shadow-inner flex flex-col justify-around items-center cursor-ns-resize overflow-hidden">
                      <div className="w-full h-1 bg-slate-700" />
                      <div className="w-full h-1 bg-slate-600" />
                      <div className="w-full h-1 bg-slate-500" />
                      <div className="w-full h-1 bg-slate-600" />
                      <div className="w-full h-1 bg-slate-700" />
                    </div>
                    <button onClick={() => adjustPitchWheel('UP')} className="w-10 sm:w-12 h-6 rounded-b-md bg-gradient-to-b from-[#25282f] to-[#3a3e47] border border-slate-600 text-slate-300 hover:text-white flex items-center justify-center active:scale-90 shadow">▼</button>
                  </div>
                  <span className="text-[10px] font-black text-slate-300 flex items-center gap-0.5">UP <ChevronDown size={12} className="text-sky-400" /></span>
                </div>

                {/* Vertical Buttons Grid */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <button onClick={handleVSModeClick} className={`h-10 sm:h-12 w-12 sm:w-16 rounded-lg font-black text-xs sm:text-sm tracking-wider flex items-center justify-center border-2 transition-all active:scale-95 shadow-md ${afcs.verticalActive === 'VS' ? 'bg-[#1b3320] text-emerald-300 border-emerald-500 shadow-emerald-950' : 'bg-[#2a2d33] hover:bg-[#343840] text-slate-200 border-[#4a4f59]'}`}>
                    <span>VS</span>
                  </button>
                  <button onClick={handleVNAVModeClick} className={`h-10 sm:h-12 w-12 sm:w-16 rounded-lg font-black text-xs sm:text-sm tracking-wider flex items-center justify-center border-2 transition-all active:scale-95 shadow-md ${afcs.verticalActive === 'VNAV' || afcs.verticalArmed === 'VNAV' ? 'bg-[#1b3320] text-emerald-300 border-emerald-500 shadow-emerald-950' : 'bg-[#2a2d33] hover:bg-[#343840] text-slate-200 border-[#4a4f59]'}`}>
                    <span>VNAV</span>
                  </button>
                  <button onClick={handleFLCModeClick} className={`h-10 sm:h-12 w-12 sm:w-16 rounded-lg font-black text-xs sm:text-sm tracking-wider flex items-center justify-center border-2 transition-all active:scale-95 shadow-md ${afcs.verticalActive === 'FLC' ? 'bg-[#1b3320] text-emerald-300 border-emerald-500 shadow-emerald-950' : 'bg-[#2a2d33] hover:bg-[#343840] text-slate-200 border-[#4a4f59]'}`}>
                    <span>FLC</span>
                  </button>
                  <button onClick={handleALTModeClick} className={`h-10 sm:h-12 w-12 sm:w-16 rounded-lg font-black text-xs sm:text-sm tracking-wider flex items-center justify-center border-2 transition-all active:scale-95 shadow-md ${afcs.verticalActive === 'ALT' ? 'bg-[#1b3320] text-emerald-300 border-emerald-500 shadow-emerald-950' : 'bg-[#2a2d33] hover:bg-[#343840] text-slate-200 border-[#4a4f59]'}`}>
                    <span>ALT</span>
                  </button>
                </div>
              </div>

              {/* 3. RIGHT ROTARY KNOB: ALT SEL */}
              <div className="flex flex-col items-center justify-center shrink-0">
                <span className="text-[10px] sm:text-[11px] font-black text-slate-300 tracking-wider mb-1">ALT SEL</span>
                <div className="relative group flex items-center justify-center">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-b from-[#33373d] via-[#1e2125] to-[#141517] border-2 border-[#454a52] shadow-xl flex items-center justify-center cursor-pointer active:scale-95 transition-transform">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-dashed border-slate-500/50 bg-[#16181b] flex flex-col items-center justify-center">
                      <button
                        onClick={syncAltitude}
                        className="text-[8px] sm:text-[9px] font-extrabold text-cyan-400 hover:text-cyan-200 transition-colors uppercase tracking-tight text-center leading-tight"
                        title="Click to Sync Altitude"
                      >
                        SYNC
                      </button>
                    </div>
                  </div>
                  <button onClick={() => adjustAltitude(-100)} className="absolute -left-2 top-3 w-5 h-5 rounded-full bg-slate-800 border border-slate-600 text-white text-[10px] font-bold flex items-center justify-center hover:bg-slate-700 active:scale-90">◀</button>
                  <button onClick={() => adjustAltitude(100)} className="absolute -right-2 top-3 w-5 h-5 rounded-full bg-slate-800 border border-slate-600 text-white text-[10px] font-bold flex items-center justify-center hover:bg-slate-700 active:scale-90">▶</button>
                </div>
                <span className="text-[9px] font-bold text-slate-400 mt-1">PUSH SYNC</span>
              </div>
            </div>

          </div>

          {/* Instructor & Student AFCS Breakdown Banner */}
          {showHelp && (
            <div className="bg-slate-900/90 border border-sky-500/40 rounded-xl p-4 text-xs text-slate-300 space-y-3 animate-slide-in-up">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2 font-bold text-sky-400 text-sm">
                  <Info size={16} /> AFCS Logic & Ground Training Reference
                </div>
                <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-white">
                  <X size={14} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <h3 className="font-bold text-emerald-400 mb-1">1. Flight Director (FD) vs AP</h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Clicking <strong className="text-white">FD</strong> displays the magenta command bars on the PFD and engages basic default modes (<strong className="text-emerald-400">ROL</strong> & <strong className="text-emerald-400">PIT</strong>). The pilot hand-flies to satisfy the cross-bars. Engaging <strong className="text-white">AP</strong> closes the servos to fly the aircraft automatically.
                  </p>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <h3 className="font-bold text-emerald-400 mb-1">2. Active (Green) vs Armed (White)</h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    The top annunciation bar shows active modes on the left of each channel in <strong className="text-emerald-400">GREEN</strong> and armed capture modes in <strong className="text-white">WHITE</strong> (e.g. <strong className="text-white">ALTS</strong> arms when climbing/descending towards Selected Altitude).
                  </p>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <h3 className="font-bold text-cyan-400 mb-1">3. Blue Level Button (LVL)</h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    The dedicated blue <strong className="text-cyan-400">LVL</strong> button provides emergency straight-and-level recovery. It engages both AP and FD, immediately rolling wings level (0° bank) and holding 0 FPM pitch.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default GFC500Simulator;
