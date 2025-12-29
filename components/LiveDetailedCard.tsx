import React from 'react';
import { Match, Team, MatchStatus } from '../types';
import { Activity, Zap, UserX, History, Target } from 'lucide-react';

interface Props {
  match: Match;
  teamA: Team;
  teamB: Team;
}

export const LiveDetailedCard: React.FC<Props> = ({ match, teamA, teamB }) => {
  // Logic to determine which innings is active
  const isBattingB = match.scoreB.balls > 0 || (match.scoreA.balls === match.totalOvers * 6 && match.status !== MatchStatus.SCHEDULED) || match.status === MatchStatus.COMPLETED;
  
  const battingTeam = isBattingB ? teamB : teamA;
  const bowlingTeam = isBattingB ? teamA : teamB;
  const score = isBattingB ? match.scoreB : match.scoreA;
  
  const scorecardKey = isBattingB ? 'B' : 'A';
  const bowlingKey = isBattingB ? 'A' : 'B';
  
  const currentInningsCard = match.scorecard?.[scorecardKey];
  const bowlingInningsCard = match.scorecard?.[bowlingKey];
  
  const extras = currentInningsCard?.extras || { wide: 0, noBall: 0, bye: 0, legBye: 0 };
  const totalExtras = (Object.values(extras) as number[]).reduce((a, b) => (Number(a) || 0) + (Number(b) || 0), 0);

  const details = match.liveDetails || {
    strikerId: '', strikerName: 'Striker',
    nonStrikerId: '', nonStrikerName: 'Non-Striker',
    bowlerId: '', bowlerName: 'Bowler'
  };

  const getPlayerRun = (pid: string, teamKey: 'A' | 'B') => {
      if (!match.scorecard || !pid || !match.scorecard[teamKey]) return { runs: 0, balls: 0 };
      const stats = match.scorecard[teamKey].batting?.find(p => p.playerId === pid);
      return stats ? { runs: stats.runs, balls: stats.balls } : { runs: 0, balls: 0 };
  };

  const getBowlerStats = (pid: string, teamKey: 'A' | 'B') => {
      if (!match.scorecard || !pid || !match.scorecard[teamKey]) return { o: 0, m: 0, r: 0, w: 0 };
      const stats = match.scorecard[teamKey].bowling?.find(p => p.playerId === pid);
      return stats ? { o: stats.overs, m: stats.maidens || 0, r: stats.runsConceded, w: stats.wickets } : { o: 0, m: 0, r: 0, w: 0 };
  };
  
  const tk = isBattingB ? 'B' : 'A';
  const sStats = getPlayerRun(details.strikerId, tk);
  const nsStats = getPlayerRun(details.nonStrikerId, tk);
  const bStats = getBowlerStats(details.bowlerId, bowlingKey);

  const sName = details.strikerId ? (battingTeam.players?.find(p=>p.id===details.strikerId)?.name || details.strikerName || 'Striker') : 'Striker';
  const nsName = details.nonStrikerId ? (battingTeam.players?.find(p=>p.id===details.nonStrikerId)?.name || details.nonStrikerName || 'Non-Striker') : 'Non-Striker';
  const bName = details.bowlerId ? (bowlingTeam.players?.find(p=>p.id===details.bowlerId)?.name || details.bowlerName || 'Bowler') : 'Bowler';

  // Last Out Batsman Logic
  const battingList = currentInningsCard?.batting || [];
  const lastOut = [...battingList].reverse().find(b => b.isOut);

  // Last Bowler Logic
  const bowlingList = bowlingInningsCard?.bowling || [];
  const prevBowler = [...bowlingList].reverse().find(b => b.playerId !== details.bowlerId && b.ballsBowled > 0);

  // Rates Logic
  const crr = score.balls > 0 ? ((score.runs * 6) / score.balls).toFixed(2) : '0.00';
  
  // 2nd Innings specific logic
  const target = match.scoreA.runs + 1;
  const runsNeeded = target - match.scoreB.runs;
  const totalMatchBalls = (match.totalOvers || 20) * 6;
  const ballsLeft = Math.max(0, totalMatchBalls - match.scoreB.balls);
  const rrr = ballsLeft > 0 ? ((runsNeeded * 6) / ballsLeft).toFixed(2) : (runsNeeded <= 0 ? '0.00' : '∞');

  return (
    <div className="bg-slate-900 rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden mb-8 text-white relative group">
      <div className="p-5 sm:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div className="w-full">
                <div className="flex justify-between items-center mb-1">
                  <h2 className="text-xl sm:text-3xl font-black uppercase tracking-tighter truncate max-w-[60%]">{battingTeam.name}</h2>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 rounded-full border border-emerald-500/30">
                    <Zap size={10} className="text-emerald-400 fill-emerald-400" />
                    <span className="text-[9px] sm:text-xs font-black text-emerald-400 uppercase tracking-widest whitespace-nowrap">
                      CRR: {crr} {isBattingB && `| RRR: ${rrr}`}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-baseline gap-2 sm:gap-4">
                    <div className="text-4xl sm:text-7xl font-black tracking-tighter text-white">
                        {score.runs}/{score.wickets}
                    </div>
                    <span className="text-emerald-400 font-black text-sm sm:text-lg">{score.overs} <span className="text-white/20 text-[8px] sm:text-xs uppercase">OVERS</span></span>
                </div>

                {/* Requirement display for 2nd innings */}
                {isBattingB && match.status !== MatchStatus.COMPLETED && (
                    <div className="mt-2 flex items-center gap-2 text-yellow-400 animate-pulse">
                        <Target size={14} />
                        <span className="text-xs sm:text-sm font-black uppercase tracking-widest">
                            Need {runsNeeded} runs in {ballsLeft} balls
                        </span>
                    </div>
                )}
                
                <div className="mt-4 flex flex-wrap gap-2 text-[8px] sm:text-[10px] font-black text-white/40 uppercase tracking-widest bg-white/5 px-3 py-2 rounded-xl border border-white/5">
                    <span className="flex items-center gap-1"><Activity size={10} className="text-emerald-500" /> Extras: <span className="text-white/80">{totalExtras}</span></span>
                    <span className="opacity-50">(W:{extras.wide} N:{extras.noBall} B:{extras.bye} L:{extras.legBye})</span>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Batters List */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 group-hover:bg-white/10 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex justify-between text-[8px] uppercase tracking-widest text-white/40 mb-3 font-black">
                      <span>Batter</span><span>R (B)</span>
                  </div>
                  <div className="space-y-2 mb-4">
                      <div className="flex justify-between items-center text-xs sm:text-sm">
                          <span className="font-black truncate max-w-[150px]">{sName} *</span>
                          <span className="font-black text-emerald-400">{sStats.runs} ({sStats.balls})</span>
                      </div>
                      <div className="flex justify-between items-center text-xs sm:text-sm text-white/60">
                          <span className="truncate max-w-[150px]">{nsName}</span>
                          <span>{nsStats.runs} ({nsStats.balls})</span>
                      </div>
                  </div>
                </div>

                {/* Last Out Display */}
                {lastOut && (
                  <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white/30">
                      <UserX size={12} />
                      <span className="text-[9px] font-black uppercase tracking-widest">Last Wicket</span>
                    </div>
                    <div className="text-[10px] font-bold text-white/40 truncate text-right">
                       {lastOut.playerName} {lastOut.runs}({lastOut.balls})
                    </div>
                  </div>
                )}
            </div>

            {/* Bowler List */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 group-hover:bg-white/10 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex justify-between text-[8px] uppercase tracking-widest text-white/40 mb-3 font-black">
                      <span>Bowler</span><span>O-M-R-W</span>
                  </div>
                  <div className="flex justify-between items-center text-xs sm:text-sm mb-4">
                      <span className="font-black truncate max-w-[150px]">{bName}</span>
                      <span className="font-black text-emerald-400">
                          {bStats.o}-{bStats.m}-{bStats.r}-{bStats.w}
                      </span>
                  </div>
                </div>

                {/* Previous Bowler Display */}
                {prevBowler && (
                  <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white/30">
                      <History size={12} />
                      <span className="text-[9px] font-black uppercase tracking-widest">Last Bowler</span>
                    </div>
                    <div className="text-[10px] font-bold text-white/40 truncate text-right">
                       {prevBowler.playerName} {prevBowler.overs}-{prevBowler.maidens || 0}-{prevBowler.runsConceded}-{prevBowler.wickets}
                    </div>
                  </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};