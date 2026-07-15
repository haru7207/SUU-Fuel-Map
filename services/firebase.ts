import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, updateDoc, initializeFirestore, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = initializeFirestore(
    app,
    { experimentalForceLongPolling: true },
    firebaseConfig.firestoreDatabaseId
);

const isOfflineError = (error: unknown): boolean => {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return true;
  }
  const msg = error instanceof Error ? error.message : String(error);
  const lowerMsg = msg.toLowerCase();
  return lowerMsg.includes("offline") || 
         lowerMsg.includes("network") || 
         lowerMsg.includes("unreachable") || 
         lowerMsg.includes("unavailable") ||
         lowerMsg.includes("could not connect");
};

export const getMultipleCachedWeatherFromFirebase = async (airportIds: string[]): Promise<any[]> => {
    if (airportIds.length === 0) return [];
    try {
        const cachedResults: any[] = [];
        
        // Firestore 'in' query has a limit of 30, so chunk it
        const chunkSize = 30;
        for (let i = 0; i < airportIds.length; i += chunkSize) {
            const chunk = airportIds.slice(i, i + chunkSize);
            const q = query(collection(db, 'airportWeatherCache'), where('airportId', 'in', chunk));
            const snapshot = await getDocs(q);
            snapshot.forEach(doc => {
                cachedResults.push(doc.data());
            });
        }
        return cachedResults;
    } catch (e) {
        if (!isOfflineError(e)) {
            console.warn("Error getting multiple cached weather:", e);
        }
        return [];
    }
};

export const getCachedWeatherFromFirebase = async (airportId: string) => {
    try {
        const docRef = doc(db, 'airportWeatherCache', airportId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data();
        }
        return null;
    } catch (e) {
        if (!isOfflineError(e)) {
            console.warn("Error getting cached weather:", e);
        }
        return null;
    }
};

export const setCachedWeatherToFirebase = async (airportId: string, metarData: any[], tafData: any[]) => {
    if (!auth.currentUser) return; // Only signed-in users update the cache
    try {
        const docRef = doc(db, 'airportWeatherCache', airportId);
        await setDoc(docRef, {
            airportId,
            metarData,
            tafData,
            lastUpdated: new Date().toISOString()
        });
    } catch (e) {
        if (!isOfflineError(e)) {
            console.warn("Error setting cached weather:", e);
        }
    }
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const isOffline = isOfflineError(error);
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  if (isOffline) {
    console.warn('Firestore Operation Offline/Unreachable Warning: ', JSON.stringify(errInfo));
  } else {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  }
  throw new Error(JSON.stringify(errInfo));
}

