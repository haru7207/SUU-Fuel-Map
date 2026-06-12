
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polygon, LayerGroup, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import { Airport, CardType, Airmet, WeatherData, NotamData } from '../types';
import { fetchAirmets, fetchActiveWildfires, fetchActiveTfrs } from '../services/aviationService';
import { CloudFog, Wind, Snowflake, AlertTriangle, Navigation } from 'lucide-react';

// Fix for default Leaflet markers in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Helper to validate GeoJSON structure to prevent Leaflet crashes
const isValidGeoJSON = (obj: any): boolean => {
  if (!obj || typeof obj !== 'object') return false;
  const validTypes = [
    "Feature", "FeatureCollection", "Point", "MultiPoint", 
    "LineString", "MultiLineString", "Polygon", "MultiPolygon", 
    "GeometryCollection"
  ];
  if (!validTypes.includes(obj.type)) return false;
  
  if (obj.type === "FeatureCollection") {
    return Array.isArray(obj.features);
  }
  return true;
};

// Helper to determine color based on card rules
const getPinColor = (cardRules: Airport['cardRules']) => {
    if (cardRules.byFuelType && Object.keys(cardRules.byFuelType).length > 0) {
        return '#9333ea'; // Purple for special airports (different cards for different fuel)
    }
    if (cardRules.critical) return '#dc2626'; // Red
    if (cardRules.warning) return '#ca8a04'; // Yellow/Orange
    
    switch (cardRules.primary) {
        case CardType.WHITE_CARD:
            return '#dc2626'; // Red
        case CardType.AVFUEL:
            return '#000000'; // Black
        case CardType.PCARD:
            return '#2563eb'; // Blue
        default:
            return '#64748b'; // Slate/Unknown
    }
};

// Custom Pin Icon Generator
const createPinIcon = (
  color: string, 
  isSelected: boolean, 
  windObj: { direction: number; speed: number; gust: number; isVrb?: boolean } | undefined,
  fuelPrice?: string | null,
  hasNotams?: boolean,
  showWindOverlay?: boolean,
  showFuelPrices?: boolean,
  showNotamOverlay?: boolean
) => {
  const activeFuelPrice = showFuelPrices ? fuelPrice : null;
  const activeNotam = showNotamOverlay && hasNotams;

  const width = isSelected ? 48 : 36;
  const height = isSelected ? 48 : 36;

  let overlaysHtml = '';

  // 1. NOTAM hazard warning (focused top-left layout)
  if (activeNotam) {
    overlaysHtml += `
      <div class="animate-pulse" style="
          position: absolute;
          top: -12px;
          left: -12px;
          background-color: #ef4444;
          color: white;
          border: 1.5px solid white;
          border-radius: 50%;
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-family: inherit;
          font-size: 11px;
          box-shadow: 0 3px 6px rgba(239,68,68,0.4), 0 1px 3px rgba(0,0,0,0.3);
          z-index: 50;
      " title="Active NOTAM Warning/Hazard">!</div>
    `;
  }

  // 2. Wind Overlay (enhanced top-right layout with direction arrow + color state)
  if (showWindOverlay && windObj) {
    const { speed, gust, direction, isVrb } = windObj;
    const maxWind = Math.max(speed, gust);
    
    // Determine background, border and text colors based on aviation safety guidelines
    let bg = '#0f172a'; // slate-900 (ultra-high contrast on all map tile types)
    let textAndArrowColor = '#34d399'; // emerald-400 for standard calm wind
    let border = '1.5px solid #1e293b';
    let windLabel = 'Calm';
    
    if (speed > 0 || gust > 0) {
      const valText = gust > 0 ? `${speed}G${gust}` : `${speed}`;
      const dirText = isVrb ? 'VRB' : `${String(direction).padStart(3, '0')}°`;
      windLabel = `${dirText} ${valText}kt`;
      
      if (maxWind >= 20) {
        bg = '#dc2626'; // High/Restricted Wind (Solid Red)
        border = '1.5px solid #fecaca';
        textAndArrowColor = '#ffffff';
      } else if (maxWind >= 12) {
        bg = '#d97706'; // Moderate / Warning Wind (Caution Amber/Orange)
        border = '1.5px solid #fef3c7';
        textAndArrowColor = '#ffffff';
      } else {
        bg = '#0f172a'; // Calm Light Wind (Slate 900)
        border = '1.5px solid #1e293b';
        textAndArrowColor = '#34d399'; // Vibrant Mint
      }
    }

    // Rotating Arrow SVG representing wind direction vector (Aviation reference: where the wind is coming from)
    const arrowSvg = (!isVrb && speed > 0) ? `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${textAndArrowColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(${direction}deg); width: 10px; height: 10px; display: inline-block; flex-shrink: 0;">
        <line x1="12" y1="4" x2="12" y2="20"></line>
        <polyline points="18 14 12 20 6 14"></polyline>
      </svg>
    ` : '';

    overlaysHtml += `
      <div style="
          position: absolute;
          top: -12px;
          right: -24px;
          background-color: ${bg};
          color: ${textAndArrowColor};
          border: ${border};
          border-radius: 4px;
          padding: 2.5px 5px;
          font-weight: 800;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 9px;
          line-height: 1;
          box-shadow: 0 3px 6px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.2);
          z-index: 40;
          display: flex;
          align-items: center;
          gap: 3px;
          white-space: nowrap;
          letter-spacing: -0.2px;
      ">
        ${arrowSvg}
        <span>${windLabel}</span>
      </div>
    `;
  }

  // 3. Fuel price label (centered below the pin)
  if (activeFuelPrice) {
    overlaysHtml += `
      <div style="
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          bottom: -16px;
          background-color: #020617; /* Slate 950 */
          color: #10b981; /* Emerald 500 */
          border: 1.5px solid #1e293b;
          border-radius: 4px;
          padding: 2.5px 5px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-weight: 800;
          font-size: 9px;
          line-height: 1;
          white-space: nowrap;
          box-shadow: 0 3px 6px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.22);
          z-index: 30;
          letter-spacing: -0.2px;
      ">${activeFuelPrice}</div>
    `;
  }

  return new L.DivIcon({
    className: `custom-pin-icon transition-all duration-300 ${isSelected ? 'z-[1000]' : 'hover:z-[1000]'}`,
    html: `
      <div class="${isSelected ? 'animate-pin-bounce pulse-ring drop-shadow-[0_8px_8px_rgba(0,0,0,0.5)]' : 'drop-shadow-md hover:-translate-y-1 hover:scale-110 hover:drop-shadow-[0_10px_10px_rgba(0,0,0,0.4)]'} transition-all duration-300 ease-out" style="
          position: relative;
          color: ${color};
          transform-origin: bottom center;
          width: ${width}px;
          height: ${height}px;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" stroke="${isSelected ? '#1e293b' : '#ffffff'}" stroke-width="${isSelected ? '2' : '1.5'}" stroke-linecap="round" stroke-linejoin="round" style="width: 100%; height: 100%; display: block;">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3" fill="white"></circle>
        </svg>
        ${overlaysHtml}
      </div>
    `,
    iconSize: [width, height],
    iconAnchor: [width / 2, height],
    popupAnchor: [0, -height - 2]
  });
};

