import React, { useState, useEffect } from 'react';
import { Match, Team, MatchStatus } from '../types';
import { Calendar, MapPin, Clock, Award, Edit2, Trash2, Timer } from 'lucide-react';

interface Props {
  match: Match;
  teamA?: Team;
  teamB?: Team;
  onClick?: () => void;
  onEdit?: (e: React.MouseEvent, match: Match) => void;
  onDelete?: (e: React.MouseEvent, matchId: string) => void;
  isAdmin?: boolean;
}

export const MatchCard: React.FC<Props> = ({ match, teamA, teamB, onClick, onEdit, onDelete, isAdmin }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (match.status !== MatchStatus.SCHEDULED) return;

    const timer = setInterval(() => {
      const matchDateTime = new Date(`${match.date} ${match.time}`).getTime();
      const now = new Date().getTime();
      const difference = matchDateTime - now;

      if (difference <= 0) {
        setTimeLeft('Starting Soon');
        clearInterval(timer);
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

      let timeStr = '';
      if (days > 0) timeStr += `${days}d `;
      if (hours > 0 || days > 0) timeStr += `${hours}h `;
      timeStr += `${minutes}m`;
      
      setTimeLeft(timeStr);
    }, 1000);

    return () => clearInterval(timer);
  }, [match.date, match.time, match.status]);

  if (!teamA || !teamB) return null;

  const momPlayer = teamA.players?.find(p => p.id === match.manOfTheMatch) || teamB.players?.find(p => p.id === match.manOfTheMatch);

  const getStatusColor = (status: MatchStatus) => {
    switch (status) {
      case MatchStatus.LIVE: return 'bg-red-100 text-red-700 border-red-200 animate-pulse';
      case MatchStatus.COMPLETED: return 'bg-slate-100 text-slate-700 border-slate-200';
      case MatchStatus.ABANDONED: return 'bg-gray-100 text-gray-500 border-gray-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-100';
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(e, match.id);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(e, match);
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
          
          <div className="flex items-center gap-1.5">
            {isAdmin && match.status === MatchStatus.SCHEDULED && onEdit && (
                <button 
                    onClick={handleEditClick}
                    title="Edit Match"
                    className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-emerald-600 hover:text-white transition-colors"
                >
                    <Edit2 size={12} />
                </button>
            )}
            {isAdmin && onDelete && (
                <button 
                    onClick={handleDeleteClick}
                    title="Delete Match"
                    className="p-1.5 bg-slate-100 text-slate-400 rounded-lg hover:bg-red-600 hover:text-white transition-colors"
                >
                    <Trash2 size={12} />
                </button>
            )}
            <span className={`px-2 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1 ${getStatusColor(match.status)}`}>
                {match.status === MatchStatus.SCHEDULED ? (
                  <><Timer size={10}/> {timeLeft || 'SCHEDULED'}</>
                ) : match.status}
            </span>
          </div>
        </div>

        {/* Teams & Scores */}
        <div className="flex justify-between items-center gap-4">
          <div className="flex-1 text-center overflow-hidden">
             <div className="w-12 h-12 bg-slate-100 rounded-full mx-auto mb-2 flex items-center justify-center text-xl font-bold text-slate-400 shrink-0 border border-slate-200 shadow-inner">
                {teamA.logo ? <img src={teamA.logo} alt={teamA.name} className="w-full h-full rounded-full object-cover"/> : <span className="uppercase">{teamA.name[0]}</span>}
             </div>
             <h3 className="font-bold text-slate-900 truncate px-1 text-sm" title={teamA.name}>{teamA.name}</h3>
             {match.status !== MatchStatus.SCHEDULED && (
                 <p className="text-lg font-mono font-bold text-emerald-800">
                    {match.scoreA.runs}/{match.scoreA.wickets} <span className="text-[10px] text-slate-500 font-normal">({match.scoreA.overs})</span>
                 </p>
             )}
          </div>

          <div className="text-center font-bold text-slate-200 text-xl shrink-0 italic">VS</div>

          <div className="flex-1 text-center overflow-hidden">
             <div className="w-12 h-12 bg-slate-100 rounded-full mx-auto mb-2 flex items-center justify-center text-xl font-bold text-slate-400 shrink-0 border border-slate-200 shadow-inner">
                {teamB.logo ? <img src={teamB.logo} alt={teamB.name} className="w-full h-full rounded-full object-cover"/> : <span className="uppercase">{teamB.name[0]}</span>}
             </div>
             <h3 className="font-bold text-slate-900 truncate px-1 text-sm" title={teamB.name}>{teamB.name}</h3>
             {match.status !== MatchStatus.SCHEDULED && (
                 <p className="text-lg font-mono font-bold text-emerald-800">
                    {match.scoreB.runs}/{match.scoreB.wickets} <span className="text-[10px] text-slate-500 font-normal">({match.scoreB.overs})</span>
                 </p>
             )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-[10px] sm:text-xs text-slate-500">
             <div className="flex items-center gap-1 truncate max-w-[100px]">
                 <MapPin size={10} /> {match.venue}
             </div>
             {match.status === MatchStatus.COMPLETED && match.winnerId ? (
                 <div className="flex flex-col items-end gap-1 truncate max-w-[140px]">
                     <span className={`font-bold truncate ${match.winnerId === 'TIED' ? 'text-blue-600' : 'text-emerald-600'}`}>
                        {match.winnerId === 'TIED' ? 'MATCH TIED' : `Winner: ${match.winnerId === teamA.id ? teamA.name : teamB.name}`}
                     </span>
                     {momPlayer && (
                         <span className="text-[9px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-black uppercase flex items-center gap-1">
                             <Award size={10}/> {momPlayer.name}
                         </span>
                     )}
                 </div>
             ) : (
                 <div className="flex items-center gap-1">
                     <Clock size={10} /> {match.time}
                 </div>
             )}
        </div>
      </div>
      <div className="bg-emerald-600 px-4 py-2 border-t border-emerald-700 text-center text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest">
          View Detailed Scorecard
      </div>
    </div>
  );
};