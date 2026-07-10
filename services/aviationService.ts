
import { WeatherData, TFR, Airmet, WindAloftData, UserNote } from '../types';

// Base URL for Aviation Weather Center API (v2/Beta)
const AWC_API_BASE = 'https://aviationweather.gov/api/data';

// Google Apps Script Web App URL for Pilot Notes Backend
const PILOT_NOTES_API_URL = 'https://script.google.com/macros/s/AKfycbwI3lNi6N5QekHISz0GIqrimSkDgKNhGeoY3JI_3Jfj2W77lIZdlg9UpUEtD-aLBfhd/exec';

// Google Apps Script Web App URL for Fuel Map Data (FBO, Cards, Prices)
const FUEL_DATA_API_URL = 'https://script.google.com/macros/s/AKfycbwLYchReDkCKVkVdNs2G6RfXV8M2DmInbwsYtFnCRrdI-wiyAoTwGoeCdsZluMwJtK5/exec';

/**
 * Robust Fetcher that tries Direct connection first, then falls back to multiple Proxies.
 * Validates that the response is JSON if requireJson is true.
 */
export const fetchSafe = async (url: string, requireJson: boolean = false, skipCacheBuster: boolean = false): Promise<Response> => {
  // Add unique cache buster to URL directly to avoid Cache-Control headers which trigger Preflight
  const urlWithCb = skipCacheBuster ? url : (() => {
    const separator = url.includes('?') ? '&' : '?';
    const uniqueId = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    return `${url}${separator}_cb=${uniqueId}`;
  })();

  // Helper to validate response content
  const validate = async (res: Response, strategy: string): Promise<Response> => {
      if (!res.ok) throw new Error(`${strategy}: HTTP Error ${res.status}`);
      
      if (requireJson) {
          // Clone the response to read the body without consuming the original stream
          const clone = res.clone();
          try {
              const text = await clone.text();
              if (!text || !text.trim()) {
                  throw new Error(`${strategy}: Empty response body`);
              }
              // Fast fail if it looks like HTML (likely error page) instead of JSON
              if (text.trim().startsWith('<')) {
                  throw new Error(`${strategy}: Received HTML instead of JSON`);
              }
              JSON.parse(text); // Verify it parses
          } catch (e) {
              throw new Error(`${strategy}: Response is not valid JSON - ${(e as Error).message}`);
          }
      }
      return res;
  };

  // Strategy 1: Direct Fetch
  try {
      const response = await fetch(urlWithCb, {
          method: 'GET',
          credentials: 'omit', // Essential for 'Anyone' scripts to avoid cookie/auth redirects
          redirect: 'follow',
          mode: 'cors'
      });
      return await validate(response, 'Direct');
  } catch (directError) {
      // console.warn(`[AviationService] Direct fetch failed for ${url}`, directError);
  }

  // Strategy 2: AllOrigins RAW (Best for redirects)
  try {
      const encodedUrl = encodeURIComponent(urlWithCb);
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodedUrl}`;
      
      const response = await fetch(proxyUrl);
      return await validate(response, 'AllOriginsRaw');
  } catch (proxyError) {
      // console.warn(`[AviationService] AllOrigins RAW failed`, proxyError);
  }

  // Strategy 3: CodeTabs (Reliable alternative)
  try {
      const encodedUrl = encodeURIComponent(urlWithCb);
      const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodedUrl}`;
      
      const response = await fetch(proxyUrl);
      return await validate(response, 'CodeTabs');
  } catch (proxyError) {
     // console.warn(`[AviationService] CodeTabs failed`, proxyError);
  }

  // Strategy 4: CorsProxy.io
  try {
      const encodedUrl = encodeURIComponent(urlWithCb);
      // CorsProxy documentation: https://corsproxy.io/?https://...
      const proxyUrl = `https://corsproxy.io/?${encodedUrl}`;
      const response = await fetch(proxyUrl);
      return await validate(response, 'CorsProxy');
  } catch (proxyError) {
      // console.warn(`[AviationService] CorsProxy failed`, proxyError);
  }

  // Strategy 5: AllOrigins Wrapped (Fallback)
  try {
      const encodedUrl = encodeURIComponent(urlWithCb);
      const proxyUrl = `https://api.allorigins.win/get?url=${encodedUrl}`;
      
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error(`Proxy status ${response.status}`);
      
      const wrapper = await response.json();
      if (!wrapper || !wrapper.contents) throw new Error("Invalid AllOrigins response");
      
      const wrappedResponse = new Response(wrapper.contents, { 
          status: 200, 
          statusText: "OK",
          headers: { 'Content-Type': 'application/json' }
      });
      
      return await validate(wrappedResponse, 'AllOriginsWrapped');
  } catch (proxyError) {
      // console.warn(`[AviationService] AllOrigins Wrapped failed`, proxyError);
  }

  // If all fail
  throw new TypeError(`Failed to fetch ${url} after multiple attempts`); 
};

