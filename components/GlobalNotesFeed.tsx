
import React, { useEffect, useState } from 'react';
import { UserNote } from '../types';
import { fetchPilotNotes } from '../services/aviationService';
import { X, MessageSquare, AlertCircle, AlertTriangle, Lightbulb, MessageCircle, RefreshCw, User, Loader2, Plane } from 'lucide-react';

interface GlobalNotesFeedProps {
  onClose: () => void;
  onSelectAirport: (id: string) => void;
}

const GlobalNotesFeed: React.FC<GlobalNotesFeedProps> = ({ onClose, onSelectAirport }) => {
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');

  const loadAllNotes = async () => {
    setLoading(true);
    try {
      // Fetching with no airportId arguments to get ALL notes
      const allNotes = await fetchPilotNotes();
      
      // Deduplication Logic
      // Sometimes APIs or bad data entry causes duplicates. We filter them out here.
      const seen = new Set();
      const distinctNotes = allNotes.filter(note => {
          // Create a unique key based on content, author, airport, and date (down to minute)
          // We ignore ID because sometimes the same note gets generated with different IDs in dev environments
          const dateKey = new Date(note.date).setSeconds(0,0); 
          const key = `${note.airportId}-${note.author}-${note.text}-${dateKey}`;
          
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
      });

      // Sort by date descending (newest first)
      const sorted = distinctNotes.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setNotes(sorted);
    } catch (e) {
      console.error("Failed to load global notes", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllNotes();
  }, []);

  const getNoteIcon = (type?: string) => {
      switch(type) {
          case 'discrepancy': return <AlertCircle size={16} className="text-red-500" />;
          case 'urgent': return <AlertTriangle size={16} className="text-orange-500" />;
          case 'tip': return <Lightbulb size={16} className="text-blue-500" />;
          default: return <MessageCircle size={16} className="text-slate-400" />;
      }
  };

  const filteredNotes = filterType === 'all' 
    ? notes 
    : notes.filter(n => n.type === filterType);

  const formatNoteDate = (dateStr: string) => {
      try {
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return dateStr;
          return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      } catch (e) {
          return dateStr;
      }
  };

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden relative shadow-2xl rounded-t-xl md:rounded-xl">
      
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-slate-50 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
                <MessageSquare size={20} />
            </div>
            <div>
                <h2 className="text-lg font-bold text-slate-800 leading-tight">Pilot Notes Feed</h2>
                <p className="text-xs text-slate-500 font-medium">Global activity across all airports</p>
            </div>
        </div>
        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Filters & Refresh */}
      <div className="p-2 bg-white border-b border-slate-100 flex gap-2 overflow-x-auto no-scrollbar">
         <button 
            onClick={loadAllNotes} 
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
            title="Refresh"
         >
             <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
         </button>
         
         {['all', 'discrepancy', 'tip', 'urgent', 'general'].map(type => (
             <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase whitespace-nowrap border transition-colors ${
                    filterType === type 
                    ? 'bg-slate-800 text-white border-slate-800' 
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                }`}
             >
                 {type}
             </button>
         ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-slate-50 p-3">
        {loading ? (
             <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                 <Loader2 size={32} className="animate-spin mb-3 text-indigo-500" />
                 <span className="text-sm font-bold">Loading global notes...</span>
             </div>
        ) : filteredNotes.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
                <MessageSquare size={48} className="mx-auto mb-2 opacity-20" />
                <p className="font-bold">No notes found</p>
            </div>
        ) : (
            <div className="space-y-3">
                {filteredNotes.map(note => (
                    <div key={note.id} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
                             {/* Airport Badge */}
                             <button 
                                onClick={() => note.airportId && onSelectAirport(note.airportId)}
                                className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded text-xs font-black text-slate-700 hover:text-blue-600 hover:border-blue-300 transition-colors uppercase"
                             >
                                 <Plane size={12} />
                                 {note.airportId || 'Unknown'}
                             </button>
                             <span className="text-[10px] font-bold text-slate-400">
                                 {formatNoteDate(note.date)}
                             </span>
                        </div>
                        
                        <div className="p-3">
                            <div className="flex items-start gap-2 mb-2">
                                {getNoteIcon(note.type)}
                                <p className="text-sm text-slate-800 whitespace-pre-wrap flex-1">{note.text}</p>
                            </div>
                            
                            <div className="flex items-center gap-1.5 mt-2 text-[10px] font-bold text-slate-400 uppercase">
                                <User size={10} />
                                <span>{note.author}</span>
                                <span className="mx-1">•</span>
                                <span className={`px-1.5 rounded ${
                                    note.type === 'discrepancy' ? 'bg-red-100 text-red-600' : 
                                    note.type === 'urgent' ? 'bg-orange-100 text-orange-600' :
                                    note.type === 'tip' ? 'bg-blue-100 text-blue-600' : 
                                    'bg-slate-100 text-slate-500'
                                }`}>
                                    {note.type || 'General'}
                                </span>
                            </div>

                            {/* Show Reply Count if any */}
                            {note.replies && note.replies.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-slate-50">
                                    <span className="text-[10px] font-bold text-indigo-500 flex items-center gap-1">
                                        <MessageCircle size={10} />
                                        {note.replies.length} Repl{note.replies.length > 1 ? 'ies' : 'y'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default GlobalNotesFeed;
