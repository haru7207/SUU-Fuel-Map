
export enum CardType {
  PCARD = 'PCard',
  AVFUEL = 'AVFuel (8615)',
  WHITE_CARD = 'White Card (Sphere One)',
  UNKNOWN = 'Unknown'
}

export enum FuelType {
  JETA = 'Jet A',
  JETA_PLUS = 'Jet A+',
  LL100 = '100LL'
}

export interface UserNote {
  id: string;
  airportId?: string; // Associated Airport ID
  text: string;
  date: string; // ISO string
  author: string;
  type?: 'discrepancy' | 'general' | 'tip' | 'urgent';
  replies?: UserNote[];
}

export interface Airport {
  id: string; // ICAO
  name: string;
  city: string;
  state: string;
  lat: number;
  lon: number;
  fbo: string;
  phone: string;
  fuelTypes: FuelType[];
  fuelPhones?: Record<string, string>; // Map of FuelType to specific phone number
  fuelPrices?: Record<string, number>; // Map of FuelType to price per gallon
  runways: string[]; // e.g. ["02/20", "08/26"]
  runwayLengths?: Record<string, number>; // Length in feet, mapped by runway ID "02/20"
  weatherSource?: string; // If this airport has no weather, use this airport's ID (e.g., 'KCDC' for '1L9')
  frequencies?: { name: string; freq: string }[];
  cardRules: {
    primary: CardType;
    notes: string;
    fuelingNotes?: string; // Specific operational notes for fueling (e.g. "Hose is short")
    warning?: boolean; // For high prices or strict restrictions
    critical?: boolean; // For DO NOT USE warnings
    byFuelType?: Partial<Record<FuelType, CardType>>; // Specific card rules per fuel type
  };
  userNotes?: UserNote[];
}

export interface WeatherData {
  metar: string;
  taf: string;
  flightCategory: 'VFR' | 'MVFR' | 'IFR' | 'LIFR' | 'UNKNOWN';
  observationTime?: string;
  wind?: {
    direction: number;
    speed: number;
    gust: number;
    isVrb?: boolean;
  };
  lastUpdated: Date;
}

export interface TFR {
  id: string;
  type: 'VIP' | 'FIRE' | 'STADIUM' | 'SECURITY';
  center: [number, number];
  radius: number; // meters
  minAlt: string;
  maxAlt: string;
  effective: string;
  expires: string;
  description: string;
}

export interface Airmet {
  id: string;
  type: 'SIERRA' | 'TANGO' | 'ZULU';
  hazard: string; // e.g. "IFR", "MTN OBSCN", "TURB-HI", "ICING"
  coordinates: [number, number][]; // Polygon points [lat, lon]
  minAlt?: string; // e.g. "SFC", "10000"
  maxAlt?: string; // e.g. "FL180", "12000"
  validTime: string;
}

export interface WindAloftData {
  stationId: string;
  lat: number;
  lon: number;
  direction: number;
  speed: number;
  temp?: number;
  altitude: number;
}