/**
 * Fetch live METAR and TAF data from AWC.
 */
export const fetchWeather = async (airportId: string): Promise<WeatherData> => {
  const now = new Date();
  
  try {
    const [metarRes, tafRes] = await Promise.allSettled([
      fetchSafe(`${AWC_API_BASE}/metar?ids=${airportId}&format=json`, true),
      fetchSafe(`${AWC_API_BASE}/taf?ids=${airportId}&format=json`, true)
    ]);

    let metarData: any[] = [];
    let tafData: any[] = [];
    
    if (metarRes.status === 'fulfilled') {
        try { metarData = await metarRes.value.json(); } catch(e) { console.warn('METAR JSON parse error', e); }
    }
    
    if (tafRes.status === 'fulfilled') {
        try { tafData = await tafRes.value.json(); } catch(e) { console.warn('TAF JSON parse error', e); }
    }

    let metarText = 'METAR NOT AVAILABLE';
    let tafText = 'TAF NOT AVAILABLE';
    let category: any = 'UNKNOWN';
    let obsTime: string | undefined;
    let wind: { direction: number; speed: number; gust: number; isVrb?: boolean } | undefined;
    
    let visibility: string | undefined;
    let clouds: { cover: string; base: number }[] | undefined;
    let temperature: number | undefined;
    let dewpoint: number | undefined;
    let altimeter: number | undefined;
    let elevation: number | undefined;

    if (metarData && Array.isArray(metarData) && metarData.length > 0) {
      const m = metarData[0];
      metarText = m.rawOb || 'METAR DATA ERROR';
      category = m.fltCat || 'UNKNOWN';
      obsTime = m.obsTime; 
      visibility = m.visib;
      clouds = m.clouds;
      temperature = m.temp;
      dewpoint = m.dewp;
      altimeter = m.altim;
      elevation = m.elev;

      if (m.wdir !== undefined && m.wspd !== undefined) {
         let dir = m.wdir;
         let isVrb = false;
         if (dir === 'VRB') {
             dir = 0;
             isVrb = true;
         }
         
         wind = {
             direction: typeof dir === 'number' ? dir : 0,
             speed: typeof m.wspd === 'number' ? m.wspd : 0,
             gust: typeof m.wgst === 'number' ? m.wgst : 0,
             isVrb: isVrb
         };
      }
    }

    if (tafData && Array.isArray(tafData) && tafData.length > 0) {
      tafText = tafData[0].rawTAF || 'TAF DATA ERROR';
    }

    return {
      metar: metarText,
      taf: tafText,
      flightCategory: category,
      observationTime: obsTime,
      wind: wind,
      visibility,
      clouds,
      temperature,
      dewpoint,
      altimeter,
      elevation,
      lastUpdated: now
    };

  } catch (error) {
    console.warn(`Failed to fetch weather for ${airportId}`, error);
    return {
      metar: 'Weather Service Unavailable',
      taf: 'Weather Service Unavailable',
      flightCategory: 'UNKNOWN',
      lastUpdated: now
    };
  }
};

/**
 * Fetch live METAR data for multiple airports at once.
 */
