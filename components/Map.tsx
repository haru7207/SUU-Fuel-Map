
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl, LayersControl, Polygon, LayerGroup } from 'react-leaflet';
import L from 'leaflet';
import { Airport, CardType, Airmet } from '../types';
import { fetchAirmets } from '../services/aviationService';
import { CloudFog, Wind, Snowflake, AlertTriangle } from 'lucide-react';

// Fix for default Leaflet markers in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Helper to determine color based on card rules
const getPinColor = (cardType: CardType, critical: boolean = false, warning: boolean = false) => {
    if (critical || cardType === CardType.WHITE_CARD) return '#dc2626'; // Red
    if (warning) return '#ca8a04'; // Yellow/Orange
    if (cardType === CardType.PCARD || cardType === CardType.AVFUEL) return '#2563eb'; // Blue
    return '#64748b'; // Slate/Unknown
};

// Custom Pin Icon Generator
const createPinIcon = (color: string, isSelected: boolean) => new L.DivIcon({
  className: 'custom-pin-icon',
  html: `
    <div style="
        filter: drop-shadow(0px ${isSelected ? '8px' : '3px'} ${isSelected ? '8px' : '3px'} rgba(0,0,0,${isSelected ? '0.5' : '0.4'})); 
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    ">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" stroke="${isSelected ? '#1e293b' : '#ffffff'}" stroke-width="${isSelected ? '2' : '1.5'}" stroke-linecap="round" stroke-linejoin="round" style="width: ${isSelected ? '48px' : '36px'}; height: ${isSelected ? '48px' : '36px'}; display: block; transform-origin: bottom center;">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3" fill="white"></circle>
      </svg>
    </div>
  `,
  iconSize: [isSelected ? 48 : 36, isSelected ? 64 : 48],
  iconAnchor: [isSelected ? 24 : 18, isSelected ? 64 : 48],
  popupAnchor: [0, isSelected ? -56 : -42]
});

interface MapProps {
  airports: Airport[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  showAirmet: boolean;
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

const Map: React.FC<MapProps> = ({ airports, selectedId, onSelect, showAirmet }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [airmets, setAirmets] = useState<Airmet[]>([]);

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

  if (!isMounted) return <div className="h-full w-full bg-slate-100 animate-pulse" />;

  const selectedAirport = airports.find(a => a.id === selectedId);

  return (
    <div className="relative h-full w-full group">
      
      <MapContainer 
        center={[37.7009, -113.0988]} 
        zoom={9} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <ZoomControl position="bottomright" />
        
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
          const color = getPinColor(airport.cardRules.primary, airport.cardRules.critical, airport.cardRules.warning);
          const icon = createPinIcon(color, isSelected);

          return (
              <Marker 
                  key={airport.id} 
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

        <MapUpdater selectedAirport={selectedAirport} />
      </MapContainer>
    </div>
  );
};

export default Map;
