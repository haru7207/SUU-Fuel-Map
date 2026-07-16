import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface WeatherDB extends DBSchema {
  weather: {
    key: string; // airportId
    value: {
      airportId: string;
      metarData: any[];
      tafData: any[];
      lastUpdated: string;
    };
  };
}

const DB_NAME = 'aviation-weather-db';
const DB_VERSION = 1;
const STORE_NAME = 'weather';

let dbPromise: Promise<IDBPDatabase<WeatherDB>> | null = null;

const getDB = () => {
  if (typeof window === 'undefined') return null; // Only run on client
  if (!dbPromise) {
    dbPromise = openDB<WeatherDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'airportId' });
        }
      },
    });
  }
  return dbPromise;
};

export const getCachedWeatherFromIDB = async (airportId: string) => {
  try {
    const db = await getDB();
    if (!db) return null;
    return await db.get(STORE_NAME, airportId);
  } catch (error) {
    console.error('Failed to get weather from IndexedDB:', error);
    return null;
  }
};

export const getMultipleCachedWeatherFromIDB = async (airportIds: string[]) => {
  try {
    const db = await getDB();
    if (!db) return [];
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const results = await Promise.all(airportIds.map(id => store.get(id)));
    return results.filter(Boolean); // Filter out undefined
  } catch (error) {
    console.error('Failed to get multiple weather from IndexedDB:', error);
    return [];
  }
};

export const setCachedWeatherToIDB = async (airportId: string, metarData: any[], tafData: any[]) => {
  try {
    const db = await getDB();
    if (!db) return;
    await db.put(STORE_NAME, {
      airportId,
      metarData,
      tafData,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to set weather to IndexedDB:', error);
  }
};