export const fetchAllWeather = async (airportIds: string[]): Promise<Record<string, WeatherData>> => {
  const now = new Date();
  const uniqueIds = Array.from(new Set(airportIds));
  
  const weatherMap: Record<string, WeatherData> = {};
  
  // Initialize with default values
  uniqueIds.forEach(id => {
      weatherMap[id] = {
          metar: 'METAR NOT AVAILABLE',
          taf: 'TAF NOT FETCHED',
          flightCategory: 'UNKNOWN',
          lastUpdated: now
      };
  });

  // Chunk the IDs to avoid URL length limits (especially with proxies)
  const chunkSize = 50;
  const chunks = [];
  for (let i = 0; i < uniqueIds.length; i += chunkSize) {
      chunks.push(uniqueIds.slice(i, i + chunkSize));
  }

  try {
    const promises = chunks.map(async (chunk) => {
        const idsParam = chunk.join(',');
        try {
            const [metarResponse, tafResponse] = await Promise.all([
                fetchSafe(`${AWC_API_BASE}/metar?ids=${idsParam}&format=json`, true),
                fetchSafe(`${AWC_API_BASE}/taf?ids=${idsParam}&format=json`, true)
            ]);
            
            const metarData = await metarResponse.json().catch(() => []);
            const tafData = await tafResponse.json().catch(() => []);
            
            return {
                metar: Array.isArray(metarData) ? metarData : [],
                taf: Array.isArray(tafData) ? tafData : []
            };
        } catch (e) {
            console.warn(`Failed to fetch chunk: ${idsParam}`, e);
            return { metar: [], taf: [] };
        }
    });

    const results = await Promise.all(promises);
    const metarData = results.flatMap(r => r.metar);
    const tafData = results.flatMap(r => r.taf);
    
    // Create map for TAFs
    const tafMap: Record<string, any> = {};
    if (tafData && Array.isArray(tafData)) {
        tafData.forEach(t => {
            const id = t.icaoId || t.stationId || t.station_id || t.id;
            if (id && t.rawTAF) {
                tafMap[id] = t.rawTAF;
            }
        });
    }

    if (metarData && Array.isArray(metarData)) {
      metarData.forEach(m => {
        const id = m.icaoId || m.stationId || m.station_id || m.id;
        if (!id) return;

        let wind: { direction: number; speed: number; gust: number; isVrb?: boolean } | undefined;
        if (m.wdir !== undefined && m.wspd !== undefined) {
           let dir = m.wdir;
           let isVrb = false;
           if (dir === 'VRB') {
               dir = 0;
               isVrb = true;
           }
           
           wind = {
               direction: typeof dir === 'number' ? dir : 0,
               speed: typeof m.wspd === 'number' ? m.wspd : 0,
               gust: typeof m.wgst === 'number' ? m.wgst : 0,
               isVrb: isVrb
           };
        }

        weatherMap[id] = {
          metar: m.rawOb || 'METAR DATA ERROR',
          taf: tafMap[id] || 'TAF NOT AVAILABLE',
          flightCategory: m.fltCat || 'UNKNOWN',
          observationTime: m.obsTime,
          wind: wind,
          visibility: m.visib,
          clouds: m.clouds,
          temperature: m.temp,
          dewpoint: m.dewp,
          altimeter: m.altim,
          elevation: m.elev,
          lastUpdated: now
        };
      });
      console.log("Parsed Weather Map:", weatherMap);
    }

    return weatherMap;
  } catch (error) {
    console.warn(`Failed to fetch weather for multiple airports`, error);
    return weatherMap;
  }
};

/**
 * Fetch live G-AIRMETs.
 */
export const fetchAirmets = async (): Promise<Airmet[]> => {
  try {
    const bbox = '-115,35,-108,43';
    const response = await fetchSafe(`${AWC_API_BASE}/gairmet?bbox=${bbox}&format=geojson`, true);
    
    let geoJson;
    try {
        geoJson = await response.json();
    } catch (e) {
        return [];
    }
    
    if (!geoJson || !geoJson.features) {
        return [];
    }

    const airmets = geoJson.features.map((feature: any) => {
      const props = feature.properties || {};
      let coordinates: [number, number][] = [];
      
      if (feature.geometry.type === 'Polygon') {
         coordinates = feature.geometry.coordinates[0].map((pt: number[]) => [pt[1], pt[0]]);
      } else if (feature.geometry.type === 'MultiPolygon') {
         if(feature.geometry.coordinates[0]) {
             coordinates = feature.geometry.coordinates[0][0].map((pt: number[]) => [pt[1], pt[0]]);
         }
      }

      let type = 'UNKNOWN';
      const hazard = (props.hazard || '').toUpperCase();

      if (['IFR', 'MT_OBSC', 'MT OBSC'].some(h => hazard.includes(h))) {
        type = 'SIERRA';
      } else if (['TURB', 'WND', 'LLWS', 'SFC_WND'].some(h => hazard.includes(h))) {
        type = 'TANGO';
      } else if (['ICE', 'FZLVL', 'ICING'].some(h => hazard.includes(h))) {
        type = 'ZULU';
      }

      return {
        id: props.airmetId || `AIRMET-${Math.random().toString(36).substr(2, 9)}`,
        type: type as any,
        hazard: props.hazard || 'HAZARD',
        minAlt: props.base || 'SFC',
        maxAlt: props.top || 'FL180',
        validTime: props.validTimeFrom ? `${new Date(props.validTimeFrom).getUTCHours()}Z - ${new Date(props.validTimeTo).getUTCHours()}Z` : 'VALID',
        coordinates: coordinates
      };
    });

    return airmets;

  } catch (error) {
    console.warn("Could not fetch AIRMETs.", error);
    return [];
  }
};

