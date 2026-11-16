import React, { useEffect, useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { fetchFuelPriceHistory, syncHistoryToToday, HistoryPricePoint } from '../services/firebase';
import { Airport } from '../types';
import { TrendingUp, TrendingDown, Minus, Loader2, Calendar, DollarSign, Activity, AlertCircle } from 'lucide-react';

interface FuelPriceTrendChartProps {
  airport: Airport;
}

export const FuelPriceTrendChart: React.FC<FuelPriceTrendChartProps> = ({ airport }) => {
  const currentLL = airport.fuelPrices?.['100LL'] || null;
  const currentJetA = airport.fuelPrices?.['Jet A'] || null;

  const getCachedHistory = (): HistoryPricePoint[] | null => {
    try {
      const cached = localStorage.getItem(`suu_fuel_history_${airport.id}`);
      if (cached) {
        const parsed = JSON.parse(cached) as HistoryPricePoint[];
        if (Array.isArray(parsed) && parsed.length > 0) {
           const synced = syncHistoryToToday(airport.id, parsed, currentLL, currentJetA);
           localStorage.setItem(`suu_fuel_history_${airport.id}`, JSON.stringify(synced));
           return synced;
        }
      }
    } catch {}
    return syncHistoryToToday(airport.id, null, currentLL, currentJetA);
  };

  const initialCached = getCachedHistory();

  const [history, setHistory] = useState<HistoryPricePoint[]>(initialCached || []);
  const [loading, setLoading] = useState<boolean>(!initialCached);
  const [error, setError] = useState<string | null>(null);
  const [selectedFuelType, setSelectedFuelType] = useState<'both' | 'll100' | 'jetA'>('both');

  useEffect(() => {
    let active = true;
    const loadHistory = async () => {
      if (!initialCached) {
        setLoading(true);
      }
      setError(null);
      try {
        const data = await fetchFuelPriceHistory(airport.id, currentLL, currentJetA);
        if (active) {
          setHistory(data);
        }
      } catch (err: any) {
        console.error("Error loading fuel price history for chart:", err);
        if (active && !initialCached) {
          setError("Could not load price trends database.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadHistory();
    return () => {
      active = false;
    };
  }, [airport.id, currentLL, currentJetA]);

  // Format historical price data for the chart display
  const chartData = useMemo(() => {
    return history.map(item => {
      const d = new Date(item.timestamp);
      const formattedDate = isNaN(d.getTime()) 
        ? 'Unknown' 
        : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      return {
        ...item,
        dateLabel: formattedDate,
        // Keep precise strings or nulls
        ll100Price: item.ll100 ? parseFloat(item.ll100.toFixed(2)) : null,
        jetAPrice: item.jetA ? parseFloat(item.jetA.toFixed(2)) : null,
      };
    });
  }, [history]);

  // Derive trends
  const trendAnalysis = useMemo(() => {
    if (history.length < 2) return null;

    // Filter points with valid avgas rates
    const avgasPoints = history.filter(h => h.ll100 !== null && h.ll100 !== undefined) as { timestamp: string, ll100: number }[];
    // Filter points with valid jet-a rates
    const jetAPoints = history.filter(h => h.jetA !== null && h.jetA !== undefined) as { timestamp: string, jetA: number }[];

    let avgasTrend = { start: 0, end: 0, diff: 0, percent: 0, direction: 'stable' as 'up' | 'down' | 'stable' };
    let jetATrend = { start: 0, end: 0, diff: 0, percent: 0, direction: 'stable' as 'up' | 'down' | 'stable' };

    if (avgasPoints.length >= 2) {
      const start = avgasPoints[0].ll100;
      const end = avgasPoints[avgasPoints.length - 1].ll100;
      const diff = end - start;
      const percent = start > 0 ? (diff / start) * 100 : 0;
      const direction = diff > 0.009 ? 'up' : diff < -0.009 ? 'down' : 'stable';
      avgasTrend = { start, end, diff, percent, direction };
    }

    if (jetAPoints.length >= 2) {
      const start = jetAPoints[0].jetA;
      const end = jetAPoints[jetAPoints.length - 1].jetA;
      const diff = end - start;
      const percent = start > 0 ? (diff / start) * 100 : 0;
      const direction = diff > 0.009 ? 'up' : diff < -0.009 ? 'down' : 'stable';
      jetATrend = { start, end, diff, percent, direction };
    }

    return {
      avgas: avgasPoints.length >= 2 ? avgasTrend : null,
      jetA: jetAPoints.length >= 2 ? jetATrend : null
    };
  }, [history]);

  const customTooltipRenderer = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dateStr = payload[0].payload.timestamp;
      const fullDate = new Date(dateStr).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

      return (
        <div className="ios-liquid-glass-heavy p-3 rounded-2xl text-xs space-y-1.5 text-slate-900 dark:text-white" id="fuel-chart-tooltip">
          <p className="font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
            <Calendar size={12} /> {fullDate}
          </p>
          <div className="space-y-1 pt-1.5 border-t border-white/50 dark:border-slate-700/60">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-6">
                <span className="flex items-center gap-1.5 font-semibold" style={{ color: entry.color }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                  {entry.name}:
                </span>
                <span className="font-mono font-bold text-sm">
                  ${entry.value ? entry.value.toFixed(2) : 'N/A'}/gal
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const hasLL100 = history.some(h => h.ll100 !== null);
  const hasJetA = history.some(h => h.jetA !== null);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-white/20 dark:bg-slate-900/25 border border-white/60 dark:border-slate-700/50 rounded-2xl" id="fuel-chart-loading">
        <Loader2 className="h-7 w-7 text-sky-600 animate-spin mb-2.5" />
        <p className="text-xs font-semibold text-slate-600">Loading Fuel Price Trends...</p>
      </div>
    );
  }

  if (error || history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-amber-500/10 border border-amber-300/50 rounded-2xl text-center" id="fuel-chart-error">
        <AlertCircle className="h-7 w-7 text-amber-500 mb-2" />
        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Trend data unavailable</p>
      </div>
    );
  }

  return (
    <div className="bg-white/22 dark:bg-slate-900/25 border border-white/60 dark:border-slate-700/50 rounded-2xl p-4 space-y-4" id="fuel-price-trend-card">
      <div className="flex items-center justify-between border-b border-white/45 dark:border-slate-700/50 pb-3">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-sky-600 dark:text-sky-400" />
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white tracking-tight">Fuel Price History</h4>
            <p className="text-[10px] text-slate-600 dark:text-slate-300 font-medium">6-month historical station rate trend</p>
          </div>
        </div>
        
        {/* iOS Segmented Switch */}
        <div className="flex items-center bg-white/25 dark:bg-slate-800/40 rounded-xl p-0.5 border border-white/65 dark:border-white/15" id="fuel-type-toggle">
          {['both', 'll100', 'jetA'].map((tab) => {
            if (tab === 'll100' && !hasLL100) return null;
            if (tab === 'jetA' && !hasJetA) return null;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setSelectedFuelType(tab as any)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                  selectedFuelType === tab
                    ? 'bg-white/65 dark:bg-slate-700/70 backdrop-blur-md text-slate-900 dark:text-white shadow-2xs border border-white/80'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
                id={`fuel-toggle-${tab}`}
              >
                {tab === 'both' ? 'All' : tab === 'll100' ? 'Avgas' : 'Jet A'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Trend Summary Grid */}
      {trendAnalysis && (
        <div className="grid grid-cols-2 gap-3" id="fuel-chart-trends-summary">
          {hasLL100 && (selectedFuelType === 'both' || selectedFuelType === 'll100') && trendAnalysis.avgas && (
            <div className={`p-3 rounded-xl border leading-tight ${
              trendAnalysis.avgas.direction === 'down' 
                ? 'bg-emerald-500/12 border-emerald-300/60 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200' 
                : trendAnalysis.avgas.direction === 'up'
                ? 'bg-rose-500/12 border-rose-300/60 dark:border-rose-800/40 text-rose-900 dark:text-rose-200'
                : 'bg-white/25 border-white/65 dark:bg-slate-800/35 dark:border-slate-700 text-slate-800 dark:text-slate-200'
            }`} id="trend-summary-avgas">
              <span className="text-[9px] uppercase font-bold text-slate-600 dark:text-slate-300 tracking-wider">Avgas 100LL Trend</span>
              <div className="flex items-center gap-1.5 mt-1 font-mono">
                {trendAnalysis.avgas.direction === 'down' ? (
                  <TrendingDown size={14} className="text-emerald-600" />
                ) : trendAnalysis.avgas.direction === 'up' ? (
                  <TrendingUp size={14} className="text-rose-600" />
                ) : (
                  <Minus size={14} className="text-slate-500" />
                )}
                <span className="text-sm font-black">${trendAnalysis.avgas.end.toFixed(2)}</span>
                <span className="text-[10px] font-bold">
                  ({trendAnalysis.avgas.diff >= 0 ? '+' : ''}{trendAnalysis.avgas.diff.toFixed(2)} | {trendAnalysis.avgas.percent >= 0 ? '+' : ''}{trendAnalysis.avgas.percent.toFixed(1)}%)
                </span>
              </div>
            </div>
          )}

          {hasJetA && (selectedFuelType === 'both' || selectedFuelType === 'jetA') && trendAnalysis.jetA && (
            <div className={`p-3 rounded-xl border leading-tight ${
              trendAnalysis.jetA.direction === 'down' 
                ? 'bg-emerald-500/12 border-emerald-300/60 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200' 
                : trendAnalysis.jetA.direction === 'up'
                ? 'bg-rose-500/12 border-rose-300/60 dark:border-rose-800/40 text-rose-900 dark:text-rose-200'
                : 'bg-white/25 border-white/65 dark:bg-slate-800/35 dark:border-slate-700 text-slate-800 dark:text-slate-200'
            }`} id="trend-summary-jeta">
              <span className="text-[9px] uppercase font-bold text-slate-600 dark:text-slate-300 tracking-wider">Jet A Trend</span>
              <div className="flex items-center gap-1.5 mt-1 font-mono">
                {trendAnalysis.jetA.direction === 'down' ? (
                  <TrendingDown size={14} className="text-emerald-600" />
                ) : trendAnalysis.jetA.direction === 'up' ? (
                  <TrendingUp size={14} className="text-rose-600" />
                ) : (
                  <Minus size={14} className="text-slate-500" />
                )}
                <span className="text-sm font-black">${trendAnalysis.jetA.end.toFixed(2)}</span>
                <span className="text-[10px] font-bold">
                  ({trendAnalysis.jetA.diff >= 0 ? '+' : ''}{trendAnalysis.jetA.diff.toFixed(2)} | {trendAnalysis.jetA.percent >= 0 ? '+' : ''}{trendAnalysis.jetA.percent.toFixed(1)}%)
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recharts Graphical Visualization */}
      <div className="h-[180px] w-full" id="fuel-price-trend-graph">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.45)" className="dark:hidden" />
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.12)" className="hidden dark:block" />
            
            <XAxis 
              dataKey="dateLabel" 
              tick={{ fontSize: 9, fontWeight: 600, fill: '#475569' }} 
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 9, fontWeight: 600, fill: '#475569' }}
              domain={['auto', 'auto']}
              axisLine={false}
              tickLine={false}
              tickFormatter={(val) => `$${val.toFixed(1)}`}
            />
            
            <Tooltip content={customTooltipRenderer} />
            
            {hasLL100 && (selectedFuelType === 'both' || selectedFuelType === 'll100') && (
              <Line 
                name="Avgas 100LL"
                type="monotone" 
                dataKey="ll100Price" 
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ r: 3, strokeWidth: 1 }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            )}
            {hasJetA && (selectedFuelType === 'both' || selectedFuelType === 'jetA') && (
              <Line 
                name="Jet A"
                type="monotone" 
                dataKey="jetAPrice" 
                stroke="#06b6d4"
                strokeWidth={2.5}
                dot={{ r: 3, strokeWidth: 1 }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-slate-600 dark:text-slate-300 bg-white/20 dark:bg-slate-900/30 p-2.5 rounded-xl border border-white/55 dark:border-slate-800" id="fuel-chart-footer">
        <DollarSign size={10} className="text-cyan-600 flex-shrink-0" />
        <span>Green represents Avgas 100LL pricing, while blue tracks Jet A turbine rates. Updates generate new timeline points.</span>
      </div>
    </div>
  );
};
