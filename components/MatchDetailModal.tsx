
import React from 'react';
import { Match, Team, TeamScorecard } from '../types';
import { X, Calendar, MapPin } from 'lucide-react';

interface Props {
  match: Match;
  teamA: Team;
  teamB: Team;
  onClose: () => void;
}

export const MatchDetailModal: React.FC<Props> = ({ match, teamA, teamB, onClose }) => {
  
  const ScorecardTable = ({ battingTeam, bowlingTeam, scorecard, score, overs }: { battingTeam: Team, bowlingTeam: Team, scorecard?: TeamScorecard, score: any, overs: number }) => (
      <div className="mb-6">
          <div className="bg-slate-100 p-3 rounded-t-lg flex justify-between items-center border-b border-slate-200">
              <div className="flex items-center gap-3">
                  {battingTeam.logo ? <img src={battingTeam.logo} className="w-8 h-8 rounded-full object-cover border"/> : <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center font-bold text-slate-500 border">{battingTeam.name[0]}</div>}
                  <h4 className="font-bold text-slate-800 text-sm sm:text-base">{battingTeam.name} Innings</h4>
              </div>
              <div className="text-sm font-bold text-emerald-800">
                  {score.runs}/{score.wickets} <span className="text-slate-500 text-xs">({score.overs} ov)</span>
              </div>
          </div>
          <div className="bg-white border-x border-b border-slate-200 rounded-b-lg overflow-hidden text-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px]"> {/* min-w forces scroll on mobile */}
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                        <tr>
                            <th className="px-3 py-2 text-left w-2/5">Batter</th>
                            <th className="px-2 py-2 text-center">R</th>
                            <th className="px-2 py-2 text-center">B</th>
                            <th className="px-2 py-2 text-center text-slate-400">4s</th>
                            <th className="px-2 py-2 text-center text-slate-400">6s</th>
                            <th className="px-2 py-2 text-right">SR</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {scorecard?.batting.map((p) => {
                            const player = battingTeam.players?.find(pl => pl.id === p.playerId);
                            return (
                            <tr key={p.playerId} className={p.isOut ? 'text-slate-500' : 'text-slate-900 font-bold bg-emerald-50/30'}>
                                <td className="px-3 py-2">
                                    <div className="flex items-center gap-2">
                                        {player?.image ? (
                                            <img src={player.image} className="w-8 h-8 rounded-full object-cover border border-slate-100 shrink-0" alt="" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0">
                                                {p.playerName[0]}
                                            </div>
                                        )}
                                        <div className="flex flex-col min-w-0">
                                            <span className="truncate max-w-[100px] sm:max-w-none">{p.playerName}</span>
                                            {p.isOut ? (
                                                <span className="text-red-500 text-[10px] sm:text-xs font-normal italic truncate max-w-[100px]">
                                                    {p.dismissal ? p.dismissal : 'out'}
                                                </span>
                                            ) : (
                                                match.status !== 'COMPLETED' && <span className="text-emerald-600 text-[10px] sm:text-xs font-bold">not out</span>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-2 py-2 text-center font-bold">{p.runs}</td>
                                <td className="px-2 py-2 text-center">{p.balls}</td>
                                <td className="px-2 py-2 text-center text-slate-400">{p.fours}</td>
                                <td className="px-2 py-2 text-center text-slate-400">{p.sixes}</td>
                                <td className="px-2 py-2 text-right text-xs">
                                    {p.balls > 0 ? ((p.runs / p.balls) * 100).toFixed(0) : '0'}
                                </td>
                            </tr>
                        )})}
                        {(!scorecard?.batting || scorecard.batting.length === 0) && (
                            <tr><td colSpan={6} className="text-center py-4 text-slate-400 italic">No batting data yet</td></tr>
                        )}
                    </tbody>
                </table>
              </div>

              <div className="bg-slate-50 text-slate-500 text-xs uppercase border-y border-slate-200 mt-4">
                  <div className="flex px-3 py-2 font-bold min-w-[350px]">
                      <span className="flex-1">Bowler</span>
                      <span className="w-10 text-center">O</span>
                      <span className="w-10 text-center">M</span>
                      <span className="w-10 text-center">R</span>
                      <span className="w-10 text-center">W</span>
                      <span className="w-12 text-right">Eco</span>
                  </div>
              </div>
              <div className="divide-y divide-slate-100 overflow-x-auto">
                  <div className="min-w-[350px]">
                    {scorecard?.bowling.map((b) => {
                        const bowler = bowlingTeam.players?.find(pl => pl.id === b.playerId);
                        return (
                        <div key={b.playerId} className="flex items-center px-3 py-2 text-xs sm:text-sm">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                {bowler?.image ? (
                                    <img src={bowler.image} className="w-6 h-6 rounded-full object-cover border border-slate-100 shrink-0" alt="" />
                                ) : (
                                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0">
                                        {b.playerName[0]}
                                    </div>
                                )}
                                <span className="font-medium truncate">{b.playerName}</span>
                            </div>
                            <span className="w-10 text-center">{b.overs}</span>
                            <span className="w-10 text-center text-slate-400">{b.maidens}</span>
                            <span className="w-10 text-center">{b.runsConceded}</span>
                            <span className="w-10 text-center font-bold text-slate-900">{b.wickets}</span>
                            <span className="w-12 text-right text-slate-500">
                                {b.ballsBowled > 0 ? (b.runsConceded / (b.ballsBowled/6)).toFixed(1) : '-'}
                            </span>
                        </div>
                    )})}
                  </div>
              </div>
          </div>
      </div>
  );

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-0 sm:p-4 backdrop-blur-sm">
      <div className="bg-white sm:rounded-xl shadow-2xl w-full h-full sm:h-[90vh] max-w-4xl flex flex-col animate-fade-in-up">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center bg-slate-50 sm:rounded-t-xl shrink-0">
           <div>
               <h3 className="font-bold text-base sm:text-lg text-slate-800 flex flex-col sm:block">
                   <span>{teamA.name} vs {teamB.name}</span>
               </h3>
               <p className="text-[10px] sm:text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                   <Calendar size={12}/> {new Date(match.date).toLocaleDateString()}
                   <span className="hidden sm:inline">•</span>
                   <span className="flex items-center gap-1"><MapPin size={12}/> {match.venue}</span>
               </p>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition bg-white border border-slate-200 shadow-sm"><X size={20}/></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-50/50">
            {/* Result Header */}
            <div className="text-center mb-6">
                 {match.status === 'COMPLETED' && match.winnerId ? (
                     <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs sm:text-sm border border-emerald-200">
                         Winner: {match.winnerId === teamA.id ? teamA.name : teamB.name}
                     </span>
                 ) : (
                     <span className="inline-block px-4 py-1.5 rounded-full bg-red-100 text-red-800 font-bold text-xs sm:text-sm animate-pulse border border-red-200">
                         ● LIVE MATCH
                     </span>
                 )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 pb-10">
                <ScorecardTable battingTeam={teamA} bowlingTeam={teamB} scorecard={match.scorecard?.A} score={match.scoreA} overs={match.totalOvers} />
                <ScorecardTable battingTeam={teamB} bowlingTeam={teamA} scorecard={match.scorecard?.B} score={match.scoreB} overs={match.totalOvers} />
            </div>
        </div>
      </div>
    </div>
  );
};