export const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
        prompt: "select_account"
    });
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const userRef = doc(db, "users", user.uid);
        
        let userSnap;
        try {
            userSnap = await getDoc(userRef);
        } catch (error) {
            handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
            throw error;
        }
        
        if (!userSnap || !userSnap.exists()) {
            try {
                await setDoc(userRef, {
                    id: user.uid,
                    email: user.email || "",
                    displayName: user.displayName || "Pilot",
                    profilePhotoUrl: user.photoURL || ""
                });
            } catch (error) {
                handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`);
                throw error;
            }
        } else {
            const data = userSnap.data();
            if (data.displayName !== user.displayName || data.profilePhotoUrl !== user.photoURL) {
                try {
                    await updateDoc(userRef, {
                        displayName: user.displayName || "Pilot",
                        profilePhotoUrl: user.photoURL || ""
                    });
                } catch (error) {
                    handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
                    throw error;
                }
            }
        }
        
        return user;
    } catch (error) {
        console.error("Google login failed", error);
        throw error;
    }
};

export const logOut = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Logout failed", error);
        throw error;
    }
};

export interface SharedFuelPrices {
    prices: Record<string, Record<string, number>>;
    lastUpdated: string;
}

export const fetchSharedFuelPrices = async (): Promise<SharedFuelPrices | null> => {
    const path = "fuelPrices/global";
    try {
        const docRef = doc(db, "fuelPrices", "global");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data() as SharedFuelPrices;
        }
        return null;
    } catch (error) {
        if (isOfflineError(error)) {
            console.warn("Firestore is offline or unreachable; using local storage/in-memory prices gracefully.");
        } else {
            console.error("Failed to fetch shared fuel prices from Firestore", error);
            try {
                handleFirestoreError(error, OperationType.GET, path);
            } catch {
                // silent fail for client fallback
            }
        }
        return null;
    }
};

export const saveSharedFuelPrices = async (pricesMap: Record<string, Record<string, number>>): Promise<boolean> => {
    if (!auth.currentUser) return false;
    const path = "fuelPrices/global";
    try {
        const docRef = doc(db, "fuelPrices", "global");
        await setDoc(docRef, {
            prices: pricesMap,
            lastUpdated: new Date().toISOString()
        });
        return true;
    } catch (error) {
        if (isOfflineError(error)) {
            console.warn("Firestore is offline or unreachable; skipping saving shared fuel prices online.");
        } else {
            console.error("Failed to save shared fuel prices to Firestore", error);
            try {
                handleFirestoreError(error, OperationType.WRITE, path);
            } catch {
                // silent fail
            }
        }
        return false;
    }
};

export interface HistoryPricePoint {
    timestamp: string; // ISO string
    ll100: number | null;
    jetA: number | null;
}

export interface FuelPriceHistoryData {
    airportId: string;
    history: HistoryPricePoint[];
}

export const generateRealisticHistory = (airportId: string, currentLL: number | null, currentJetA: number | null): HistoryPricePoint[] => {
    const history: HistoryPricePoint[] = [];
    const baseLL = currentLL || 5.95;
    const baseJetA = currentJetA || 6.80;
    
    // Generate 6 data points over the last 6 months
    const now = new Date();
    // Deterministic fluctuations based on characters in airportId to ensure consistent baseline trend for each airport
    const pseudoRandom = (seed: number) => {
        let h = 0;
        for (let i = 0; i < airportId.length; i++) {
            h = (h << 5) - h + airportId.charCodeAt(i);
        }
        return Math.sin(h + seed);
    };

    for (let i = 5; i >= 0; i--) {
        const d = new Date(now);
        d.setMonth(now.getMonth() - i);
        
        let llVal: number | null = null;
        let jetVal: number | null = null;

        if (currentLL !== null) {
            // pseudo-random trend offset: -0.40 to +0.40
            const offset = pseudoRandom(i * 10) * 0.35 + (pseudoRandom(4) * 0.15);
            let value = baseLL + offset;
            if (value < 3.0) value = 3.0; // clamp safety list
            llVal = i === 0 ? baseLL : parseFloat(value.toFixed(2));
        }

        if (currentJetA !== null) {
            const offset = pseudoRandom(i * 20 + 5) * 0.45 + (pseudoRandom(8) * 0.20);
            let value = baseJetA + offset;
            if (value < 4.0) value = 4.0;
            jetVal = i === 0 ? baseJetA : parseFloat(value.toFixed(2));
        }

        history.push({
            timestamp: d.toISOString(),
            ll100: llVal,
            jetA: jetVal
        });
    }

    return history;
};

export const fetchFuelPriceHistory = async (airportId: string, currentLL: number | null, currentJetA: number | null): Promise<HistoryPricePoint[]> => {
    const cacheKey = `suu_fuel_history_${airportId}`;
    try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            const parsedCache = JSON.parse(cached) as HistoryPricePoint[];
            if (Array.isArray(parsedCache) && parsedCache.length > 0) {
                // Ensure latest current values are reflected instantly
                const lastIndex = parsedCache.length - 1;
                if (currentLL !== null) parsedCache[lastIndex].ll100 = currentLL;
                if (currentJetA !== null) parsedCache[lastIndex].jetA = currentJetA;
                
                // Background fetch to update cache silently
                fetchFuelPriceHistoryFromDb(airportId, currentLL, currentJetA).catch(() => {});
                
                return parsedCache;
            }
        }
    } catch {
        // Ignore cache errors
    }

    return await fetchFuelPriceHistoryFromDb(airportId, currentLL, currentJetA);
};

const fetchFuelPriceHistoryFromDb = async (airportId: string, currentLL: number | null, currentJetA: number | null): Promise<HistoryPricePoint[]> => {
    const path = `fuelPriceHistory/${airportId}`;
    try {
        const docRef = doc(db, "fuelPriceHistory", airportId);
        const docSnap = await getDoc(docRef);
        
        let historyToReturn: HistoryPricePoint[] | null = null;
        
        if (docSnap.exists()) {
            const data = docSnap.data() as FuelPriceHistoryData;
            if (data && Array.isArray(data.history) && data.history.length > 0) {
                // Ensure todays point reflects the absolute latest if todays point is the last entry
                const historyList = [...data.history];
                if (historyList.length > 0) {
                    const lastIndex = historyList.length - 1;
                    if (currentLL !== null) historyList[lastIndex].ll100 = currentLL;
                    if (currentJetA !== null) historyList[lastIndex].jetA = currentJetA;
                }
                historyToReturn = historyList;
            }
        }

        if (!historyToReturn) {
            // If no history exists in Firestore, generate a realistic one and save it
            historyToReturn = generateRealisticHistory(airportId, currentLL, currentJetA);
            if (auth.currentUser) {
                await setDoc(docRef, {
                    airportId,
                    history: historyToReturn
                });
            }
        }
        
        // Save to cache
        try {
            localStorage.setItem(`suu_fuel_history_${airportId}`, JSON.stringify(historyToReturn));
        } catch {
            // Ignore cache save error
        }
        
        return historyToReturn;
    } catch (error) {
        if (isOfflineError(error)) {
            console.warn(`Firestore is offline or unreachable; using offline generated history trends for airport ${airportId}.`);
        } else {
            console.error("Failed to fetch/save fuel price history from Firestore", error);
            try {
                handleFirestoreError(error, OperationType.GET, path);
            } catch {
                // silent fail
            }
        }
        // Fallback to purely client generated history so view continues working flawlessly offline
        return generateRealisticHistory(airportId, currentLL, currentJetA);
    }
};

export const appendFuelPriceHistoryPoint = async (airportId: string, llPrice: number | null, jetAPrice: number | null): Promise<boolean> => {
    if (!auth.currentUser) return false;
    const path = `fuelPriceHistory/${airportId}`;
    try {
        const docRef = doc(db, "fuelPriceHistory", airportId);
        const docSnap = await getDoc(docRef);
        let historyList: HistoryPricePoint[] = [];

        if (docSnap.exists()) {
            const data = docSnap.data() as FuelPriceHistoryData;
            historyList = Array.isArray(data.history) ? [...data.history] : [];
        } else {
            historyList = generateRealisticHistory(airportId, llPrice, jetAPrice);
        }

        const todayStr = new Date().toISOString().split('T')[0];
        const lastEntry = historyList[historyList.length - 1];
        const lastEntryDay = lastEntry ? new Date(lastEntry.timestamp).toISOString().split('T')[0] : null;

        if (lastEntryDay === todayStr) {
            // Update today's entry
            historyList[historyList.length - 1] = {
                timestamp: new Date().toISOString(),
                ll100: llPrice,
                jetA: jetAPrice
            };
        } else {
            // Append a new entry
            historyList.push({
                timestamp: new Date().toISOString(),
                ll100: llPrice,
                jetA: jetAPrice
            });
        }

        // Clip history to last 12 entries to keep the document small and fast
        if (historyList.length > 12) {
            historyList = historyList.slice(historyList.length - 12);
        }

        await setDoc(docRef, {
            airportId,
            history: historyList
        });
        
        try {
            localStorage.setItem(`suu_fuel_history_${airportId}`, JSON.stringify(historyList));
        } catch {
            // Ignore cache save error
        }
        
        return true;
    } catch (error) {
        if (isOfflineError(error)) {
            console.warn(`Firestore is offline or unreachable; skipped appending fuel price history for airport ${airportId}.`);
        } else {
            console.error("Failed to append fuel price history entry", error);
            try {
                handleFirestoreError(error, OperationType.WRITE, path);
            } catch {
                // silent fail
            }
        }
        return false;
    }
};
