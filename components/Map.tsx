
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl, Polygon, LayerGroup } from 'react-leaflet';
import L from 'leaflet';
import { Airport, CardType, Airmet, WeatherData } from '../types';
import { fetchAirmets } from '../services/aviationService';
import { CloudFog, Wind, Snowflake, AlertTriangle, Navigation } from 'lucide-react';

// Fix for default Leaflet markers in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

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

// Helper to determine color based on flight category
const getWeatherColor = (category?: string) => {
    const cat = category?.toUpperCase();
    switch (cat) {
        case 'VFR': return '#22c55e'; // Green
        case 'MVFR': return '#3b82f6'; // Blue
        case 'IFR': return '#ef4444'; // Red
        case 'LIFR': return '#d946ef'; // Magenta
        default: return 'transparent';
    }
};

// Custom Pin Icon Generator
const createPinIcon = (color: string, isSelected: boolean, weatherCategory?: string) => {
  return new L.DivIcon({
    className: `custom-pin-icon ${isSelected ? 'z-[1000]' : ''}`,
    html: `
      <div class="${isSelected ? 'animate-pin-bounce pulse-ring' : ''}" style="
          position: relative;
          color: ${color};
          filter: drop-shadow(0px ${isSelected ? '8px' : '3px'} ${isSelected ? '8px' : '3px'} rgba(0,0,0,${isSelected ? '0.5' : '0.4'})); 
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          transform-origin: bottom center;
          width: ${isSelected ? '48px' : '36px'};
          height: ${isSelected ? '48px' : '36px'};
      ">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" stroke="${isSelected ? '#1e293b' : '#ffffff'}" stroke-width="${isSelected ? '2' : '1.5'}" stroke-linecap="round" stroke-linejoin="round" style="width: 100%; height: 100%; display: block;">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3" fill="white"></circle>
        </svg>
      </div>
    `,
    iconSize: [isSelected ? 48 : 36, isSelected ? 64 : 48],
    iconAnchor: [isSelected ? 24 : 18, isSelected ? 64 : 48],
    popupAnchor: [0, isSelected ? -56 : -42]
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
}

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

const Map: React.FC<MapProps> = ({ airports, selectedId, onSelect, showAirmet, weatherMap }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [airmets, setAirmets] = useState<Airmet[]>([]);
  
  // GPS Tracking State
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number, heading: number | null} | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [centerTrigger, setCenterTrigger] = useState(0);

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
      
      {/* GPS Tracking Button */}
      <div className="absolute bottom-6 right-4 z-[1000]">
        <button 
          onClick={toggleTracking}
          className={`p-3 rounded-full shadow-lg transition-all ${
            isTracking 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
          }`}
          title={isTracking ? "Center on my location" : "Start GPS tracking"}
        >
          <Navigation size={24} className={isTracking ? 'fill-current' : ''} />
        </button>
        {locationError && (
          <div className="absolute bottom-full right-0 mb-2 w-48 bg-red-100 border border-red-200 text-red-700 text-xs p-2 rounded shadow-md">
            {locationError}
          </div>
        )}
      </div>

      <MapContainer 
        center={[37.7009, -113.0988]} 
        zoom={9} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        
        <LayersControl position="bottomleft">
          <LayersControl.BaseLayer checked name="Google Roadmap">
            <TileLayer
              attribution="&copy; Google"
              url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
              maxZoom={20}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Google Hybrid">
            <TileLayer
              attribution="&copy; Google"
              url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
              maxZoom={20}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Google Satellite">
            <TileLayer
              attribution="&copy; Google"
              url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
              maxZoom={20}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Google Terrain">
            <TileLayer
              attribution="&copy; Google"
              url="https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}"
              maxZoom={20}
            />
          </LayersControl.BaseLayer>

        </LayersControl>
        
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
          const weatherCategory = weatherMap[weatherId]?.flightCategory;
          const icon = createPinIcon(color, isSelected, weatherCategory);

          return (
              <Marker 
                  key={`${airport.id}-${weatherCategory || 'none'}`} 
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

        <MapUpdater selectedAirport={selectedAirport} />
        <CenterOnLocation location={userLocation} trigger={centerTrigger} />
      </MapContainer>
    </div>
  );
};

export default Map;
