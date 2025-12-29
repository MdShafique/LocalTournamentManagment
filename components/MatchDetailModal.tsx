import React, { useState } from 'react';
import { Match, Team, MatchStatus } from '../types';
import { X, Calendar, MapPin } from 'lucide-react';

interface Props {
  match: Match;
  teamA: Team;
  teamB: Team;
  onClose: () => void;
  onPlayerClick?: (playerId: string, teamId: string) => void;
}

export const MatchDetailModal: React.FC<Props> = ({ match, teamA, teamB, onClose, onPlayerClick }) => {
  const [activeInnings, setActiveInnings] = useState<'A' | 'B'>('A');

  const renderInnings = (teamKey: 'A' | 'B') => {
    const battingTeam = teamKey === 'A' ? teamA : teamB;
    const bowlingTeam = teamKey === 'A' ? teamB : teamA;
    
    const battingInnings = match.scorecard?.[teamKey] || { batting: [], bowling: [], extras: { wide: 0, noBall: 0, bye: 0, legBye: 0 } };
    const bowlingInnings = teamKey === 'A' ? match.scorecard?.B : match.scorecard?.A;
    const bowlingStats = bowlingInnings?.bowling || [];
    
    const ex = battingInnings.extras || { wide: 0, noBall: 0, bye: 0, legBye: 0 };
    const totalExtras = (Number(ex.wide) || 0) + (Number(ex.noBall) || 0) + (Number(ex.bye) || 0) + (Number(ex.legBye) || 0);
    const scoreSummary = teamKey === 'A' ? match.scoreA : match.scoreB;

    return (
      <div className="space-y-4 sm:space-y-5 animate-fade-in-up">
        {/* Batting Table - Fixed Layout for Zero Scroll */}
        <div>
          <h4 className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Batting: {battingTeam.name}</h4>
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 overflow-hidden shadow-sm w-full">
            <table className="w-full text-left text-[10px] sm:text-sm table-fixed">
              <thead className="bg-slate-50 text-[8px] sm:text-[9px] font-black text-slate-400 uppercase">
                <tr>
                  <th className="px-2 py-3 sm:px-5 w-auto">Batsman</th>
                  <th className="px-0.5 py-3 text-center w-8 sm:w-12">R</th>
                  <th className="px-0.5 py-3 text-center w-8 sm:w-12">B</th>
                  <th className="px-0.5 py-3 text-center w-6 sm:w-10">4s</th>
                  <th className="px-0.5 py-3 text-center w-6 sm:w-10">6s</th>
                  <th className="px-1 py-3 text-right w-11 sm:w-20">SR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {battingInnings.batting.map((b) => (
                  <tr key={b.playerId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-2 py-3 sm:px-5 truncate">
                      <div className="font-bold text-slate-900 truncate">{b.playerName}</div>
                      <div className="text-[7px] sm:text-[9px] text-slate-400 font-bold uppercase tracking-tight truncate">
                          {b.isOut ? (b.dismissal || 'Out') : 'Not Out'}
                      </div>
                    </td>
                    <td className="px-0.5 py-3 text-center font-black text-slate-900">{b.runs}</td>
                    <td className="px-0.5 py-3 text-center text-slate-400">{b.balls}</td>
                    <td className="px-0.5 py-3 text-center text-slate-300">{b.fours}</td>
                    <td className="px-0.5 py-3 text-center text-slate-300">{b.sixes}</td>
                    <td className="px-1 py-3 text-right font-mono font-bold text-emerald-600">
                      {b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : '0.0'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50/50 font-black border-t">
                <tr className="bg-emerald-50/30">
                  <td className="px-2 py-3 sm:px-5 truncate">
                    <span className="text-emerald-800 uppercase tracking-widest text-[8px] sm:text-[10px]">Total Score</span>
                    <div className="text-[7px] text-slate-400 font-bold uppercase mt-0.5">Extras: {totalExtras}</div>
                  </td>
                  <td className="px-0.5 py-3 text-center text-base sm:text-2xl font-black text-emerald-700">{scoreSummary.runs}/{scoreSummary.wickets}</td>
                  <td className="px-2 py-3 text-right text-[8px] sm:text-[10px] font-black text-emerald-600 uppercase" colSpan={4}>({scoreSummary.overs})</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Bowling Table - Fixed Layout for Zero Scroll */}
        <div>
          <h4 className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Bowling: {bowlingTeam.name}</h4>
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 overflow-hidden shadow-sm w-full">
            <table className="w-full text-left text-[10px] sm:text-sm table-fixed">
              <thead className="bg-slate-50 text-[8px] sm:text-[9px] font-black text-slate-400 uppercase">
                <tr>
                  <th className="px-2 py-3 sm:px-5 w-auto">Bowler</th>
                  <th className="px-0.5 py-3 text-center w-10 sm:w-12">O</th>
                  <th className="px-0.5 py-3 text-center w-6 sm:w-10">M</th>
                  <th className="px-0.5 py-3 text-center w-8 sm:w-12">R</th>
                  <th className="px-0.5 py-3 text-center w-8 sm:w-12">W</th>
                  <th className="px-1 py-3 text-right w-11 sm:w-20">Eco</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {bowlingStats.map((bw) => (
                  <tr key={bw.playerId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-2 py-3 sm:px-5 font-bold text-slate-800 truncate">{bw.playerName}</td>
                    <td className="px-0.5 py-3 text-center font-mono">{bw.overs}</td>
                    <td className="px-0.5 py-3 text-center font-bold text-slate-900">{bw.maidens || 0}</td>
                    <td className="px-0.5 py-3 text-center text-slate-600">{bw.runsConceded}</td>
                    <td className="px-0.5 py-3 text-center font-black text-blue-600">{bw.wickets}</td>
                    <td className="px-1 py-3 text-right font-mono text-slate-400">
                      {bw.ballsBowled > 0 ? (bw.runsConceded / (bw.ballsBowled / 6)).toFixed(1) : '0.0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-[70] p-0 sm:p-4">
      <div className="bg-slate-50 sm:rounded-[2.5rem] shadow-2xl w-full h-full sm:h-[90vh] max-w-3xl flex flex-col overflow-hidden">
        <div className="px-4 py-4 sm:px-8 sm:py-6 border-b bg-white sticky top-0 z-10 flex justify-between items-center">
           <div className="min-w-0 pr-2">
               <h3 className="font-black text-xs sm:text-xl uppercase tracking-tighter truncate text-slate-900 leading-tight">
                   {teamA.name} <span className="text-slate-300 mx-1">VS</span> {teamB.name}
               </h3>
               <div className="flex items-center gap-2 text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                 <span className="flex items-center gap-1"><Calendar size={10} className="text-emerald-500"/> {match.date}</span>
                 <span className="flex items-center gap-1"><MapPin size={10} className="text-emerald-500"/> {match.venue}</span>
               </div>
           </div>
           <button onClick={onClose} className="p-2.5 sm:p-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors shrink-0"><X size={18}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-8">
            {match.status === MatchStatus.SCHEDULED ? (
                <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
                    <div className="text-slate-200 mb-4 flex justify-center"><Calendar size={48}/></div>
                    <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px]">Match hasn't started yet</p>
                </div>
            ) : (
                <>
                  <div className="flex gap-1.5 p-1 bg-slate-200/50 rounded-xl sm:rounded-2xl mb-6">
                      <button onClick={()=>setActiveInnings('A')} className={`flex-1 py-3 rounded-lg sm:rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest transition-all truncate px-1 ${activeInnings==='A' ? 'bg-white shadow-md text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}>
                          {teamA.name} <span className="ml-1 opacity-50">{match.scoreA.runs}/{match.scoreA.wickets}</span>
                      </button>
                      <button onClick={()=>setActiveInnings('B')} className={`flex-1 py-3 rounded-lg sm:rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest transition-all truncate px-1 ${activeInnings==='B' ? 'bg-white shadow-md text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}>
                          {teamB.name} <span className="ml-1 opacity-50">{match.scoreB.runs}/{match.scoreB.wickets}</span>
                      </button>
                  </div>
                  {renderInnings(activeInnings)}
                </>
            )}
        </div>
        <div className="px-6 py-3 bg-white border-t border-slate-100 text-center">
             <p className="text-[7px] font-black text-slate-300 uppercase tracking-[0.5em]">Live Match Analytics • CricManage Pro</p>
        </div>
      </div>
    </div>
  );
};