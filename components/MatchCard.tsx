
import React from 'react';
import { Match, Team, MatchStatus } from '../types';
import { Calendar, MapPin, Clock } from 'lucide-react';

interface Props {
  match: Match;
  teamA?: Team;
  teamB?: Team;
  onClick?: () => void;
  isAdmin?: boolean;
}

export const MatchCard: React.FC<Props> = ({ match, teamA, teamB, onClick, isAdmin }) => {
  if (!teamA || !teamB) return null;

  const getStatusColor = (status: MatchStatus) => {
    switch (status) {
      case MatchStatus.LIVE: return 'bg-red-100 text-red-700 border-red-200 animate-pulse';
      case MatchStatus.COMPLETED: return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    }
  };

  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all cursor-pointer relative group`}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{match.groupStage} • {match.type}</span>
            <span className="text-xs text-slate-400 flex items-center gap-1 mt-1">
              <Calendar size={12}/> {new Date(match.date).toLocaleDateString()}
            </span>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(match.status)}`}>
            {match.status}
          </span>
        </div>

        {/* Teams & Scores */}
        <div className="flex justify-between items-center gap-4">
          <div className="flex-1 text-center overflow-hidden">
             <div className="w-12 h-12 bg-slate-100 rounded-full mx-auto mb-2 flex items-center justify-center text-xl font-bold text-slate-400 shrink-0">
                {teamA.logo ? <img src={teamA.logo} alt={teamA.name} className="w-full h-full rounded-full object-cover"/> : teamA.name[0]}
             </div>
             <h3 className="font-bold text-slate-900 truncate px-1" title={teamA.name}>{teamA.name}</h3>
             {match.status !== MatchStatus.SCHEDULED && (
                 <p className="text-lg font-mono font-bold text-emerald-800">
                    {match.scoreA.runs}/{match.scoreA.wickets} <span className="text-xs text-slate-500">({match.scoreA.overs})</span>
                 </p>
             )}
          </div>

          <div className="text-center font-bold text-slate-300 text-xl shrink-0">VS</div>

          <div className="flex-1 text-center overflow-hidden">
             <div className="w-12 h-12 bg-slate-100 rounded-full mx-auto mb-2 flex items-center justify-center text-xl font-bold text-slate-400 shrink-0">
                {teamB.logo ? <img src={teamB.logo} alt={teamB.name} className="w-full h-full rounded-full object-cover"/> : teamB.name[0]}
             </div>
             <h3 className="font-bold text-slate-900 truncate px-1" title={teamB.name}>{teamB.name}</h3>
             {match.status !== MatchStatus.SCHEDULED && (
                 <p className="text-lg font-mono font-bold text-emerald-800">
                    {match.scoreB.runs}/{match.scoreB.wickets} <span className="text-xs text-slate-500">({match.scoreB.overs})</span>
                 </p>
             )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
             <div className="flex items-center gap-1">
                 <MapPin size={12} /> {match.venue}
             </div>
             {match.status === MatchStatus.COMPLETED && match.winnerId ? (
                 <span className="font-bold text-emerald-600 truncate max-w-[120px]">
                     Winner: {match.winnerId === teamA.id ? teamA.name : teamB.name}
                 </span>
             ) : (
                 <div className="flex items-center gap-1">
                     <Clock size={12} /> {match.time}
                 </div>
             )}
        </div>
      </div>
      {isAdmin ? (
          <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 text-center text-xs font-medium text-emerald-600">
              Click to Manage
          </div>
      ) : (
          <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 text-center text-xs font-medium text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
              View Scorecard
          </div>
      )}
    </div>
  );
};
