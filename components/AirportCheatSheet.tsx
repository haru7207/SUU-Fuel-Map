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
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 shadow-2xl rounded-xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-800 px-6 py-4 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600/20 p-2 rounded-lg">
              <FileSpreadsheet className="text-blue-400 w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Airport Cheat Sheet</h2>
              <p className="text-xs text-slate-400">Quick reference data for local airports</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-700 p-2 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 bg-slate-800/50 border-b border-slate-700 flex-shrink-0">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-500" />
            </div>
            <input
              type="text"
              placeholder="Search by Airport ID or Name..."
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block pl-10 p-2.5"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto bg-slate-900 p-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <AlertTriangle className="h-10 w-10 text-red-500 mb-2" />
              <p>{error}</p>
            </div>
          ) : (
            <>
              {/* Desktop View */}
              <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-700">
                <table className="w-full text-sm text-left text-slate-300">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-800 sticky top-0 z-10 shadow-md">
                    <tr>
                      <th scope="col" className="px-4 py-3 border-b border-slate-700">ID</th>
                      <th scope="col" className="px-4 py-3 border-b border-slate-700">Airport Name</th>
                      <th scope="col" className="px-4 py-3 border-b border-slate-700">Elev</th>
                      <th scope="col" className="px-4 py-3 border-b border-slate-700">TPA</th>
                      <th scope="col" className="px-4 py-3 border-b border-slate-700">CTAF/TWR</th>
                      <th scope="col" className="px-4 py-3 border-b border-slate-700">WX</th>
                      <th scope="col" className="px-4 py-3 border-b border-slate-700">Right Traffic</th>
                      <th scope="col" className="px-4 py-3 border-b border-slate-700">CFI Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.length > 0 ? (
                      filteredData.map((row, index) => {
                        const hasRightTraffic = row['Right Traffic'] && row['Right Traffic'].trim() !== '' && row['Right Traffic'].trim() !== '-';
                        
                        return (
                          <tr 
                            key={index} 
                            className="border-b border-slate-800 bg-slate-900 hover:bg-slate-800 transition-colors"
                          >
                            <td className="px-4 py-3 font-medium text-blue-400 whitespace-nowrap">{row.ID}</td>
                            <td className="px-4 py-3 font-medium text-slate-200">{row['Airport Name']}</td>
                            <td className="px-4 py-3">{row['Elev (ft)']}</td>
                            <td className="px-4 py-3">{row['TPA (MSL)']}</td>
                            <td className="px-4 py-3">{row['CTAF/TWR']}</td>
                            <td className="px-4 py-3 text-slate-400">{row['WX (AWOS/ATIS)']}</td>
                            <td className={`px-4 py-3 ${hasRightTraffic ? 'text-red-500 font-bold' : ''}`}>
                              {row['Right Traffic']}
                            </td>
                            <td className="px-4 py-3 text-slate-400 text-xs max-w-xs">{row['CFI Practical Notes / Remarks']}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
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
                      <div key={index} className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-3 shadow-sm">
                        <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-blue-400 text-lg">{row.ID}</span>
                            <span className="font-medium text-slate-200">{row['Airport Name']}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm pt-1">
                          <div>
                            <span className="text-slate-500 text-xs block mb-0.5 uppercase tracking-wider font-semibold">Elev</span>
                            <span className="text-slate-300">{row['Elev (ft)']}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 text-xs block mb-0.5 uppercase tracking-wider font-semibold">TPA</span>
                            <span className="text-slate-300">{row['TPA (MSL)']}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 text-xs block mb-0.5 uppercase tracking-wider font-semibold">CTAF/TWR</span>
                            <span className="text-slate-300">{row['CTAF/TWR']}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 text-xs block mb-0.5 uppercase tracking-wider font-semibold">WX</span>
                            <span className="text-slate-300">{row['WX (AWOS/ATIS)']}</span>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-slate-700/50 flex flex-col gap-1">
                           <span className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Right Traffic</span>
                           <span className={hasRightTraffic ? 'text-red-500 font-bold' : 'text-slate-300'}>{row['Right Traffic'] || '-'}</span>
                        </div>
                        {row['CFI Practical Notes / Remarks'] && (
                          <div className="pt-2 border-t border-slate-700/50 flex flex-col gap-1">
                            <span className="text-slate-500 text-xs uppercase tracking-wider font-semibold">CFI Notes</span>
                            <p className="text-slate-300 text-sm leading-relaxed">{row['CFI Practical Notes / Remarks']}</p>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-slate-500 bg-slate-800 rounded-lg border border-slate-700 shadow-sm">
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