/**
 * Live Winds Aloft Fetching
 */
export const fetchWindsAloft = async (altitude: number, forecastHour: string = '06'): Promise<WindAloftData[]> => {
  try {
    const levelParam = altitude > 24000 ? 'high' : 'low';
    const url = `${AWC_API_BASE}/windtemp?region=slc&level=${levelParam}&fcst=${forecastHour}&format=geojson`;
    
    const response = await fetchSafe(url, true);
    const geoJson = await response.json();

    if (!geoJson || !geoJson.features) throw new Error("Invalid GeoJSON for Winds Aloft");

    const windData: WindAloftData[] = [];

    geoJson.features.forEach((feature: any) => {
        const props = feature.properties;
        const coords = feature.geometry?.coordinates; 

        if (!props || !coords) return;

        let lvl = Number(props.level);
        if (lvl < 400) lvl *= 100;
        
        if (Math.abs(lvl - altitude) < 500) {
            windData.push({
                stationId: props.station || 'WIND',
                lat: coords[1],
                lon: coords[0],
                direction: props.windDir || 0,
                speed: props.windSpeed || 0,
                temp: props.temp,
                altitude: lvl
            });
        }
    });
    
    return windData;

  } catch (error) {
    console.warn("[AviationService] Failed to fetch winds aloft.", error);
    return [];
  }
};

/**
 * --- LIVE FUEL DATA SERVICE ---
 */

export interface LiveFuelData {
    id: string; // ICAO
    fbo?: string;
    card?: string; 
    note?: string; 
    contact?: string;
    fueltype?: string;
}

export const fetchFuelMapData = async (): Promise<LiveFuelData[]> => {
    try {
        const response = await fetchSafe(FUEL_DATA_API_URL, true);
        const data = await response.json();
        
        if (Array.isArray(data)) {
            return data.map((item: any) => ({
                id: String(item.airportcode || item.id || item.airport || '').toUpperCase(),
                fbo: item.fboprovider || item.fbo,
                card: item.cardtype || item.card,
                note: item.note,
                contact: item.contact,
                fueltype: item.fueltype || item.fuel
            }));
        }
        return [];
    } catch (error) {
        // Silently fail and fallback to static data if the live sheet is unavailable
        return [];
    }
};

/**
 * Fetch Station Info (Lat/Lon) for new airports not in the static database
 */
export const fetchStationInfo = async (airportId: string) => {
    try {
        const response = await fetchSafe(`${AWC_API_BASE}/stationinfo?ids=${airportId}&format=json`, true);
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
            const station = data[0];
            // Try to extract city from name (e.g., "Cedar City Regional Airport" -> "Cedar City")
            let city = station.site || station.name || airportId;
            if (city.includes(' Airport')) city = city.replace(' Airport', '');
            if (city.includes(' Regional')) city = city.replace(' Regional', '');
            if (city.includes(' Municipal')) city = city.replace(' Municipal', '');
            if (city.includes(' International')) city = city.replace(' International', '');
            if (city.includes(' Intl')) city = city.replace(' Intl', '');
            
            return {
                name: station.site || station.name || airportId,
                lat: station.lat,
                lon: station.lon,
                state: station.state || 'Unknown',
                city: city.trim()
            };
        }
    } catch (error) {
        console.warn(`[AviationService] Failed to fetch station info for ${airportId}`, error);
    }
    return null;
};

/**
 * --- PILOT NOTES API SERVICES ---
 */

// Flexible interface to handle whatever keys the Google Sheet/Script returns
interface RawApiNote {
    [key: string]: any;
}

/**
 * Fetch Pilot Notes from Google Sheets
 * If airportId is not provided, tries to fetch all notes (backend dependent).
 */
