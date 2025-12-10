import React from 'react';
import { Match, Team, MatchStatus } from '../types';
import { ballsFromOvers } from '../services/storageService';

interface Props {
  match: Match;
  teamA: Team;
  teamB: Team;
}

export const LiveDetailedCard: React.FC<Props> = ({ match, teamA, teamB }) => {
  // Determine which team is batting
  const isBattingB = match.scoreB.balls > 0 || (match.scoreA.balls === match.totalOvers * 6 && match.status !== MatchStatus.SCHEDULED) || match.status === MatchStatus.COMPLETED;
  const battingTeam = isBattingB ? teamB : teamA;
  const score = isBattingB ? match.scoreB : match.scoreA;

  // Use liveDetails from match, or defaults
  const details = match.liveDetails || {
    strikerName: 'Batsman 1', strikerRuns: 0, strikerBalls: 0,
    nonStrikerName: 'Batsman 2', nonStrikerRuns: 0, nonStrikerBalls: 0,
    bowlerName: 'Bowler', bowlerOvers: 0, bowlerRuns: 0, bowlerWickets: 0
  };

  // Helper to fetch live stats if available from scorecard
  const getPlayerRun = (pid: string, teamKey: 'A' | 'B') => {
      if (!match.scorecard) return { runs: 0, balls: 0 };
      const stats = match.scorecard[teamKey].batting.find(p => p.playerId === pid);
      return stats ? { runs: stats.runs, balls: stats.balls } : { runs: 0, balls: 0 };
  };

  const getBowlerStats = (pid: string, teamKey: 'A' | 'B') => {
      if (!match.scorecard) return { o: 0, r: 0, w: 0 };
      // Bowling team is opposite of batting teamKey
      const bowlingTeamKey = teamKey === 'A' ? 'B' : 'A';
      const stats = match.scorecard[bowlingTeamKey].bowling.find(p => p.playerId === pid);
      return stats ? { o: stats.overs, r: stats.runsConceded, w: stats.wickets } : { o: 0, r: 0, w: 0 };
  };
  
  const tk = isBattingB ? 'B' : 'A';
  const sStats = getPlayerRun(details.strikerId, tk);
  const nsStats = getPlayerRun(details.nonStrikerId, tk);
  const bStats = getBowlerStats(details.bowlerId, tk);

  // EQUATION LOGIC
  let equation = "";
  if (isBattingB && match.status !== MatchStatus.COMPLETED) {
      const target = match.scoreA.runs + 1;
      const runsNeeded = target - match.scoreB.runs;
      const totalBalls = match.totalOvers * 6;
      const ballsRem = totalBalls - match.scoreB.balls;
      
      if (runsNeeded <= 0) equation = "Scores Level";
      else equation = `Need ${runsNeeded} runs in ${ballsRem} balls`;
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden mb-6">
      {/* Header: Match Info */}
      <div className="bg-slate-900 text-white p-3 flex justify-between items-center text-sm">
         <span className="opacity-80">{match.type} • {match.groupStage}</span>
         <span className="flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span> LIVE
         </span>
      </div>

      <div className="p-4 sm:p-6">
        {/* Main Score Display */}
        <div className="flex justify-between items-center mb-6">
            <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                   <h2 className="text-xl sm:text-2xl font-bold text-slate-800">{battingTeam.name}</h2>
                   {isBattingB && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">Target: {match.scoreA.runs + 1}</span>}
                </div>
                <div className="text-4xl sm:text-5xl font-mono font-bold text-slate-900 tracking-tighter">
                    {score.runs}/{score.wickets}
                </div>
                <div className="text-slate-500 font-medium mt-1 text-sm sm:text-base flex items-center gap-2">
                    <span>Overs: {score.overs} <span className="text-slate-300">/ {match.totalOvers}</span></span>
                    {equation && <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded font-bold">{equation}</span>}
                </div>
            </div>
            <div className="text-right hidden sm:block">
                 <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-2xl font-bold text-slate-300 mx-auto mb-1">
                     {battingTeam.shortName[0]}
                 </div>
                 <span className="text-xs text-slate-400">Batting</span>
            </div>
        </div>

        {/* Detailed Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Batsmen Table */}
            <div className="bg-emerald-50 rounded-lg p-0 overflow-hidden border border-emerald-100">
                <div className="bg-emerald-100 px-4 py-2 text-xs font-bold text-emerald-800 uppercase tracking-wider flex justify-between">
                    <span>Batting</span>
                    <span className="w-20 text-right">R (B)</span>
                </div>
                <div className="px-4 py-3 border-b border-emerald-100/50 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">🏏</span>
                        <span className="font-semibold text-slate-800">{details.strikerName || 'Striker'} *</span>
                    </div>
                    <div className="font-mono font-bold text-slate-900 w-20 text-right">
                        {sStats.runs} <span className="text-slate-500 text-sm font-normal">({sStats.balls})</span>
                    </div>
                </div>
                <div className="px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span className="w-4"></span>
                        <span className="font-semibold text-slate-700">{details.nonStrikerName || 'Non-Striker'}</span>
                    </div>
                    <div className="font-mono font-bold text-slate-700 w-20 text-right">
                         {nsStats.runs} <span className="text-slate-400 text-sm font-normal">({nsStats.balls})</span>
                    </div>
                </div>
            </div>

            {/* Bowler Table */}
            <div className="bg-blue-50 rounded-lg p-0 overflow-hidden border border-blue-100">
                <div className="bg-blue-100 px-4 py-2 text-xs font-bold text-blue-800 uppercase tracking-wider flex justify-between">
                    <span>Bowling</span>
                    <span className="w-24 text-right">O-M-R-W</span>
                </div>
                <div className="px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-blue-600 font-bold">⚾</span>
                        <span className="font-semibold text-slate-800">{details.bowlerName || 'Bowler'}</span>
                    </div>
                    <div className="font-mono font-bold text-slate-900 w-24 text-right">
                        {bStats.o}-0-{bStats.r}-{bStats.w}
                    </div>
                </div>
                 <div className="px-4 py-2 bg-blue-50/50 text-xs text-blue-400 text-center italic">
                     Current Over in progress...
                 </div>
            </div>

        </div>

        {/* Current Run Rate */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between text-sm text-slate-600">
             <div>CRR: <span className="font-bold">{score.overs > 0 ? (score.runs / score.overs).toFixed(2) : '0.00'}</span></div>
             {isBattingB && (
                 <div className="font-mono font-bold text-slate-800">{equation}</div>
             )}
        </div>
      </div>
    </div>
  );
};