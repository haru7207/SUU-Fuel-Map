import React, { useState } from 'react';
import { LocateFixed, RefreshCw, AlertCircle, X, ChevronDown, Check } from 'lucide-react';
import { fetchSafe } from '../services/aviationService';

export interface TrackedAircraft {
  icao24: string;
  callsign: string;
  originCountry: string;
  timePosition: number;
  lastContact: number;
  longitude: number;
  latitude: number;
  baroAltitude: number;
  onGround: boolean;
  velocity: number; // m/s to kts conversion needed
  trueTrack: number;
  verticalRate: number;
  geoAltitude: number;
  squawk: string;
  spi: boolean;
  positionSource: number;
  // Custom added fields
  tailNumber: string;
  aircraftType: string;
}

// 1. Fleet Lookup Dictionary
export const fleetDictionary: Record<string, { hex: string; type: string; category: string }> = {
  // Fixed Wing - Cirrus SR20
  'N11SU': { hex: 'A02517', type: 'Cirrus SR20', category: 'Fixed Wing' },
  'N14SU': { hex: 'A0AD22', type: 'Cirrus SR20', category: 'Fixed Wing' },
  'N15SU': { hex: 'A0B108', type: 'Cirrus SR20', category: 'Fixed Wing' },
  'N17SU': { hex: 'A116CE', type: 'Cirrus SR20', category: 'Fixed Wing' },
  'N19SU': { hex: 'A15EC8', type: 'Cirrus SR20', category: 'Fixed Wing' },
  'N21SU': { hex: 'A1BCCF', type: 'Cirrus SR20', category: 'Fixed Wing' },
  'N23SU': { hex: 'A213D5', type: 'Cirrus SR20', category: 'Fixed Wing' },
  'N32SU': { hex: 'A38CB6', type: 'Cirrus SR20', category: 'Fixed Wing' },
  'N33SU': { hex: 'A3A69C', type: 'Cirrus SR20', category: 'Fixed Wing' },
  'N97SU': { hex: 'ADE2B8', type: 'Cirrus SR20', category: 'Fixed Wing' },
  'N34SU': { hex: 'A3C137', type: 'Cirrus SR21', category: 'Fixed Wing' },
  // Fixed Wing - Citabria
  'N118SU': { hex: 'A05FE7', type: 'Citabria', category: 'Fixed Wing' },
  'N119SU': { hex: 'A0639E', type: 'Citabria', category: 'Fixed Wing' },
  // Fixed Wing - Baron B55
  'N229RB': { hex: 'A20601', type: 'Baron B55', category: 'Fixed Wing' },

  // Rotor Wing - R44 Raven II
  'N101SU': { hex: 'A0108A', type: 'R44 Raven II', category: 'Rotor Wing' },
  'N123SU': { hex: 'A06D37', type: 'R44 Raven II', category: 'Rotor Wing' },
  'N144BV': { hex: 'A0ADDC', type: 'R44 Raven II', category: 'Rotor Wing' },
  'N161SU': { hex: 'A10385', type: 'R44 Raven II', category: 'Rotor Wing' },
  'N162SU': { hex: 'A1073C', type: 'R44 Raven II', category: 'Rotor Wing' },
  'N163SU': { hex: 'A10AF3', type: 'R44 Raven II', category: 'Rotor Wing' },
  'N164SU': { hex: 'A10EAA', type: 'R44 Raven II', category: 'Rotor Wing' },
  'N166SU': { hex: 'A11618', type: 'R44 Raven II', category: 'Rotor Wing' },
  'N169SU': { hex: 'A1213D', type: 'R44 Raven II', category: 'Rotor Wing' },
  'N197SU': { hex: 'A1898D', type: 'R44 Raven II', category: 'Rotor Wing' },
  'N397SU': { hex: 'A4A1C0', type: 'R44 Raven II', category: 'Rotor Wing' },
  'N442HH': { hex: 'A551EA', type: 'R44 Raven II', category: 'Rotor Wing' },
  'N4499': { hex: 'A56F6D', type: 'R44 Raven II', category: 'Rotor Wing' },
  'N637LN': { hex: 'A85871', type: 'R44 Raven II', category: 'Rotor Wing' },
  'N697SU': { hex: 'A94DE1', type: 'R44 Raven II', category: 'Rotor Wing' },
  'N74369': { hex: 'A9E219', type: 'R44 Raven II', category: 'Rotor Wing' },
  'N897SU': { hex: 'AC50EC', type: 'R44 Raven II', category: 'Rotor Wing' },
  'N997SU': { hex: 'AE6D8C', type: 'R44 Raven II', category: 'Rotor Wing' },

  // Rotor Wing - Bell 206L4
  'N202MH': { hex: 'A196CC', type: 'Bell 206L4', category: 'Rotor Wing' },
  'N917SU': { hex: 'ACCD37', type: 'Bell 206L4', category: 'Rotor Wing' },
  
  // Rotor Wing - Bell 407
  'N165SP': { hex: 'A11261', type: 'Bell 407', category: 'Rotor Wing' },
  
  // Rotor Wing - Bell 505
  'N505SU': { hex: 'A641A1', type: 'Bell 505', category: 'Rotor Wing' },
};

interface LiveFleetTrackerProps {
  isOpen: boolean;
  onClose: () => void;
  onTrackFlight: (aircraftData: TrackedAircraft) => void;
}