// Custom User Location Icon Generator
const createUserIcon = (heading: number | null) => {
  const rotation = heading !== null ? heading : 0;
  return new L.DivIcon({
    className: 'custom-user-icon',
    html: `
      <div style="
          transform: rotate(${rotation}deg);
          transition: transform 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background-color: #3b82f6;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 4px 6px rgba(0,0,0,0.3);
      ">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" stroke="none" style="width: 16px; height: 16px; ${heading !== null ? 'transform: translateY(-2px);' : ''}">
          ${heading !== null 
            ? '<path d="M12 2L22 20L12 17L2 20L12 2Z" />' // Navigation arrow if heading is available
            : '<circle cx="12" cy="12" r="6" />' // Simple dot if no heading
          }
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

interface MapProps {
  airports: Airport[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  showAirmet: boolean;
  weatherMap: Record<string, any>;
  notamMap?: Record<string, NotamData>;
  mapLayers?: {
    fuelPrices: boolean;
    weatherOverlay: boolean;
    notamWarnings: boolean;
    wildfires: boolean;
    tfrs: boolean;
  };
  baseMapType?: 'roadmap' | 'hybrid' | 'satellite' | 'terrain';
  trackedAircraft?: any | null;
}

// Helper to center on tracked aircraft
const AircraftTracker: React.FC<{ aircraft: any | null }> = ({ aircraft }) => {
  const map = useMap();
  useEffect(() => {
    if (aircraft && aircraft.latitude && aircraft.longitude) {
      map.flyTo([aircraft.latitude, aircraft.longitude], 12, { animate: true, duration: 1.5 });
    }
  }, [aircraft, map]);
  return null;
};

// Helper to fit bounds to selected airport
const MapUpdater: React.FC<{ selectedAirport: Airport | undefined }> = ({ selectedAirport }) => {
  const map = useMap();
  useEffect(() => {
    if (selectedAirport) {
      map.flyTo([selectedAirport.lat, selectedAirport.lon], 11, {
        animate: true,
        duration: 1.2 // Slightly faster for snappier feel
      });
    }
  }, [selectedAirport, map]);
  return null;
};

// Helper to center on user location
const CenterOnLocation: React.FC<{ location: {lat: number, lng: number} | null, trigger: number }> = ({ location, trigger }) => {
  const map = useMap();
  useEffect(() => {
    if (location && trigger > 0) {
      map.flyTo([location.lat, location.lng], 11, { animate: true, duration: 1.2 });
    }
  }, [location, trigger, map]);
  return null;
};

// Helper for AIRMET styling and Icons
const getAirmetStyle = (type: string) => {
    switch (type) {
        case 'SIERRA': return { color: '#9333ea', fillColor: '#9333ea', label: 'IFR / MTN OBSCN' }; // Purple
        case 'TANGO': return { color: '#ea580c', fillColor: '#ea580c', label: 'TURBULENCE' }; // Orange
        case 'ZULU': return { color: '#2563eb', fillColor: '#2563eb', label: 'ICING' }; // Blue
        default: return { color: '#64748b', fillColor: '#64748b', label: 'AIRMET' };
    }
};
const getAirmetIcon = (type: string) => {
    switch(type) {
        case 'SIERRA': return CloudFog;
        case 'TANGO': return Wind;
        case 'ZULU': return Snowflake;
        default: return AlertTriangle;
    }
}

const Map: React.FC<MapProps> = ({ 
  airports, 
  selectedId, 
  onSelect, 
  showAirmet, 
  weatherMap,
  notamMap = {},
  mapLayers = { fuelPrices: false, weatherOverlay: false, notamWarnings: false, wildfires: false, tfrs: false },
  baseMapType = 'roadmap',
  trackedAircraft = null
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [airmets, setAirmets] = useState<Airmet[]>([]);
  const [wildfiresGeoJson, setWildfiresGeoJson] = useState<any>(null);
  const [isFetchingWildfires, setIsFetchingWildfires] = useState(false);
  const [tfrGeoJson, setTfrGeoJson] = useState<any>(null);
  const [isFetchingTfrs, setIsFetchingTfrs] = useState(false);
  const [tfrsError, setTfrsError] = useState<string | null>(null);
  
  // GPS Tracking State
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number, heading: number | null} | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [centerTrigger, setCenterTrigger] = useState(0);
  const [isLegendOpen, setIsLegendOpen] = useState(true);

  // Track previous states to auto-open legend when these layers are activated
  const prevLayersRef = React.useRef({
    wildfires: !!mapLayers.wildfires,
    tfrs: !!mapLayers.tfrs,
    showAirmet: !!showAirmet
  });

  useEffect(() => {
    const wasWildfiresActivated = mapLayers.wildfires && !prevLayersRef.current.wildfires;
    const wasTfrsActivated = mapLayers.tfrs && !prevLayersRef.current.tfrs;
    const wasAirmetActivated = showAirmet && !prevLayersRef.current.showAirmet;

    if (wasWildfiresActivated || wasTfrsActivated || wasAirmetActivated) {
      setIsLegendOpen(true);
    }

    prevLayersRef.current = {
      wildfires: !!mapLayers.wildfires,
      tfrs: !!mapLayers.tfrs,
      showAirmet: !!showAirmet
    };
  }, [mapLayers.wildfires, mapLayers.tfrs, showAirmet]);

  // Fetch Wildfires when layer is enabled
  useEffect(() => {
    if (mapLayers.wildfires && !wildfiresGeoJson && !isFetchingWildfires) {
      setIsFetchingWildfires(true);
      fetchActiveWildfires().then(data => {
        if (data && isValidGeoJSON(data)) {
          setWildfiresGeoJson(data);
        } else {
          console.warn("Invalid GeoJSON returned from NIFC server:", data);
          // Set an empty FeatureCollection structure so we don't try refetching repeatedly, but won't crash
          setWildfiresGeoJson({ type: "FeatureCollection", features: [] });
        }
      }).catch(err => {
        console.error("Failed to load wildfire perimeters", err);
        setWildfiresGeoJson({ type: "FeatureCollection", features: [] });
      }).finally(() => {
        setIsFetchingWildfires(false);
      });
    }
  }, [mapLayers.wildfires, wildfiresGeoJson, isFetchingWildfires]);

  // Fetch TFRs when layer is enabled
  useEffect(() => {
    if (mapLayers.tfrs && !tfrGeoJson && !isFetchingTfrs) {
      setIsFetchingTfrs(true);
      setTfrsError(null);
      fetchActiveTfrs().then(data => {
        if (data && isValidGeoJSON(data)) {
          setTfrGeoJson(data);
        } else {
          console.warn("Invalid TFR GeoJSON returned from FAA server:", data);
          setTfrGeoJson({ type: "FeatureCollection", features: [] });
          setTfrsError("Airspace data is currently unavailable");
        }
      }).catch(err => {
        console.error("Failed to load active TFR perimeters", err);
        setTfrGeoJson({ type: "FeatureCollection", features: [] });
        setTfrsError("Airspace data is currently unavailable");
      }).finally(() => {
        setIsFetchingTfrs(false);
      });
    }
  }, [mapLayers.tfrs, tfrGeoJson, isFetchingTfrs]);

  useEffect(() => {
    setIsMounted(true);
    // Fetch static map layers
    const loadLayers = async () => {
      try {
        const airmetData = await fetchAirmets();
        setAirmets(airmetData);
      } catch (e) {
        console.error("Failed to load map layers", e);
      }
    };
    loadLayers();
  }, []);

  // GPS Tracking Effect
  useEffect(() => {
    let watchId: number;

    if (isTracking) {
      if (!navigator.geolocation) {
        setLocationError("Geolocation is not supported by your browser");
        setIsTracking(false);
        return;
      }

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            heading: position.coords.heading
          });
          setLocationError(null);
          
          // If this is the first location update after turning on tracking, center the map
          if (centerTrigger === 0) {
            setCenterTrigger(prev => prev + 1);
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          setLocationError(error.message);
          setIsTracking(false);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 5000
        }
      );
    } else {
      setUserLocation(null);
      setCenterTrigger(0);
    }

    return () => {
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isTracking]);

  const toggleTracking = () => {
    if (isTracking) {
      // If already tracking, just center the map on the current location
      if (userLocation) {
        setCenterTrigger(prev => prev + 1);
      } else {
        setIsTracking(false);
      }
    } else {
      setIsTracking(true);
    }
  };

  if (!isMounted) return <div className="h-full w-full bg-slate-100 animate-pulse" />;

  const selectedAirport = airports.find(a => a.id === selectedId);

  return (
    <div className="relative h-full w-full group">
      
      {/* Top Center Loading Indicators */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] flex flex-col items-center gap-1.5 pointer-events-none">
        {isFetchingWildfires && (
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur border border-orange-500/50 shadow-lg dark:shadow-orange-900/20 text-orange-600 dark:text-orange-400 py-1 px-3.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 animate-pulse">
             <svg className="animate-spin h-3.5 w-3.5 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
             Fetching hazards...
          </div>
        )}
        {isFetchingTfrs && (
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur border border-rose-500/50 shadow-lg dark:shadow-rose-900/20 text-rose-600 dark:text-rose-400 py-1 px-3.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 animate-pulse">
             <svg className="animate-spin h-3.5 w-3.5 text-rose-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
             Fetching TFRs...
          </div>
        )}
        {tfrsError && mapLayers.tfrs && (
          <div className="bg-red-50 dark:bg-red-950/95 border border-red-200 dark:border-red-900/60 shadow-md text-red-600 dark:text-red-400 py-1.5 px-3.5 rounded-md text-[10px] font-bold flex items-center gap-1 pointer-events-auto">
             <span className="text-[12px]">⚠️</span> {tfrsError}
          </div>
        )}
      </div>

      {/* GPS Tracking Button */}
      <div className="absolute top-4 left-14 md:top-auto md:left-auto md:bottom-6 md:right-4 z-[1000]">
        <button 
          onClick={toggleTracking}
          className={`p-2 md:p-3 rounded-full shadow-lg transition-all ${
            isTracking 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
          }`}
          title={isTracking ? "Center on my location" : "Start GPS tracking"}
        >
          <Navigation size={18} className={`md:w-6 md:h-6 ${isTracking ? 'fill-current' : ''}`} />
        </button>
        {locationError && (
          <div className="absolute top-full left-0 md:top-auto md:bottom-full md:left-auto md:right-0 mt-2 md:mt-0 md:mb-2 w-48 bg-red-100 border border-red-200 text-red-700 text-xs p-2 rounded shadow-md">
            {locationError}
          </div>
        )}
      </div>

      {/* Map Hazard Legend Overlay */}
      {(mapLayers.wildfires || mapLayers.tfrs || showAirmet) && (
        <div className="absolute bottom-6 left-4 z-[1000] flex flex-col items-start pointer-events-auto select-none font-sans">
          {isLegendOpen ? (
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-3.5 max-w-[250px] text-xs flex flex-col gap-2.5 transition-all text-slate-800 dark:text-slate-200">
              <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-1.5 flex items-center justify-between w-full">
                <span>Map Hazard Legend</span>
                <button 
                  onClick={() => setIsLegendOpen(false)} 
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-extrabold ml-4 p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center w-4 h-4 line-height-none"
                  title="Collapse legend"
                >
                  ✕
                </button>
              </div>
              <div className="flex flex-col gap-2.5">
                {mapLayers.tfrs && (
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-3.5 border-2 border-dashed border-[#db2777] bg-[#f43f5e]/15 rounded-sm self-center"></div>
                    <div className="flex flex-col">
                      <span className="font-extrabold text-slate-800 dark:text-slate-200 text-[11px] leading-tight flex items-center gap-1">🚫 FAA TFR Airspace</span>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-tight">Strict flight restriction zone</p>
                    </div>
                  </div>
                )}
                {mapLayers.wildfires && (
                  <>
                    <div className="flex items-start gap-2.5">
                      <div className="relative flex items-center justify-center w-5 h-5 bg-red-650 rounded-full border border-amber-300 self-center">
                        <span className="text-[11px] leading-none select-none">🔥</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-extrabold text-slate-800 dark:text-slate-200 text-[11px] leading-tight">Active Wildfire (WF)</span>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-tight">Emergency wildfire incident</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="relative flex items-center justify-center w-5 h-5 bg-slate-900 rounded-full border border-emerald-400 self-center">
                        <span className="text-[10px] leading-none select-none">💨</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-extrabold text-slate-800 dark:text-slate-200 text-[11px] leading-tight">Prescribed Burn (RX)</span>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-tight">Planned & monitored fire</p>
                      </div>
                    </div>
                  </>
                )}
                {showAirmet && (
                  <div className="flex flex-col gap-1.5 mt-0.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">G-AIRMET Advisories</span>
                    <div className="flex flex-wrap gap-1">
                      <span className="inline-flex items-center gap-1 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/25 text-[8px] font-bold text-purple-600 dark:text-purple-400 uppercase">
                        <span className="w-1 h-1 rounded-full bg-purple-500"></span> IFR (Sierra)
                      </span>
                      <span className="inline-flex items-center gap-1 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/25 text-[8px] font-bold text-orange-600 dark:text-orange-400 uppercase">
                        <span className="w-1 h-1 rounded-full bg-orange-500"></span> Turb (Tango)
                      </span>
                      <span className="inline-flex items-center gap-1 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/25 text-[8px] font-bold text-blue-600 dark:text-blue-400 uppercase">
                        <span className="w-1 h-1 rounded-full bg-blue-500"></span> Icing (Zulu)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <button 
              onClick={() => setIsLegendOpen(true)}
              className="bg-white/95 dark:bg-slate-900/95 backdrop-blur border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 py-1.5 px-3 rounded-full shadow-lg text-[10px] font-extrabold flex items-center gap-1 transition-all active:scale-95 border-b-2"
              title="Expand hazard legend"
            >
              <span>ℹ️</span>
              <span>Map Legend</span>
            </button>
          )}
        </div>
      )}

      <MapContainer 
        center={[37.7009, -113.0988]} 
        zoom={9} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        
        <TileLayer
          key={baseMapType}
          attribution="&copy; Google"
          url={
            baseMapType === 'hybrid' ? "https://mt1.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}" :
            baseMapType === 'satellite' ? "https://mt1.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}" :
            baseMapType === 'terrain' ? "https://mt1.google.com/vt/lyrs=p&hl=en&x={x}&y={y}&z={z}" :
            "https://mt1.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}"
          }
          maxZoom={20}
        />
        
        {/* G-AIRMET Layer */}
        {showAirmet && (
            <LayerGroup>
                {airmets.map(airmet => {
                    const style = getAirmetStyle(airmet.type);
                    const Icon = getAirmetIcon(airmet.type);
                    return (
                        <Polygon
                            key={airmet.id}
                            positions={airmet.coordinates}
                            pathOptions={{ 
                                color: style.color, 
                                fillColor: style.fillColor, 
                                fillOpacity: 0.2, 
                                weight: 2, 
                                dashArray: '5,5' 
                            }}
                        >
                            <Popup className="custom-popup">
                                <div className="p-1 min-w-[200px]">
                                    <div className="flex items-center gap-2 mb-2 pb-2" style={{ borderBottom: `1px solid ${style.color}40` }}>
                                        <Icon size={16} style={{ color: style.color }} />
                                        <h3 className="font-bold m-0" style={{ color: style.color }}>AIRMET {airmet.type}</h3>
                                    </div>
                                    <div className="space-y-1.5 text-xs text-slate-700">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500 font-bold">Hazard</span>
                                            <span className="font-bold">{airmet.hazard}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500 font-bold">Altitude</span>
                                            <span className="font-mono">{airmet.minAlt} - {airmet.maxAlt}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500 font-bold">Valid</span>
                                            <span className="font-mono">{airmet.validTime}</span>
                                        </div>
                                    </div>
                                </div>
                            </Popup>
                        </Polygon>
                    );
                })}
            </LayerGroup>
        )}

        {/* Airports Layer */}
        {airports.map(airport => {
          const isSelected = airport.id === selectedId;
          const color = getPinColor(airport.cardRules);
          const weatherId = airport.weatherSource || airport.id;
          const windObj = weatherMap[weatherId]?.wind;
          const windKey = windObj ? `${windObj.direction}_${windObj.speed}_${windObj.gust}` : 'no_wind';
          
          // Compute dynamic data for overlays
          const fuelPriceVal = airport.fuelPrices?.['100LL'] || (airport.fuelPrices ? Object.values(airport.fuelPrices)[0] : null);
          const fuelPriceText = fuelPriceVal ? `$${fuelPriceVal.toFixed(2)}` : null;
          
          const notamsForAirport = notamMap?.[airport.id]?.rawNotams;
          const hasNotams = notamsForAirport && notamsForAirport.length > 0;

          // Build custom layers-aware marker icon
          const icon = createPinIcon(
            color, 
            isSelected, 
            windObj,
            fuelPriceText,
            !!hasNotams,
            mapLayers.weatherOverlay,
            mapLayers.fuelPrices,
            mapLayers.notamWarnings
          );

          return (
              <Marker 
                  key={`${airport.id}-${windKey}-${mapLayers.fuelPrices}-${mapLayers.weatherOverlay}-${mapLayers.notamWarnings}-${hasNotams}`} 
                  position={[airport.lat, airport.lon]}
                  icon={icon}
                  zIndexOffset={isSelected ? 1000 : 0}
                  eventHandlers={{ click: () => onSelect(airport.id) }}
              >
                  <Popup>
                     <div className="text-center">
                         <h3 className="font-bold text-lg m-0">{airport.id}</h3>
                         <p className="m-0 text-sm text-slate-500 mb-2">{airport.fbo}</p>
                         <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded text-white ${
                             airport.cardRules.primary === CardType.WHITE_CARD ? 'bg-red-500' : 'bg-blue-500'
                         }`}>
                             {airport.cardRules.primary}
                         </span>
                         <div className="mt-3">
                             <button onClick={() => onSelect(airport.id)} className="text-xs bg-slate-800 text-white px-3 py-1 rounded hover:bg-slate-700 w-full">
                              View Details
                             </button>
                         </div>
                     </div>
                  </Popup>
              </Marker>
          );
        })}

        {/* Wildfire Hazards GeoJSON Layer */}
        {mapLayers.wildfires && wildfiresGeoJson && isValidGeoJSON(wildfiresGeoJson) && (
          <GeoJSON 
            key={wildfiresGeoJson.features?.length || Date.now()}
            data={wildfiresGeoJson}
            style={{
              color: '#ea580c', // Bright burning orange stroke for fire perimeters
              weight: 3,
              opacity: 0.95,
              fillColor: '#facc15', // Glowing hot yellow-orange fill
              fillOpacity: 0.4,
              dashArray: undefined // Solid boundary line for active perimeters
            }}
            pointToLayer={(feature, latlng) => {
              const isRx = feature.properties?.IncidentTypeCategory === 'RX';
              if (isRx) {
                // Prescribed Fire (RX) gets a beautiful controlled amber/smoke icon
                const rxIcon = L.divIcon({
                  html: `
                    <div class="relative flex items-center justify-center w-6 h-6">
                      <div class="absolute inset-0 bg-amber-500/20 rounded-full animate-pulse"></div>
                      <div class="w-5 h-5 rounded-full bg-slate-900 border border-emerald-400 shadow flex items-center justify-center text-[10px] select-none">
                        💨
                      </div>
                    </div>
                  `,
                  className: '!bg-transparent !border-none', // Override ugly default Leaflet styles
                  iconSize: [24, 24],
                  iconAnchor: [12, 12]
                });
                return L.marker(latlng, { icon: rxIcon });
              } else {
                // Wildfire (WF) gets a magnificent pulsing fiery ember icon
                const wfIcon = L.divIcon({
                  html: `
                    <div class="relative flex items-center justify-center w-8 h-8">
                      <div class="absolute inset-0 bg-red-600/30 rounded-full animate-ping" style="animation-duration: 2.2s;"></div>
                      <div class="absolute w-6.5 h-6.5 bg-orange-500/40 rounded-full animate-pulse"></div>
                      <div class="w-5.5 h-5.5 rounded-full bg-red-600 border border-amber-300 shadow-md flex items-center justify-center text-xs select-none">
                        🔥
                      </div>
                    </div>
                  `,
                  className: '!bg-transparent !border-none', // Override ugly default Leaflet styles
                  iconSize: [32, 32],
                  iconAnchor: [16, 16]
                });
                return L.marker(latlng, { icon: wfIcon });
              }
            }}
            onEachFeature={(feature, layer) => {
              if (feature.properties) {
                const name = feature.properties.IncidentName || feature.properties.poly_IncidentName || 'Unknown Fire';
                const acresRaw = feature.properties.IncidentSize || feature.properties.poly_Acres_AutoCalc || feature.properties.GISAcres || feature.properties.DailyAcres;
                const acres = acresRaw ? Number(acresRaw).toLocaleString(undefined, {maximumFractionDigits: 0}) : 'Unknown';
                const contained = feature.properties.PercentContained !== null && feature.properties.PercentContained !== undefined 
                    ? `${feature.properties.PercentContained}%` 
                    : 'Unknown';
                const typeCat = feature.properties.IncidentTypeCategory;
                const typeText = typeCat === 'RX' ? 'Prescribed Fire (RX)' : typeCat === 'WF' ? 'Wildfire (WF)' : 'Active Incident';

                let landowner = '';
                if (feature.properties.POOLandownerCategory) {
                  const cat = feature.properties.POOLandownerCategory;
                  if (cat === 'USFS') landowner = 'U.S. Forest Service (National Forest)';
                  else if (cat === 'BLM') landowner = 'Bureau of Land Management (BLM)';
                  else if (cat === 'NPS') landowner = 'National Park Service (NPS)';
                  else if (cat === 'FWS') landowner = 'U.S. Fish & Wildlife Service';
                  else if (cat === 'BIA') landowner = 'Bureau of Indian Affairs (BIA)';
                  else if (cat === 'State') landowner = 'State Forestry / Public Lands';
                  else if (cat === 'Private') landowner = 'Private Lands';
                  else landowner = cat;
                }

                let locationText = '';
                if (feature.properties.POOCounty || feature.properties.POOState) {
                  const parts = [];
                  if (feature.properties.POOCounty) parts.push(`${feature.properties.POOCounty} County`);
                  if (feature.properties.POOState) {
                    const st = feature.properties.POOState.replace('US-', '');
                    parts.push(st);
                  }
                  locationText = parts.join(', ');
                }

                let extraDetailsHtml = '';
                if (landowner) {
                  extraDetailsHtml += `<div><strong style="color: #0f172a;">Agency:</strong> ${landowner}</div>`;
                }
                if (locationText) {
                  extraDetailsHtml += `<div><strong style="color: #0f172a;">Location:</strong> ${locationText}</div>`;
                }
                if (feature.properties.POOJurisdictionalUnit) {
                  extraDetailsHtml += `<div><strong style="color: #0f172a;">Unit Code:</strong> ${feature.properties.POOJurisdictionalUnit}</div>`;
                }
                if (feature.properties.FireDiscoveryDateTime) {
                  try {
                    const dStr = new Date(feature.properties.FireDiscoveryDateTime).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'});
                    extraDetailsHtml += `<div><strong style="color: #0f172a;">Discovered:</strong> ${dStr}</div>`;
                  } catch {}
                }

                const icon = typeCat === 'RX' ? '💨' : '🔥';
                
                layer.bindPopup(`
                  <div style="font-family: inherit; text-align: left; padding: 4px; min-width: 180px;">
                    <div style="font-weight: 800; color: #dc2626; font-size: 13px; margin-bottom: 2px; letter-spacing: -0.2px; text-transform: uppercase;">
                      ${icon} ${name}
                    </div>
                    <div style="font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 6px;">
                      ${typeText}
                    </div>
                    <div style="font-size: 11px; color: #475569; line-height: 1.45; border-top: 1px solid #e2e8f0; padding-top: 4px;">
                      <div><strong style="color: #0f172a;">Size:</strong> ${acres} Acres</div>
                      <div><strong style="color: #0f172a;">Contained:</strong> ${contained}</div>
                      ${extraDetailsHtml}
                    </div>
                  </div>
                `);
              }
            }}
          />
        )}

        {/* FAA TFR Hazards GeoJSON Layer */}
        {mapLayers.tfrs && tfrGeoJson && isValidGeoJSON(tfrGeoJson) && (
          <GeoJSON 
            key={tfrGeoJson.features?.length || Date.now()}
            data={tfrGeoJson}
            style={{
              color: '#db2777', // Vibrant magenta/pinkish-red outer border to represent strict restricted flight limits
              weight: 3.5,
              opacity: 0.95,
              fillColor: '#f43f5e', // Warn rose/crimson interior fill
              fillOpacity: 0.15, // Highly transparent so details behind remain fully visible
              dashArray: '10, 8' // Bold spaced dash pattern representing defensive airspace restriction limit
            }}
            onEachFeature={(feature, layer) => {
              if (feature.properties) {
                const props = feature.properties;
                const notam = props.NOTAM || props.notam || props.NotamNumber || props.NotamID || props.notam_num || props.notamNumber || (props.NAME ? props.NAME.replace(" NATIONAL DEFENSE AIRSPACE TFR", "") : '') || 'NDA TFR';
                const type = props.TYPE || props.Type || props.tfr_type || props.NOTAM_TYPE || props.tfrType || props.LOCAL_TYPE || 'Airspace Restriction';
                
                // Handle altitudes with robust fallbacks
                let altitudesStr = 'Surface to Unlimited';
                const low = props.AMSL_LWR !== undefined ? props.AMSL_LWR : (props.LOW_ALT !== undefined ? props.LOW_ALT : (props.BASE_ALT !== undefined ? props.BASE_ALT : '0'));
                const high = props.AMSL_UPR !== undefined ? props.AMSL_UPR : (props.HI_ALT !== undefined ? props.HI_ALT : (props.TOP_ALT !== undefined ? props.TOP_ALT : 'Unlimited'));
                
                if (low !== '0' || high !== 'Unlimited') {
                  const formatAltitude = (val: any) => {
                    const num = Number(val);
                    return isNaN(num) ? val : `${num.toLocaleString()} ft MSL`;
                  };
                  altitudesStr = `${formatAltitude(low)} to ${formatAltitude(high)}`;
                }
                
                const desc = props.TFR_DESC || props.Description || props.description || props.remarks || props.NAME || '';
                const locationStr = props.CITY ? `${props.CITY}, ${props.STATE || ''}` : (props.STATE || '');
                
                // Formulate target FAA TFR page link
                let linkUrl = 'https://tfr.faa.gov/';
                if (notam && notam !== 'Unknown NOTAM' && notam !== 'NDA TFR') {
                   const sanitizedNotam = notam.replace('/', '_').trim();
                   linkUrl = `https://tfr.faa.gov/save_pages/detail_${sanitizedNotam}.html`;
                }
                
                layer.bindPopup(`
                  <div style="font-family: inherit; width: 220px; padding: 4px;">
                    <div style="font-weight: 800; color: #be185d; font-size: 13px; margin-bottom: 6px; letter-spacing: -0.2px; display: flex; align-items: center; gap: 4px;">
                      🚫 TFR Area (${notam})
                    </div>
                    <div style="font-size: 11px; color: #475569; line-height: 1.5; margin-bottom: 8px;">
                      <div><strong style="color: #0f172a;">Type:</strong> ${type}</div>
                      <div><strong style="color: #0f172a;">Altitudes:</strong> ${altitudesStr}</div>
                      ${locationStr ? `<div><strong style="color: #0f172a;">Location:</strong> ${locationStr}</div>` : ''}
                      ${desc ? `<div style="margin-top: 4px; font-style: italic; font-size: 10px; max-height: 50px; overflow-y: auto; color: #64748b; background-color: #f8fafc; padding: 4px; border-radius: 4px; border: 1px solid #f1f5f9;">"${desc}"</div>` : ''}
                    </div>
                    <div style="border-top: 1px solid #f1f5f9; padding-top: 6px; text-align: center;">
                      <a href="${linkUrl}" target="blank" rel="noopener noreferrer" style="color: #2563eb; font-weight: 700; text-decoration: underline; font-size: 10px; display: inline-block;">
                        Official FAA TFR Portal →
                      </a>
                    </div>
                  </div>
                `);
              }
            }}
          />
        )}

        {/* User Location Marker */}
        {userLocation && (
          <Marker 
            position={[userLocation.lat, userLocation.lng]} 
            icon={createUserIcon(userLocation.heading)}
            zIndexOffset={2000}
          >
            <Popup>
              <div className="text-center p-1">
                <h3 className="font-bold text-sm m-0">Your Location</h3>
                <p className="text-xs text-slate-500 m-0 mt-1">
                  {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Tracker Marker */}
        {trackedAircraft && trackedAircraft.latitude && trackedAircraft.longitude && (
          <Marker 
            position={[trackedAircraft.latitude, trackedAircraft.longitude]}
            icon={L.divIcon({
              className: 'custom-tracker-icon',
              html: `<div style="background-color: #059669; color: white; border: 2px solid white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.3);">✈️</div>`,
              iconSize: [24, 24],
              iconAnchor: [12, 12],
              popupAnchor: [0, -12],
            })}
            zIndexOffset={3000}
          >
            <Popup>
              <div className="p-1 min-w-[140px]">
                <h3 className="font-extrabold text-sm mb-1 text-slate-800">{trackedAircraft.tailNumber}</h3>
                <p className="text-xs font-medium text-emerald-600 mb-2">{trackedAircraft.aircraftType}</p>
                <div className="text-xs text-slate-600 space-y-1">
                  <div><strong>Alt:</strong> {Math.round(trackedAircraft.baroAltitude).toLocaleString()} ft</div>
                  <div><strong>Spd:</strong> {Math.round(trackedAircraft.velocity)} kts</div>
                  <div><strong>Hdg:</strong> {Math.round(trackedAircraft.trueTrack)}°</div>
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        <MapUpdater selectedAirport={selectedAirport} />
        <CenterOnLocation location={userLocation} trigger={centerTrigger} />
        <AircraftTracker aircraft={trackedAircraft} />
      </MapContainer>
    </div>
  );
};

export default Map;
