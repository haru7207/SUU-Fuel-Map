
import React, { useMemo } from 'react';
import { Airport, CardType } from '../types';
import { Search, Plane, AlertCircle, MessageSquare } from 'lucide-react';

interface SidebarProps {
  airports: Airport[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onOpenGlobalNotes: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ airports, selectedId, onSelect, searchTerm, setSearchTerm, onOpenGlobalNotes }) => {
  
  const filteredAirports = useMemo(() => {
    const lower = searchTerm.toLowerCase();
    return airports.filter(a => 
      a.id.toLowerCase().includes(lower) || 
      a.name.toLowerCase().includes(lower) ||
      a.city.toLowerCase().includes(lower)
    );
  }, [airports, searchTerm]);

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 w-full md:w-80 lg:w-96 shadow-xl z-20">
      <div className="p-5 bg-[#0f172a] text-white flex-shrink-0 border-b border-slate-800">
        <div className="flex items-center gap-3 mb-5">
           <Plane className="text-red-500 fill-current" size={22} />
           <h1 className="text-xl font-bold tracking-tight text-white">SUU <span className="text-slate-400 font-light">Fuel Map</span></h1>
        </div>
        
        {/* Search */}
        <div className="relative group mb-3">
          <Search className="absolute left-3 top-2.5 text-slate-500 group-focus-within:text-slate-300 transition-colors" size={16} />
          <input 
            type="text" 
            placeholder="Search airport, city or ID" 
            className="w-full pl-10 pr-4 py-2 bg-[#1e293b] border border-slate-700 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Global Notes Button */}
        <button 
            onClick={onOpenGlobalNotes}
            className="w-full py-2 bg-indigo-900/50 hover:bg-indigo-900 border border-indigo-800 rounded text-xs font-bold text-indigo-200 hover:text-white transition-all flex items-center justify-center gap-2"
        >
            <MessageSquare size={14} />
            View All Pilot Notes
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-white">
        {filteredAirports.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <p>No airports found.</p>
          </div>
        ) : (
          <ul>
            {filteredAirports.map(airport => {
              const isSelected = airport.id === selectedId;
              const isWhiteCard = airport.cardRules.primary === CardType.WHITE_CARD;
              
              return (
                <li key={airport.id}>
                  <button 
                    onClick={() => onSelect(airport.id)}
                    className={`w-full text-left px-5 py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors flex justify-between items-start group relative ${
                      isSelected ? 'bg-slate-50' : ''
                    }`}
                  >
                    {isSelected && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
                    )}
                    <div className="w-full">
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className={`font-bold text-lg ${isSelected ? 'text-red-600' : 'text-slate-800'}`}>
                            {airport.id}
                        </span>
                        
                        {isWhiteCard && (
                            <span className="px-1.5 py-0.5 bg-red-50 text-red-600 text-[10px] font-bold uppercase rounded border border-red-100 tracking-wide">
                                White Card
                            </span>
                        )}
                        
                        {airport.cardRules.warning && !isWhiteCard && (
                             <span className="px-1.5 py-0.5 bg-yellow-50 text-yellow-600 border border-yellow-200 rounded flex items-center justify-center">
                                <AlertCircle size={12} className="fill-current" />
                             </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-medium truncate">{airport.city}, {airport.state}</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-200 flex-shrink-0">
        <p className="text-[10px] text-slate-400 text-center leading-relaxed">
            For SUU Instructors Use Only.<br/>
            <span className="font-semibold text-slate-500">Not for Navigation.</span>
        </p>
      </div>
    </div>
  );
};

export default Sidebar;