const LiveFleetTracker: React.FC<LiveFleetTrackerProps> = ({ isOpen, onClose, onTrackFlight }) => {
  const [selectedTail, setSelectedTail] = useState<string>('');
  const [isFetching, setIsFetching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const fixedWingTails = Object.keys(fleetDictionary).filter(k => fleetDictionary[k].category === 'Fixed Wing').sort();
  const rotorWingTails = Object.keys(fleetDictionary).filter(k => fleetDictionary[k].category === 'Rotor Wing').sort();

  const handleFetchData = async () => {
    if (!selectedTail) return;
    setIsFetching(true);
    setErrorMsg(null);

    const hexCode = fleetDictionary[selectedTail].hex.toLowerCase(); 

    try {
      const response = await fetchSafe(`https://opensky-network.org/api/states/all?icao24=${hexCode}`, true, true);
      const data = await response.json();

      if (!data || !data.states || data.states.length === 0) {
        // No data means aircraft is offline or out of ADS-B coverage
        setErrorMsg('Aircraft is currently offline or out of ADS-B coverage.');
        setIsFetching(false);
        return;
      }

      const state = data.states[0];
      
      const aircraftData: TrackedAircraft = {
        icao24: state[0],
        callsign: state[1] ? state[1].trim() : '',
        originCountry: state[2],
        timePosition: state[3],
        lastContact: state[4],
        longitude: state[5], // Decimal degrees
        latitude: state[6],  // Decimal degrees
        baroAltitude: state[7] !== null ? state[7] * 3.28084 : 0, // meters to feet
        onGround: state[8],
        velocity: state[9] !== null ? state[9] * 1.94384 : 0, // m/s to kts
        trueTrack: state[10], // Decimal degrees
        verticalRate: state[11] !== null ? state[11] * 196.85 : 0, // m/s to ft/min
        geoAltitude: state[13] !== null ? state[13] * 3.28084 : 0,
        squawk: state[14],
        spi: state[15],
        positionSource: state[16],
        tailNumber: selectedTail,
        aircraftType: fleetDictionary[selectedTail].type
      };

      if (aircraftData.latitude === null || aircraftData.longitude === null) {
          setErrorMsg('Aircraft found, but location data is not available.');
          setIsFetching(false);
          return;
      }

      // Success! Pass data up to Map to trigger pan/fly and show marker
      onTrackFlight(aircraftData);
      
    } catch (err: any) {
      console.error('Error fetching live aircraft location:', err);
      setErrorMsg(err.message || 'An error occurred fetching aircraft data.');
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <div className="absolute inset-x-0 bottom-0 top-[60px] md:top-0 md:relative md:w-[480px] bg-white dark:bg-slate-800 flex flex-col md:border-l md:border-slate-200 dark:md:border-slate-700 shadow-2xl z-50 h-[calc(100vh-60px)] md:h-screen">
      <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 dark:bg-emerald-900/40 p-2 rounded-lg text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
            <LocateFixed size={20} />
          </div>
          <div>
            <div className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">Live Fleet Tracker</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Real-time ADS-B location via OpenSky</div>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300 p-2 rounded-full transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="space-y-6">
          <div className="space-y-1">
            <label htmlFor="fleet-selector" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Locate Aircraft</label>
            <div className="relative">
              <select
                id="fleet-selector"
                value={selectedTail}
                onChange={(e) => setSelectedTail(e.target.value)}
                className="w-full appearance-none bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm font-semibold rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
              >
                <option value="" disabled>Select an aircraft (N-Number)</option>
                <optgroup label="Fixed Wing">
                  {fixedWingTails.map(tail => (
                    <option key={tail} value={tail}>{tail} - {fleetDictionary[tail].type}</option>
                  ))}
                </optgroup>
                <optgroup label="Rotor Wing">
                  {rotorWingTails.map(tail => (
                    <option key={tail} value={tail}>{tail} - {fleetDictionary[tail].type}</option>
                  ))}
                </optgroup>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                 <ChevronDown size={16} />
              </div>
            </div>
          </div>

          <button
            onClick={handleFetchData}
            disabled={!selectedTail || isFetching}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 font-bold rounded-lg transition-all shadow-md active:scale-95 text-white ${!selectedTail || isFetching ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed opacity-70' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'}`}
          >
            {isFetching ? <RefreshCw className="animate-spin" size={18} /> : <LocateFixed size={18} />}
            <span>{isFetching ? 'Locating...' : 'Find Aircraft'}</span>
          </button>

          {errorMsg && (
            <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 p-3.5 rounded-lg flex gap-3 shadow-sm animate-in fade-in zoom-in-95 duration-200">
              <AlertCircle className="shrink-0 mt-0.5" size={18} />
              <div className="text-sm font-medium leading-relaxed">{errorMsg}</div>
            </div>
          )}

          <div className="mt-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm text-sm">
             <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-1 rounded">ℹ️</span> System Notice
             </h3>
             <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
               Aircraft data is powered by the OpenSky Network. To conserve bandwidth and rate limits, location data is <strong>not auto-polled</strong>. Click the "Find Aircraft" button to fetch the latest location manually.
             </p>
             <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
               If an aircraft is turned off, parked inside a hangar, or out of ADS-B ground station range, it will not appear on the network.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveFleetTracker;
