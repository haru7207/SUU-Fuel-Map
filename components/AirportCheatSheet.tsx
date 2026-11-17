import React, { useState, useEffect } from 'react';
import { X, Search, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import Papa from 'papaparse';

interface AirportCheatSheetProps {
  isOpen: boolean;
  onClose: () => void;
  initialSearchQuery?: string;
}

interface CheatSheetData {
  ID: string;
  'Airport Name': string;
  'Elev (ft)': string;
  'TPA (MSL)': string;
  'CTAF/TWR': string;
  'WX (AWOS/ATIS)': string;
  'Right Traffic': string;
  'CFI Practical Notes / Remarks': string;
}

export const AirportCheatSheet: React.FC<AirportCheatSheetProps> = ({ isOpen, onClose, initialSearchQuery = '' }) => {
  const [data, setData] = useState<CheatSheetData[]>([]);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery(initialSearchQuery);
    }
  }, [isOpen, initialSearchQuery]);

  useEffect(() => {
    if (isOpen && data.length === 0) {
      setIsLoading(true);
      setError(null);
      
      const csvUrl = 'https://docs.google.com/spreadsheets/d/1YM86Sw_E07zizzlFAC75hZQy_5yUXmBOyqlo8ye-7uY/export?format=csv';

      Papa.parse(csvUrl, {
        download: true,
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        complete: (results) => {
          if (results.errors.length > 0) {
            console.error('CSV Parsing errors:', results.errors);
          }
          setData(results.data as CheatSheetData[]);
          setIsLoading(false);
        },
        error: (err) => {
          console.error('Error fetching CSV:', err);
          setError('Failed to fetch data from Google Sheets.');
          setIsLoading(false);
        }
      });
    }
  }, [isOpen, data.length]);

  if (!isOpen) return null;

  const filteredData = data.filter(row => {
    const query = searchQuery.toLowerCase();
    const id = (row.ID || '').toLowerCase();
    const name = (row['Airport Name'] || '').toLowerCase();
    return id.includes(query) || name.includes(query);
  });

  return (
    <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/15 backdrop-blur-md animate-fade-in">
      <div className="ios-liquid-glass-heavy rounded-t-[32px] md:rounded-[28px] w-full max-w-6xl h-[90dvh] md:h-auto max-h-[90dvh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-white/6 dark:bg-slate-800/15 px-6 py-4 border-b border-white/55 dark:border-slate-700/50 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/20 border border-blue-400/50 p-2 rounded-xl">
              <FileSpreadsheet className="text-blue-600 dark:text-blue-400 w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Airport Cheat Sheet</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">Quick reference data for local airports</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="ios-liquid-pill text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white p-2 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 bg-white/5 dark:bg-slate-800/15 border-b border-white/50 dark:border-slate-700/50 flex-shrink-0">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-500" />
            </div>
            <input
              type="text"
              placeholder="Search by Airport ID or Name..."
              className="w-full ios-liquid-input text-slate-900 dark:text-slate-100 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 block pl-10 p-2.5"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y bg-transparent p-4 pb-24 md:pb-6 custom-scrollbar">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-600 dark:text-slate-400">
              <AlertTriangle className="h-10 w-10 text-red-500 mb-2" />
              <p>{error}</p>
            </div>
          ) : (
            <>
              {/* Desktop View */}
              <div className="hidden md:block overflow-x-auto rounded-2xl ios-liquid-card">
                <table className="w-full text-sm text-left text-slate-800 dark:text-slate-200">
                  <thead className="text-xs text-slate-600 dark:text-slate-400 uppercase bg-white/25 dark:bg-slate-800/40 backdrop-blur-md sticky top-0 z-10 border-b border-white/55 dark:border-slate-700/50">
                    <tr>
                      <th scope="col" className="px-4 py-3">ID</th>
                      <th scope="col" className="px-4 py-3">Airport Name</th>
                      <th scope="col" className="px-4 py-3">Elev</th>
                      <th scope="col" className="px-4 py-3">TPA</th>
                      <th scope="col" className="px-4 py-3">CTAF/TWR</th>
                      <th scope="col" className="px-4 py-3">WX</th>
                      <th scope="col" className="px-4 py-3">Right Traffic</th>
                      <th scope="col" className="px-4 py-3">CFI Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/40 dark:divide-slate-700/40">
                    {filteredData.length > 0 ? (
                      filteredData.map((row, index) => {
                        const hasRightTraffic = row['Right Traffic'] && row['Right Traffic'].trim() !== '' && row['Right Traffic'].trim() !== '-';
                        
                        return (
                          <tr 
                            key={index} 
                            className="bg-white/8 dark:bg-slate-900/15 hover:bg-white/25 dark:hover:bg-slate-800/35 transition-colors"
                          >
                            <td className="px-4 py-3 font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">{row.ID}</td>
                            <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{row['Airport Name']}</td>
                            <td className="px-4 py-3">{row['Elev (ft)']}</td>
                            <td className="px-4 py-3">{row['TPA (MSL)']}</td>
                            <td className="px-4 py-3">{row['CTAF/TWR']}</td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{row['WX (AWOS/ATIS)']}</td>
                            <td className={`px-4 py-3 ${hasRightTraffic ? 'text-red-600 dark:text-red-400 font-bold' : ''}`}>
                              {row['Right Traffic']}
                            </td>
                            <td className="px-4 py-3 text-slate-700 dark:text-slate-300 text-xs max-w-xs">{row['CFI Practical Notes / Remarks']}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-slate-600 dark:text-slate-400">
                          No airports found matching "{searchQuery}"
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="md:hidden flex flex-col gap-4">
                {filteredData.length > 0 ? (
                  filteredData.map((row, index) => {
                    const hasRightTraffic = row['Right Traffic'] && row['Right Traffic'].trim() !== '' && row['Right Traffic'].trim() !== '-';
                    return (
                      <div key={index} className="ios-liquid-card rounded-2xl p-4 space-y-3">
                        <div className="flex justify-between items-center border-b border-white/50 dark:border-slate-700/50 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-blue-600 dark:text-blue-400 text-lg">{row.ID}</span>
                            <span className="font-semibold text-slate-900 dark:text-slate-100">{row['Airport Name']}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm pt-1">
                          <div>
                            <span className="text-slate-500 dark:text-slate-400 text-xs block mb-0.5 uppercase tracking-wider font-semibold">Elev</span>
                            <span className="text-slate-900 dark:text-slate-200 font-medium">{row['Elev (ft)']}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 dark:text-slate-400 text-xs block mb-0.5 uppercase tracking-wider font-semibold">TPA</span>
                            <span className="text-slate-900 dark:text-slate-200 font-medium">{row['TPA (MSL)']}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 dark:text-slate-400 text-xs block mb-0.5 uppercase tracking-wider font-semibold">CTAF/TWR</span>
                            <span className="text-slate-900 dark:text-slate-200 font-medium">{row['CTAF/TWR']}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 dark:text-slate-400 text-xs block mb-0.5 uppercase tracking-wider font-semibold">WX</span>
                            <span className="text-slate-900 dark:text-slate-200 font-medium">{row['WX (AWOS/ATIS)']}</span>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-white/45 dark:border-slate-700/50 flex flex-col gap-1">
                           <span className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">Right Traffic</span>
                           <span className={hasRightTraffic ? 'text-red-600 dark:text-red-400 font-bold' : 'text-slate-900 dark:text-slate-200'}>{row['Right Traffic'] || '-'}</span>
                        </div>
                        {row['CFI Practical Notes / Remarks'] && (
                          <div className="pt-2 border-t border-white/45 dark:border-slate-700/50 flex flex-col gap-1">
                            <span className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">CFI Notes</span>
                            <p className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed">{row['CFI Practical Notes / Remarks']}</p>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-slate-600 dark:text-slate-400 ios-liquid-card rounded-2xl">
                    No airports found matching "{searchQuery}"
                  </div>
                )}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
