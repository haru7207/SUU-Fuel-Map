
// Base URL for TFRs (SIGMET/AIRMET/TFR endpoint) from AviationWeather.gov
const TFR_API_URL = 'https://aviationweather.gov/api/data/isigmet?format=geojson&type=tfr';

/**
 * Fetch Real-Time TFRs in GeoJSON format.
 * Uses direct CORS fetch to AviationWeather.gov.
 */
export const fetchRealTimeTFRs = async (): Promise<any | null> => {
  // 1. Offline Check
  if (!navigator.onLine) {
    console.warn('[TfrService] Offline: Cannot fetch TFRs.');
    return null;
  }

  try {
    // 2. Direct Fetch with CORS headers
    // Note: AWC API v2 generally supports CORS. 
    // We add a cache-buster to ensure fresh data.
    const urlWithCb = `${TFR_API_URL}&_cb=${Date.now()}`;
    
    const response = await fetch(urlWithCb, {
        method: 'GET',
        mode: 'cors',
        headers: {
            'Accept': 'application/geo+json, application/json',
            // User-Agent is unsafe to set in browser-side fetch, omitting to prevent browser warnings
        }
    });

    if (!response.ok) {
        throw new Error(`TFR API Error: ${response.status} ${response.statusText}`);
    }

    // 3. Parse and Validate
    const geoJson = await response.json();

    // Validate basic GeoJSON structure
    if (geoJson && (geoJson.type === 'FeatureCollection' || Array.isArray(geoJson.features))) {
        return geoJson;
    } else {
        // Sometimes APIs return empty arrays or different structures on no-data
        if (Array.isArray(geoJson) && geoJson.length === 0) {
            return { type: 'FeatureCollection', features: [] };
        }
        throw new Error('Invalid GeoJSON format received');
    }

  } catch (error) {
    console.warn('[TfrService] Failed to fetch TFRs:', error);
    
    // Check if it's likely a CORS error (browser hides details, but often type is TypeError)
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.warn('CORS blocked. Suggesting a local proxy or serverless function for production environment if direct access is restricted.');
    }

    return null; // Return null so the UI can handle the error state
  }
};
