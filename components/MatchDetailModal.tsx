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
  
  const ScorecardTable = ({ teamName, scorecard, score, overs }: { teamName: string, scorecard?: TeamScorecard, score: any, overs: number }) => (
      <div className="mb-6">
          <div className="bg-slate-100 p-3 rounded-t-lg flex justify-between items-center border-b border-slate-200">
              <h4 className="font-bold text-slate-800">{teamName} Innings</h4>
              <div className="text-sm font-bold text-emerald-800">
                  {score.runs}/{score.wickets} <span className="text-slate-500 text-xs">({score.overs} ov)</span>
              </div>
          </div>
          <div className="bg-white border-x border-b border-slate-200 rounded-b-lg overflow-hidden text-sm">
              <table className="w-full">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                      <tr>
                          <th className="px-4 py-2 text-left">Batter</th>
                          <th className="px-2 py-2 text-center">R</th>
                          <th className="px-2 py-2 text-center">B</th>
                          <th className="px-2 py-2 text-center hidden sm:table-cell">4s</th>
                          <th className="px-2 py-2 text-center hidden sm:table-cell">6s</th>
                          <th className="px-2 py-2 text-right">SR</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {scorecard?.batting.map((p) => (
                          <tr key={p.playerId} className={p.isOut ? 'text-slate-400' : 'text-slate-800 font-medium'}>
                              <td className="px-4 py-2">
                                  {p.playerName}
                                  {p.isOut && <span className="text-red-400 text-xs ml-2 font-normal">(out)</span>}
                                  {!p.isOut && match.status !== 'COMPLETED' && <span className="text-emerald-500 text-xs ml-2">*</span>}
                              </td>
                              <td className="px-2 py-2 text-center font-bold">{p.runs}</td>
                              <td className="px-2 py-2 text-center">{p.balls}</td>
                              <td className="px-2 py-2 text-center hidden sm:table-cell">{p.fours}</td>
                              <td className="px-2 py-2 text-center hidden sm:table-cell">{p.sixes}</td>
                              <td className="px-2 py-2 text-right">
                                  {p.balls > 0 ? ((p.runs / p.balls) * 100).toFixed(0) : '0'}
                              </td>
                          </tr>
                      ))}
                      {(!scorecard?.batting || scorecard.batting.length === 0) && (
                          <tr><td colSpan={6} className="text-center py-4 text-slate-400 italic">No batting data yet</td></tr>
                      )}
                  </tbody>
              </table>

              <div className="bg-slate-50 text-slate-500 text-xs uppercase border-y border-slate-200 mt-4">
                  <div className="flex px-4 py-2 font-bold">
                      <span className="flex-1">Bowler</span>
                      <span className="w-12 text-center">O</span>
                      <span className="w-12 text-center">M</span>
                      <span className="w-12 text-center">R</span>
                      <span className="w-12 text-center">W</span>
                      <span className="w-16 text-right">Eco</span>
                  </div>
              </div>
              <div className="divide-y divide-slate-100">
                  {scorecard?.bowling.map((b) => (
                      <div key={b.playerId} className="flex px-4 py-2">
                          <span className="flex-1 font-medium">{b.playerName}</span>
                          <span className="w-12 text-center">{b.overs}</span>
                          <span className="w-12 text-center">{b.maidens}</span>
                          <span className="w-12 text-center">{b.runsConceded}</span>
                          <span className="w-12 text-center font-bold text-slate-900">{b.wickets}</span>
                          <span className="w-16 text-right">
                             {b.ballsBowled > 0 ? (b.runsConceded / (b.ballsBowled/6)).toFixed(1) : '-'}
                          </span>
                      </div>
                  ))}
              </div>
          </div>
      </div>
  );

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full h-[90vh] flex flex-col animate-fade-in-up">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
           <div>
               <h3 className="font-bold text-lg text-slate-800">{teamA.shortName} vs {teamB.shortName}</h3>
               <p className="text-xs text-slate-500 flex items-center gap-2">
                   <Calendar size={12}/> {new Date(match.date).toLocaleDateString()}
                   <MapPin size={12} className="ml-2"/> {match.venue}
               </p>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition"><X size={20}/></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50">
            {/* Result Header */}
            <div className="text-center mb-6">
                 {match.status === 'COMPLETED' && match.winnerId ? (
                     <span className="inline-block px-4 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-sm">
                         Winner: {match.winnerId === teamA.id ? teamA.name : teamB.name}
                     </span>
                 ) : (
                     <span className="inline-block px-4 py-1 rounded-full bg-red-100 text-red-800 font-bold text-sm animate-pulse">
                         LIVE MATCH
                     </span>
                 )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ScorecardTable teamName={teamA.name} scorecard={match.scorecard?.A} score={match.scoreA} overs={match.totalOvers} />
                <ScorecardTable teamName={teamB.name} scorecard={match.scorecard?.B} score={match.scoreB} overs={match.totalOvers} />
            </div>
        </div>
      </div>
    </div>
  );
};