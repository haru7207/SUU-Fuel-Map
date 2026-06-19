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
import { fetchFuelPriceHistory, HistoryPricePoint } from '../services/firebase';
import { Airport } from '../types';
import { TrendingUp, TrendingDown, Minus, Loader2, Calendar, DollarSign, Activity, AlertCircle } from 'lucide-react';

interface FuelPriceTrendChartProps {
  airport: Airport;
}

export const FuelPriceTrendChart: React.FC<FuelPriceTrendChartProps> = ({ airport }) => {
  const [history, setHistory] = useState<HistoryPricePoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFuelType, setSelectedFuelType] = useState<'both' | 'll100' | 'jetA'>('both');

  const currentLL = airport.fuelPrices?.['100LL'] || null;
  const currentJetA = airport.fuelPrices?.['Jet A'] || null;

  useEffect(() => {
    let active = true;
    const loadHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchFuelPriceHistory(airport.id, currentLL, currentJetA);
        if (active) {
          setHistory(data);
        }
      } catch (err: any) {
        console.error("Error loading fuel price history for chart:", err);
        if (active) {
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
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg shadow-xl text-xs space-y-1.5 text-white" id="fuel-chart-tooltip">
          <p className="font-bold text-slate-400 flex items-center gap-1">
            <Calendar size={12} /> {fullDate}
          </p>
          <div className="space-y-1 pt-1.5 border-t border-slate-800">
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
      <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg shadow-sm" id="fuel-chart-loading">
        <Loader2 className="h-8 w-8 text-cyan-600 animate-spin mb-3" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Fuel Price Trends...</p>
      </div>
    );
  }

  if (error || history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-amber-50/50 dark:bg-slate-950/20 border border-amber-100 dark:border-slate-850 rounded-lg text-center" id="fuel-chart-error">
        <AlertCircle className="h-8 w-8 text-amber-500 mb-2" />
        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Trend data unavailable</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">No recorded historical instances are matching this airport criteria. Complete a database action to generate telemetry.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg p-5 shadow-sm space-y-4" id="fuel-price-trend-card">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-900 pb-3">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-cyan-600" />
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-white tracking-tight">Fuel Price Trend Chart</h4>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Historical pricing trend over the last 6 months</p>
          </div>
        </div>
        
        {/* Toggle Switch */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5" id="fuel-type-toggle">
          {['both', 'll100', 'jetA'].map((tab) => {
            if (tab === 'll100' && !hasLL100) return null;
            if (tab === 'jetA' && !hasJetA) return null;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setSelectedFuelType(tab as any)}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                  selectedFuelType === tab
                    ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
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
            <div className={`p-3 rounded-lg border leading-tight ${
              trendAnalysis.avgas.direction === 'down' 
                ? 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/30 text-emerald-900 dark:text-emerald-350' 
                : trendAnalysis.avgas.direction === 'up'
                ? 'bg-rose-50/50 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/30 text-rose-900 dark:text-rose-350'
                : 'bg-slate-50 border-slate-100 dark:bg-slate-900/50 dark:border-slate-800 text-slate-700 dark:text-slate-350'
            }`} id="trend-summary-avgas">
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Avgas 100LL Trend</span>
              <div className="flex items-center gap-1.5 mt-1 font-mono">
                {trendAnalysis.avgas.direction === 'down' ? (
                  <TrendingDown size={14} className="text-emerald-500" />
                ) : trendAnalysis.avgas.direction === 'up' ? (
                  <TrendingUp size={14} className="text-rose-500" />
                ) : (
                  <Minus size={14} className="text-slate-400" />
                )}
                <span className="text-sm font-black">${trendAnalysis.avgas.end.toFixed(2)}</span>
                <span className="text-[10px] font-bold">
                  ({trendAnalysis.avgas.diff >= 0 ? '+' : ''}{trendAnalysis.avgas.diff.toFixed(2)} | {trendAnalysis.avgas.percent >= 0 ? '+' : ''}{trendAnalysis.avgas.percent.toFixed(1)}%)
                </span>
              </div>
            </div>
          )}

          {hasJetA && (selectedFuelType === 'both' || selectedFuelType === 'jetA') && trendAnalysis.jetA && (
            <div className={`p-3 rounded-lg border leading-tight ${
              trendAnalysis.jetA.direction === 'down' 
                ? 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/30 text-emerald-900 dark:text-emerald-350' 
                : trendAnalysis.jetA.direction === 'up'
                ? 'bg-rose-50/50 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/30 text-rose-900 dark:text-rose-350'
                : 'bg-slate-50 border-slate-100 dark:bg-slate-900/50 dark:border-slate-800 text-slate-700 dark:text-slate-350'
            }`} id="trend-summary-jeta">
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Jet A Trend</span>
              <div className="flex items-center gap-1.5 mt-1 font-mono">
                {trendAnalysis.jetA.direction === 'down' ? (
                  <TrendingDown size={14} className="text-emerald-500" />
                ) : trendAnalysis.jetA.direction === 'up' ? (
                  <TrendingUp size={14} className="text-rose-500" />
                ) : (
                  <Minus size={14} className="text-slate-400" />
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
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:hidden" />
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" className="hidden dark:block" />
            
            <XAxis 
              dataKey="dateLabel" 
              tick={{ fontSize: 9, fontWeight: 600, fill: '#64748b' }} 
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 9, fontWeight: 600, fill: '#64748b' }}
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
                stroke="#10b981" // elegant emerald
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
                stroke="#06b6d4" // elegant cyan
                strokeWidth={2.5}
                dot={{ r: 3, strokeWidth: 1 }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-900" id="fuel-chart-footer">
        <DollarSign size={10} className="text-cyan-500 flex-shrink-0" />
        <span>Green represents Avgas 100LL pricing, while blue tracks Jet A turbine rates. Updates generate new timeline points.</span>
      </div>
    </div>
  );
};