export const fetchPilotNotes = async (airportId?: string): Promise<UserNote[]> => {
    try {
        // If airportId is provided, filter by it. If not, request all.
        const url = airportId 
            ? `${PILOT_NOTES_API_URL}?airportId=${airportId}` 
            : `${PILOT_NOTES_API_URL}`; 

        const response = await fetchSafe(url, true);
        const rawData = await response.json();
        
        let data: RawApiNote[] = [];
        if (Array.isArray(rawData) && rawData.length > 0) {
            if (Array.isArray(rawData[0])) {
                // It's a 2D array (Google Sheets raw format)
                const headers = rawData[0] as string[];
                data = rawData.slice(1).map((row: any[]) => {
                    const obj: RawApiNote = {};
                    headers.forEach((header, index) => {
                        obj[header] = row[index];
                    });
                    return obj;
                });
            } else {
                // It's already an array of objects
                data = rawData;
            }
        }
        
        const noteMap = new Map<string, UserNote>();
        const roots: UserNote[] = [];

        // Helper to perform case-insensitive key lookup
        const getVal = (obj: any, keys: string[]) => {
            if (!obj) return undefined;
            for (const key of keys) {
                if (obj[key] !== undefined && obj[key] !== "") return obj[key];
            }
            // Also try to find a key that lowercases to one of the keys
            const objKeys = Object.keys(obj);
            for (const key of keys) {
                const found = objKeys.find(k => k.toLowerCase() === key.toLowerCase());
                if (found && obj[found] !== undefined && obj[found] !== "") return obj[found];
            }
            return undefined;
        };

        // 1. Create UserNote objects with Robust Mapping
        data.forEach(apiNote => {
            const idVal = getVal(apiNote, ['id', 'ID', 'Id', 'noteId']) || `gen-${Math.random().toString(36)}`;
            const airportIdVal = getVal(apiNote, ['airportId', 'airport_id', 'Airport_ID', 'AirportId', 'airport']) || airportId;
            const contentVal = getVal(apiNote, ['content', 'text', 'Content', 'Text', 'message', 'Message']);
            const authorVal = getVal(apiNote, ['author', 'Author', 'user', 'User']) || 'Anonymous';
            const dateVal = getVal(apiNote, ['date', 'Date', 'timestamp', 'Timestamp', 'time']) || new Date().toISOString();
            const typeVal = getVal(apiNote, ['type', 'Type', 'category']) || 'general';
            
            // Format content
            const noteContent = String(contentVal || '');
            
            // Format Date safely
            let finalDate = dateVal;
            try {
                // If it's a Google Sheet date string like "2/18/2026 10:12:00", JS Date can usually parse it
                // but checking is good
                const parsed = new Date(dateVal);
                if (!isNaN(parsed.getTime())) {
                    finalDate = parsed.toISOString();
                } else {
                    // Fallback to now if invalid
                    finalDate = new Date().toISOString(); 
                }
            } catch (e) {
                finalDate = new Date().toISOString();
            }

            if (!noteContent.trim()) return; // Skip empty notes

            noteMap.set(String(idVal), {
                id: String(idVal),
                airportId: airportIdVal, 
                text: noteContent,
                author: String(authorVal),
                date: finalDate,
                type: (typeVal as any) || 'general',
                replies: []
            });
        });

        // 2. Link Parents
        data.forEach(apiNote => {
            const idVal = getVal(apiNote, ['id', 'ID', 'Id', 'noteId']);
            if (!idVal) return;
            
            const note = noteMap.get(String(idVal));
            if (!note) return;
            
            const rawParentId = getVal(apiNote, ['parentId', 'parent_id', 'Parent_ID', 'reply', 'Reply']);
            const parentId = rawParentId ? String(rawParentId).trim() : '';

            if (parentId !== '' && parentId !== 'null' && parentId !== 'undefined') {
                const parent = noteMap.get(parentId);
                if (parent) {
                    parent.replies = parent.replies || [];
                    parent.replies.push(note);
                } else {
                    // If parent not found (maybe filtered out or really a root note), treat as root
                    roots.push(note);
                }
            } else {
                roots.push(note);
            }
        });

        return roots;

    } catch (error) {
        console.error("[AviationService] Failed to fetch pilot notes:", error);
        return [];
    }
};

