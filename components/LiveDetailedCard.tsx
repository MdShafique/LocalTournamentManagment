import React from 'react';
import { Match, Team, MatchStatus } from '../types';
import { PlusCircle } from 'lucide-react';

interface Props {
  match: Match;
  teamA: Team;
  teamB: Team;
}

export const LiveDetailedCard: React.FC<Props> = ({ match, teamA, teamB }) => {
  const isBattingB = match.scoreB.balls > 0 || (match.scoreA.balls === match.totalOvers * 6 && match.status !== MatchStatus.SCHEDULED) || match.status === MatchStatus.COMPLETED;
  const battingTeam = isBattingB ? teamB : teamA;
  const score = isBattingB ? match.scoreB : match.scoreA;
  
  const scorecardKey = isBattingB ? 'B' : 'A';
  const currentInningsCard = match.scorecard?.[scorecardKey];
  const extras = currentInningsCard?.extras || { wide: 0, noBall: 0, bye: 0, legBye: 0 };
  const totalExtras = Object.values(extras).reduce((a, b) => a + b, 0);

  const details = match.liveDetails || {
    strikerId: '', strikerName: 'Batsman 1',
    nonStrikerId: '', nonStrikerName: 'Batsman 2',
    bowlerId: '', bowlerName: 'Bowler'
  };

  const getPlayerRun = (pid: string, teamKey: 'A' | 'B') => {
      if (!match.scorecard) return { runs: 0, balls: 0 };
      const stats = match.scorecard[teamKey].batting.find(p => p.playerId === pid);
      return stats ? { runs: stats.runs, balls: stats.balls } : { runs: 0, balls: 0 };
  };

  const getBowlerStats = (pid: string, teamKey: 'A' | 'B') => {
      if (!match.scorecard) return { o: 0, m: 0, r: 0, w: 0 };
      const bowlingTeamKey = teamKey === 'A' ? 'B' : 'A';
      const stats = match.scorecard[bowlingTeamKey].bowling.find(p => p.playerId === pid);
      return stats ? { o: stats.overs, m: stats.maidens || 0, r: stats.runsConceded, w: stats.wickets } : { o: 0, m: 0, r: 0, w: 0 };
  };
  
  const tk = isBattingB ? 'B' : 'A';
  const sStats = getPlayerRun(details.strikerId, tk);
  const nsStats = getPlayerRun(details.nonStrikerId, tk);
  const bStats = getBowlerStats(details.bowlerId, tk);

  let equation = "";
  let rrr = 0;
  if (isBattingB && match.status !== MatchStatus.COMPLETED) {
      const target = match.scoreA.runs + 1;
      const runsNeeded = target - match.scoreB.runs;
      const totalBalls = match.totalOvers * 6;
      const ballsRem = totalBalls - match.scoreB.balls;
      
      if (runsNeeded <= 0) equation = "Scores Level";
      else {
          equation = `Need ${runsNeeded} runs in ${ballsRem} balls`;
          rrr = ballsRem > 0 ? (runsNeeded / ballsRem) * 6 : 0;
      }
  }

  const crr = score.overs > 0 ? (score.runs / score.overs) : 0;

  const getPlayerImage = (playerId: string) => {
      if (!playerId) return undefined;
      const p = teamA.players?.find(pl => pl.id === playerId) || teamB.players?.find(pl => pl.id === playerId);
      return p?.image;
  };

  return (
    <div className="bg-slate-900 rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden mb-8 text-white relative group">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 to-blue-600/10 pointer-events-none"></div>
      
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-md px-4 sm:px-8 py-3 sm:py-4 flex justify-between items-center border-b border-white/5">
         <div className="flex items-center gap-2">
             <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]"></span>
             <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-white/60">Live Match Center</span>
         </div>
         <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-2 sm:px-3 py-1 rounded-full border border-emerald-400/20">{match.type}</span>
      </div>

      <div className="p-5 sm:p-8 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-8 mb-8 sm:mb-10">
            <div>
                <h2 className="text-xl sm:text-3xl font-black uppercase tracking-tighter mb-1 sm:mb-2 text-white/90 truncate max-w-[250px] sm:max-w-none">{battingTeam.name}</h2>
                <div className="flex flex-col items-start">
                    <div className="flex items-baseline gap-2 sm:gap-4">
                        <div className="text-4xl sm:text-7xl font-black tracking-tighter leading-none bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                            {score.runs}/{score.wickets}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-emerald-400 font-black text-sm sm:text-lg leading-none">{score.overs} <span className="text-white/20 text-[8px] sm:text-xs uppercase tracking-widest ml-0.5">Overs</span></span>
                        </div>
                    </div>
                    {/* Extras display responsive */}
                    <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3 text-[8px] sm:text-[10px] font-black text-white/40 uppercase tracking-widest bg-white/5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl border border-white/5">
                        <PlusCircle size={10} className="text-emerald-500 sm:w-3 sm:h-3"/>
                        <span>Extras: <span className="text-white/80">{totalExtras}</span></span>
                        <div className="hidden xs:block w-[1px] h-3 bg-white/10"></div>
                        <span className="xs:inline-block">(W:{extras.wide} NB:{extras.noBall} B:{extras.bye} LB:{extras.legBye})</span>
                    </div>
                </div>
            </div>
            
            {/* Win Probability / Equation UI */}
            {isBattingB && (
                <div className="bg-white/5 border border-white/10 p-4 sm:p-6 rounded-2xl sm:rounded-3xl backdrop-blur-xl w-full md:w-auto shadow-2xl">
                    <div className="flex flex-col gap-1">
                        <span className="text-[9px] sm:text-[10px] font-black text-white/60 uppercase tracking-widest">{equation}</span>
                        <div className="flex gap-4 mt-2">
                            <div>
                                <p className="text-[8px] sm:text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-0.5">CRR</p>
                                <p className="text-base sm:text-xl font-black">{crr.toFixed(2)}</p>
                            </div>
                            <div className="w-[1px] bg-white/10"></div>
                            <div>
                                <p className="text-[8px] sm:text-[9px] font-black text-orange-400 uppercase tracking-widest mb-0.5">RRR</p>
                                <p className="text-base sm:text-xl font-black">{rrr.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-white/5 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-white/10 hover:bg-white/[0.08] transition-colors">
                <div className="flex justify-between items-center mb-3 sm:mb-4 opacity-50 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em]">
                    <span>Batter</span>
                    <span>R (B)</span>
                </div>
                <div className="space-y-3 sm:space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-white/10 flex items-center justify-center font-bold overflow-hidden border border-white/10 shadow-lg">
                                {getPlayerImage(details.strikerId) ? <img src={getPlayerImage(details.strikerId)} className="w-full h-full object-cover"/> : <span className="text-[10px]">S</span>}
                            </div>
                            <span className="font-black text-xs sm:text-sm uppercase tracking-tight truncate max-w-[120px] sm:max-w-none">{details.strikerName} *</span>
                        </div>
                        <span className="font-black text-emerald-400 text-sm sm:text-base">{sStats.runs} <span className="text-white/40 text-[10px] sm:text-xs font-bold">({sStats.balls})</span></span>
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-white/10 flex items-center justify-center font-bold overflow-hidden border border-white/10 opacity-60">
                                {getPlayerImage(details.nonStrikerId) ? <img src={getPlayerImage(details.nonStrikerId)} className="w-full h-full object-cover"/> : <span className="text-[10px]">NS</span>}
                            </div>
                            <span className="font-bold text-xs sm:text-sm uppercase tracking-tight text-white/60 truncate max-w-[120px] sm:max-w-none">{details.nonStrikerName}</span>
                        </div>
                        <span className="font-bold text-white/60 text-sm sm:text-base">{nsStats.runs} <span className="text-white/20 text-[10px] sm:text-xs font-normal">({nsStats.balls})</span></span>
                    </div>
                </div>
            </div>

            <div className="bg-white/5 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-white/10 hover:bg-white/[0.08] transition-colors">
                <div className="flex justify-between items-center mb-3 sm:mb-4 opacity-50 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em]">
                    <span>Bowler</span>
                    <span>O-M-R-W</span>
                </div>
                <div className="flex justify-between items-center h-full">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white/10 flex items-center justify-center font-bold overflow-hidden border border-white/10 shadow-lg">
                            {getPlayerImage(details.bowlerId) ? <img src={getPlayerImage(details.bowlerId)} className="w-full h-full object-cover"/> : <span className="text-[10px]">B</span>}
                        </div>
                        <div className="truncate max-w-[100px] sm:max-w-none">
                            <span className="font-black text-xs sm:text-sm uppercase tracking-tight block truncate">{details.bowlerName}</span>
                            <span className="text-[8px] sm:text-[10px] font-black text-emerald-400 uppercase tracking-widest">Active Over</span>
                        </div>
                    </div>
                    <span className="font-black text-lg sm:text-xl tracking-tighter whitespace-nowrap">
                        {bStats.o}-{bStats.m}-<span className="text-red-400">{bStats.r}</span>-<span className="text-blue-400">{bStats.w}</span>
                    </span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};