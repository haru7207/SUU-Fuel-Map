export interface PracticeShape {
  id: string;
  name: string;
  type: 'polygon' | 'point';
  coordinates: any; 
  color: string;
  fillColor?: string;
  fillOpacity?: number;
}

export const PRACTICE_AREAS: PracticeShape[] = [
  // --- Polygons ---
  {
    id: 'west-practice-area',
    name: 'West Practice Area',
    type: 'polygon',
    color: '#ef4444', // Red-500
    fillColor: '#ef4444',
    fillOpacity: 0.2,
    coordinates: [
      [37.845, -113.140], // NE Corner (Near Pig Farms)
      [37.830, -113.250],
      [37.780, -113.400], // NW (Near Sun Valley)
      [37.620, -113.400], // SW
      [37.610, -113.150], // SE (Near Quichapa)
      [37.680, -113.120], // KCDC Western Boundary
      [37.750, -113.130], // Return North
    ]
  },
  {
    id: 'instrument-work-area',
    name: 'Instrument Work Area',
    type: 'polygon',
    color: '#475569', // Slate-600
    fillColor: '#1e293b',
    fillOpacity: 0.3,
    coordinates: [
      [37.880, -113.050], // NW (East of I-15)
      [37.880, -112.850], // NE (Mountains)
      [37.600, -112.850], // SE
      [37.600, -113.050], // SW
    ]
  },
  
  // --- Points (Red Diamonds in screenshot - Practice Points) ---
  { id: 'p-quichapa', name: 'Quichapa', type: 'point', coordinates: [37.63, -113.14], color: '#ef4444' },
  { id: 'p-wecco', name: 'Wecco', type: 'point', coordinates: [37.72, -113.35], color: '#ef4444' },
  { id: 'p-frog', name: 'Frog', type: 'point', coordinates: [37.76, -113.38], color: '#ef4444' },
  { id: 'p-sunvalley', name: 'Sun Valley', type: 'point', coordinates: [37.79, -113.42], color: '#ef4444' },
  { id: 'p-pigfarms', name: 'Pig Farms', type: 'point', coordinates: [37.82, -113.12], color: '#ef4444' },

  // --- Points (Blue Pins in screenshot - Landmarks/Visuals) ---
  { id: 'p-kcdc-pattern', name: 'KCDC Pattern', type: 'point', coordinates: [37.7009, -113.0988], color: '#3b82f6' },
  { id: 'p-2000', name: '2000 Flushes', type: 'point', coordinates: [37.62, -113.25], color: '#3b82f6' },
  { id: 'p-threepeaks', name: 'Three Peaks', type: 'point', coordinates: [37.76, -113.18], color: '#3b82f6' },
  { id: 'p-dirtstrip', name: 'Dirt Strip', type: 'point', coordinates: [37.60, -113.30], color: '#3b82f6' },

  // --- Points (Yellow - Remote) ---
  { id: 'p-milford', name: 'Milford', type: 'point', coordinates: [38.39, -113.01], color: '#eab308' },
];