/**
 * Post a new Pilot Note/Reply to Google Sheets
 */
export const savePilotNote = async (note: UserNote, airportId: string, parentId?: string): Promise<boolean> => {
    const payload = {
        airportId: airportId,
        id: note.id,
        text: note.text,    
        content: note.text, 
        author: note.author,
        date: note.date,
        type: note.type || 'general',
        parentId: parentId || '',
        reply: parentId || '' 
    };

    // Strategy 1: Direct Fetch
    try {
        const response = await fetch(PILOT_NOTES_API_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                "Content-Type": "text/plain;charset=utf-8", 
            },
        });
        
        if (response.ok) {
            const text = await response.text();
            const result = JSON.parse(text);
            return result.status === 'success';
        }
    } catch (directError) {
        // Fallback to proxy if direct fetch fails (CORS error)
    }

    // Strategy 2: CorsProxy.io
    try {
        const encodedUrl = encodeURIComponent(PILOT_NOTES_API_URL);
        const proxyUrl = `https://corsproxy.io/?${encodedUrl}`;

        const response = await fetch(proxyUrl, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                "Content-Type": "text/plain;charset=utf-8", 
            },
        });

        if (response.ok) {
            const text = await response.text();
            try {
                const result = JSON.parse(text);
                return result.status === 'success';
            } catch (e) {
                console.warn("[AviationService] Failed to parse save response from proxy:", text.substring(0, 100));
                return false;
            }
        }
    } catch (error) {
        console.error("[AviationService] Failed to save pilot note via proxy:", error);
    }

    // Strategy 3: Direct Fetch with no-cors (blind send)
    try {
        await fetch(PILOT_NOTES_API_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(payload),
            headers: {
                "Content-Type": "text/plain;charset=utf-8", 
            },
        });
        // With no-cors, we can't read the response, so we just assume it worked
        // if the network request didn't throw an exception.
        return true;
    } catch (error) {
        console.error("[AviationService] Failed to save pilot note via no-cors:", error);
    }

    return false;
};

// Note: fetchAllNotamsWithGemini and fetchLiveFuelPricesWithGemini have been completely removed
// as they violated the instruction to NOT use AI for information fetching.


// URL for NIFC WFIGS Interagency Perimeters (Current)
const NIFC_WFIGS_PERIMETERS_URL = 'https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Interagency_Perimeters_Current/FeatureServer/0/query';

// URL for NIFC WFIGS Incident Locations (Current Point Locations)
const NIFC_WFIGS_LOCATIONS_URL = 'https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Incident_Locations_Current/FeatureServer/0/query';

/**
 * Fetch current active wildfires from NIFC Open Data API
 * Includes both mapping perimeters (polygons) and point locations (for newly discovered/small fires)
 * @returns GeoJSON FeatureCollection of fires
 */
export const fetchActiveWildfires = async (): Promise<any> => {
    try {
        // Build perimeters URL
        const perimetersUrl = new URL(NIFC_WFIGS_PERIMETERS_URL);
        perimetersUrl.searchParams.append('where', "1=1");
        perimetersUrl.searchParams.append('outFields', 'poly_IncidentName,poly_Acres_AutoCalc,PercentContained'); 
        perimetersUrl.searchParams.append('f', 'geojson');
        perimetersUrl.searchParams.append('returnGeometry', 'true');

        // Build point locations URL (where active)
        const locationsUrl = new URL(NIFC_WFIGS_LOCATIONS_URL);
        locationsUrl.searchParams.append('where', "ActiveFireCandidate=1");
        locationsUrl.searchParams.append('outFields', 'IncidentName,IncidentSize,PercentContained,FireDiscoveryDateTime,POOJurisdictionalUnit,POOState,POOCounty,IncidentTypeCategory,POOLandownerCategory,POOLandownerKind'); 
        locationsUrl.searchParams.append('outSR', '4326');
        locationsUrl.searchParams.append('f', 'geojson');
        locationsUrl.searchParams.append('returnGeometry', 'true');

        const [pResponse, lResponse] = await Promise.all([
            fetchSafe(perimetersUrl.toString(), true).catch(e => {
                console.error("Failed to fetch perimeters", e);
                return null;
            }),
            fetchSafe(locationsUrl.toString(), true).catch(e => {
                console.error("Failed to fetch locations", e);
                return null;
            })
        ]);

        let perimeterFeatures: any[] = [];
        let locationFeatures: any[] = [];

        if (pResponse && pResponse.ok) {
            const data = await pResponse.json();
            if (data && Array.isArray(data.features)) {
                perimeterFeatures = data.features;
            }
        }
        if (lResponse && lResponse.ok) {
            const data = await lResponse.json();
            if (data && Array.isArray(data.features)) {
                locationFeatures = data.features;
            }
        }

        // Combine features, normalizing properties
        const mergedFeatures = [
            ...perimeterFeatures.map(f => ({
                ...f,
                properties: {
                    ...f.properties,
                    isPoint: false,
                    IncidentName: f.properties.poly_IncidentName || 'Unnamed Fire',
                    IncidentSize: f.properties.poly_Acres_AutoCalc || 0,
                    PercentContained: f.properties.PercentContained !== undefined ? f.properties.PercentContained : null
                }
            })),
            ...locationFeatures.map(f => ({
                ...f,
                properties: {
                    ...f.properties,
                    isPoint: true,
                    IncidentName: f.properties.IncidentName || f.properties.poly_IncidentName || 'Unnamed Fire',
                    IncidentSize: f.properties.IncidentSize || f.properties.DailyAcres || f.properties.poly_Acres_AutoCalc || 0,
                    PercentContained: f.properties.PercentContained !== undefined ? f.properties.PercentContained : null
                }
            }))
        ];

        return {
            type: "FeatureCollection",
            features: mergedFeatures
        };
    } catch (err) {
        console.error('Error fetching NIFC wildfires:', err);
        return { type: "FeatureCollection", features: [] };
    }
};

