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
  const [activeTab, setActiveTab] = useState<'A' | 'B'>('A');

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
      <div className="space-y-6 animate-fade-in-up">
        {/* Batting Table */}
        <div>
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Batting: {battingTeam.name}</h4>
          <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm min-w-[450px]">
              <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase">
                <tr>
                  <th className="px-5 py-4">Batsman</th>
                  <th className="px-2 py-4 text-center">R</th>
                  <th className="px-2 py-4 text-center">B</th>
                  <th className="px-2 py-4 text-center">4s</th>
                  <th className="px-2 py-4 text-center">6s</th>
                  <th className="px-5 py-4 text-right">SR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {battingInnings.batting.map((b) => (
                  <tr key={b.playerId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900">{b.playerName}</div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{b.isOut ? (b.dismissal || 'Out') : 'Not Out'}</div>
                    </td>
                    <td className="px-2 py-4 text-center font-black text-slate-900">{b.runs}</td>
                    <td className="px-2 py-4 text-center text-slate-500">{b.balls}</td>
                    <td className="px-2 py-4 text-center text-slate-400">{b.fours}</td>
                    <td className="px-2 py-4 text-center text-slate-400">{b.sixes}</td>
                    <td className="px-5 py-4 text-right font-mono font-bold text-emerald-600">
                      {b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : '0.0'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50/50 font-black border-t">
                <tr>
                  <td className="px-5 py-3 text-slate-400 text-[9px] uppercase tracking-wider">Extras (W:{ex.wide} N:{ex.noBall} B:{ex.bye} L:{ex.legBye})</td>
                  <td className="px-2 py-3 text-center text-slate-900">{totalExtras}</td>
                  <td colSpan={4}></td>
                </tr>
                <tr className="bg-emerald-50/30">
                  <td className="px-5 py-5 text-emerald-800 uppercase tracking-[0.2em] text-[10px]">Total Score</td>
                  <td className="px-2 py-5 text-center text-2xl font-black text-emerald-700">{scoreSummary.runs}/{scoreSummary.wickets}</td>
                  <td className="px-2 py-5 text-center text-[10px] font-black text-emerald-600 uppercase" colSpan={4}>({scoreSummary.overs} Overs)</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Bowling Table */}
        <div>
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Bowling: {bowlingTeam.name}</h4>
          <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm min-w-[450px]">
              <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase">
                <tr>
                  <th className="px-5 py-4">Bowler</th>
                  <th className="px-2 py-4 text-center">O</th>
                  <th className="px-2 py-4 text-center font-black text-slate-900">M</th>
                  <th className="px-2 py-4 text-center">R</th>
                  <th className="px-2 py-4 text-center font-black text-blue-600">W</th>
                  <th className="px-5 py-4 text-right">Eco</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {bowlingStats.map((bw) => (
                  <tr key={bw.playerId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-800">{bw.playerName}</td>
                    <td className="px-2 py-4 text-center font-mono font-medium">{bw.overs}</td>
                    <td className="px-2 py-4 text-center font-black text-slate-900">{bw.maidens || 0}</td>
                    <td className="px-2 py-4 text-center text-slate-600">{bw.runsConceded}</td>
                    <td className="px-2 py-4 text-center font-black text-blue-600">{bw.wickets}</td>
                    <td className="px-5 py-4 text-right font-mono text-slate-400">
                      {bw.ballsBowled > 0 ? (bw.runsConceded / (bw.ballsBowled / 6)).toFixed(2) : '0.00'}
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
        <div className="px-6 py-5 border-b bg-white sticky top-0 z-10 flex justify-between items-center">
           <div className="min-w-0">
               <h3 className="font-black text-sm sm:text-lg uppercase tracking-tight truncate text-slate-900">
                   {teamA.name} <span className="text-slate-300">vs</span> {teamB.name}
               </h3>
               <div className="flex items-center gap-3 text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                 <span className="flex items-center gap-1"><Calendar size={10} className="text-emerald-500"/> {match.date}</span>
                 <span className="flex items-center gap-1"><MapPin size={10} className="text-emerald-500"/> {match.venue}</span>
               </div>
           </div>
           <button onClick={onClose} className="p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-500 transition-colors"><X size={20}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
            {match.status === MatchStatus.SCHEDULED ? (
                <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
                    <div className="text-slate-200 mb-4 flex justify-center"><Calendar size={64}/></div>
                    <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-xs">Match hasn't started yet</p>
                </div>
            ) : (
                <>
                  <div className="flex gap-2 p-1.5 bg-slate-200/50 rounded-2xl mb-8">
                      <button onClick={()=>setActiveTab('A')} className={`flex-1 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab==='A' ? 'bg-white shadow-lg text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}>
                          {teamA.name} <span className="ml-1 opacity-50">{match.scoreA.runs}/{match.scoreA.wickets}</span>
                      </button>
                      <button onClick={()=>setActiveTab('B')} className={`flex-1 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab==='B' ? 'bg-white shadow-lg text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}>
                          {teamB.name} <span className="ml-1 opacity-50">{match.scoreB.runs}/{match.scoreB.wickets}</span>
                      </button>
                  </div>
                  {renderInnings(activeTab)}
                </>
            )}
        </div>
        <div className="p-6 bg-white border-t border-slate-100 text-center">
             <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em]">Detailed Match Analytics • CricManage Pro</p>
        </div>
      </div>
    </div>
  );
};