// Convert a center point [lng, lat] to a 3 nautical mile circular polygon
const getCircularPolygon = (lng: number, lat: number, radiusMeters = 5556, numPoints = 16) => {
    const coords: [number, number][] = [];
    const earthRadius = 6378137; // Earth's average radius in meters
    const latRad = lat * Math.PI / 180;
    const d_div_r = radiusMeters / earthRadius;

    for (let i = 0; i <= numPoints; i++) {
        const bearing = (i * 360 / numPoints) * Math.PI / 180;
        
        const destLatRad = Math.asin(
            Math.sin(latRad) * Math.cos(d_div_r) +
            Math.cos(latRad) * Math.sin(d_div_r) * Math.cos(bearing)
        );
        const destLngRad = (lng * Math.PI / 180) + Math.atan2(
            Math.sin(bearing) * Math.sin(d_div_r) * Math.cos(latRad),
            Math.cos(d_div_r) - Math.sin(latRad) * Math.sin(destLatRad)
        );
        
        const destLat = destLatRad * 180 / Math.PI;
        const destLng = destLngRad * 180 / Math.PI;
        coords.push([destLng, destLat]);
    }

    return {
        type: "Polygon",
        coordinates: [coords]
    };
};

/**
 * Fetch current Temporary Flight Restrictions (TFRs) from the official FAA ArcGIS REST API.
 * Combines multiple flight restriction layers (National Defense TFRs, Prohibited Areas, Stadium Airspace 3NM Circles, and UAS Flight Restrictions).
 * Uses only the official FAA ArcGIS API.
 * @returns GeoJSON Object of restriction areas
 */
export const fetchActiveTfrs = async (): Promise<any> => {
    const endpoints = {
        nda: 'https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/ArcGIS/rest/services/National_Defense_Airspace_TFR_Areas/FeatureServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson&returnGeometry=true',
        prohibited: 'https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/ArcGIS/rest/services/Prohibited_Areas/FeatureServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson&returnGeometry=true',
        stadiums: 'https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/ArcGIS/rest/services/Stadiums/FeatureServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson&returnGeometry=true',
        uas: 'https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/ArcGIS/rest/services/Part_Time_National_Security_UAS_Flight_Restrictions/FeatureServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson&returnGeometry=true'
    };

    const finalFeatures: any[] = [];

    try {
        const fetchPromises = Object.entries(endpoints).map(async ([key, url]) => {
            try {
                const response = await fetchSafe(url, true);
                if (!response.ok) {
                    throw new Error(`Failed to fetch ${key}: ${response.status} ${response.statusText}`);
                }
                const data: any = await response.json();
                return { key, data };
            } catch (err) {
                console.error(`Error querying ${key} layer:`, err);
                return { key, data: { type: 'FeatureCollection', features: [] } };
            }
        });

        const results = await Promise.all(fetchPromises);

        for (const { key, data } of results) {
            if (data && Array.isArray(data.features)) {
                for (const feature of data.features) {
                    const props = feature.properties || {};
                    
                    if (key === 'stadiums') {
                        const pCoords = feature.geometry?.coordinates;
                        if (pCoords && pCoords.length === 2) {
                            const lng = pCoords[0];
                            const lat = pCoords[1];
                            const polyGeo = getCircularPolygon(lng, lat, 5556, 16); // 3 NM radius circle
                            
                            finalFeatures.push({
                                type: "Feature",
                                geometry: polyGeo,
                                properties: {
                                    NOTAM: 'FDC NOTAM 9/5151',
                                    notam: 'FDC NOTAM 9/5151',
                                    NAME: `${props.NAME || 'Stadium'} Restriction`,
                                    TYPE: 'Stadium Restrict',
                                    LOCAL_TYPE: 'STADIUM_TFR',
                                    CITY: props.CITY,
                                    STATE: props.STATE,
                                    AMSL_LWR: 0,
                                    AMSL_UPR: 3000,
                                    TFR_DESC: `FDC NOTAM 9/5151 flight restriction: 3 nautical mile radius from the surface up to and including 3,000 feet AGL during major stadium sporting events.`
                                }
                            });
                        }
                    } else if (key === 'nda') {
                        finalFeatures.push({
                            type: "Feature",
                            geometry: feature.geometry,
                            properties: {
                                NOTAM: props.NOTAM_NUM || props.NOTAM || 'NDA TFR',
                                notam: props.NOTAM_NUM || props.NOTAM || 'NDA TFR',
                                NAME: props.NAME || 'National Defense TFR',
                                TYPE: 'National Defense',
                                LOCAL_TYPE: 'NDA_TFR',
                                CITY: props.CITY,
                                STATE: props.STATE,
                                AMSL_LWR: props.AMSL_LWR !== undefined ? props.AMSL_LWR : 0,
                                AMSL_UPR: props.AMSL_UPR !== undefined ? props.AMSL_UPR : 'Unlimited',
                                TFR_DESC: props.WKHR_RMK || props.REMARKS || 'National Security / Airspace Restricted'
                            }
                        });
                    } else if (key === 'prohibited') {
                        finalFeatures.push({
                            type: "Feature",
                            geometry: feature.geometry,
                            properties: {
                                NOTAM: props.NAME || 'Prohibited Area',
                                notam: props.NAME || 'Prohibited Area',
                                NAME: `Prohibited Area ${props.NAME || ''}`,
                                TYPE: 'Prohibited Area',
                                LOCAL_TYPE: 'PROHIBITED',
                                CITY: props.CITY,
                                STATE: props.STATE,
                                AMSL_LWR: props.LOWER_VAL !== undefined ? props.LOWER_VAL : 0,
                                AMSL_UPR: props.UPPER_VAL !== undefined ? props.UPPER_VAL : 'Unlimited',
                                TFR_DESC: `Permanent Prohibited Airspace (${props.NAME || ''}). Times of Use: ${props.TIMESOFUSE || 'Continuous'}. Remarks: ${props.REMARKS || 'Flight is completely prohibited.'}`
                            }
                        });
                    } else if (key === 'uas') {
                        finalFeatures.push({
                            type: "Feature",
                            geometry: feature.geometry,
                            properties: {
                                NOTAM: props.FAA_ID || 'UAS Restriction',
                                notam: props.FAA_ID || 'UAS Restriction',
                                NAME: props.Base || props.Facility || 'UAS Flight Restriction',
                                TYPE: 'UAS Restriction',
                                LOCAL_TYPE: 'UAS_TFR',
                                CITY: props.County,
                                STATE: props.State,
                                AMSL_LWR: props.Floor !== undefined ? props.Floor : 0,
                                AMSL_UPR: props.Ceiling !== undefined ? props.Ceiling : 400,
                                TFR_DESC: `UAS Flight Restriction: ${props.Reason || 'National Security'}. Active hours: ${props.ALERTYPE || 'Intermittent'}`
                            }
                        });
                    }
                }
            }
        }
    } catch (err) {
        console.error('Error fetching combined FAA restrictions:', err);
    }

    return {
        type: 'FeatureCollection',
        features: finalFeatures
    };
};

