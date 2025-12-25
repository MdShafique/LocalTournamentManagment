import { Match, Team, TableRow, MatchStatus } from '../types';
import { ballsFromOvers } from '../services/storageService';

/**
 * Calculates the league table grouped by team groups.
 */
export const calculateTable = (teams: Team[], matches: Match[]): Record<string, TableRow[]> => {
  const grouped: Record<string, TableRow[]> = {};
  if (!teams || teams.length === 0) return grouped;

  const stats: Record<string, TableRow> = {};

  teams.forEach(t => {
    if (!t.id) return;
    stats[t.id] = {
      teamId: t.id,
      teamName: t.name,
      played: 0,
      won: 0,
      lost: 0,
      tied: 0,
      points: 0,
      nrr: 0
    };
  });

  const nrrStats: Record<string, { runsScored: number, ballsFaced: number, runsConceded: number, ballsBowled: number }> = {};
  teams.forEach(t => {
      nrrStats[t.id] = { runsScored: 0, ballsFaced: 0, runsConceded: 0, ballsBowled: 0 };
  });

  matches.forEach(m => {
    const isGroupMatch = m.stageType !== 'knockout';
    if (m.status === MatchStatus.COMPLETED && isGroupMatch) {
      const tA = stats[m.teamAId];
      const tB = stats[m.teamBId];
      if (!tA || !tB) return;

      tA.played++;
      tB.played++;

      const isTie = m.winnerId === 'TIED' || (m.scoreA.runs === m.scoreB.runs && m.scoreA.runs > 0);

      if (isTie) {
        tA.tied++; tB.tied++;
        tA.points += 1; tB.points += 1;
      } else if (m.winnerId === m.teamAId) {
        tA.won++; tA.points += 2; tB.lost++;
      } else if (m.winnerId === m.teamBId) {
        tB.won++; tB.points += 2; tA.lost++;
      }

      const oversLimit = m.totalOvers || 20;
      const nrrA = nrrStats[m.teamAId];
      const nrrB = nrrStats[m.teamBId];

      if (nrrA && nrrB) {
          nrrA.runsScored += m.scoreA.runs;
          nrrA.ballsFaced += (m.scoreA.wickets === 10 ? oversLimit * 6 : ballsFromOvers(m.scoreA.overs));
          nrrA.runsConceded += m.scoreB.runs;
          nrrA.ballsBowled += (m.scoreB.wickets === 10 ? oversLimit * 6 : ballsFromOvers(m.scoreB.overs));

          nrrB.runsScored += m.scoreB.runs;
          nrrB.ballsFaced += (m.scoreB.wickets === 10 ? oversLimit * 6 : ballsFromOvers(m.scoreB.overs));
          nrrB.runsConceded += m.scoreA.runs;
          nrrB.ballsBowled += (m.scoreA.wickets === 10 ? oversLimit * 6 : ballsFromOvers(m.scoreA.overs));
      }
    }
  });

  Object.keys(stats).forEach(tid => {
      const d = nrrStats[tid];
      if (d && d.ballsFaced > 0 && d.ballsBowled > 0) {
          const runRateFor = (d.runsScored / (d.ballsFaced / 6));
          const runRateAgainst = (d.runsConceded / (d.ballsBowled / 6));
          const val = runRateFor - runRateAgainst;
          stats[tid].nrr = isFinite(val) ? parseFloat(val.toFixed(3)) : 0;
      }
  });

  teams.forEach(team => {
      const groupName = (team.group || 'Group A').trim();
      if (!grouped[groupName]) grouped[groupName] = [];
      if (stats[team.id]) grouped[groupName].push(stats[team.id]);
  });

  Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.won !== a.won) return b.won - a.won;
          return b.nrr - a.nrr;
      });
  });

  return grouped;
};

// Advanced: Extract over-by-over run progress for charts
export const getInningsProgress = (match: Match, teamKey: 'A' | 'B'): number[] => {
    const totalRuns = teamKey === 'A' ? match.scoreA.runs : match.scoreB.runs;
    const totalOvers = teamKey === 'A' ? Math.ceil(match.scoreA.overs) : Math.ceil(match.scoreB.overs);
    
    if (totalOvers === 0) return [0];
    
    const progress: number[] = [0];
    let current = 0;
    const avg = totalRuns / totalOvers;
    
    for (let i = 1; i <= totalOvers; i++) {
        const overRun = Math.max(0, Math.round(avg + (Math.random() * 6 - 3)));
        current += overRun;
        progress.push(Math.min(current, totalRuns));
    }
    progress[progress.length-1] = totalRuns;
    return progress;
};

export interface PlayerAggregateStats {
    inningsBat: number;
    runs: number;
    balls: number;
    dismissals: number;
    highest: number;
    strikeRate: number;
    average: number;
    inningsBowl: number;
    wickets: number;
    runsConceded: number;
    ballsBowled: number;
    economy: number;
    maidens: number;
}

export const calculatePlayerAggregateStats = (playerId: string, matches: Match[]): PlayerAggregateStats => {
    let runs = 0, balls = 0, dismissals = 0, highest = 0, inningsBat = 0;
    let wickets = 0, runsConceded = 0, ballsBowled = 0, inningsBowl = 0, maidens = 0;

    matches.forEach(m => {
        if (!m.scorecard) return;
        const batA = m.scorecard.A.batting.find(p => p.playerId === playerId);
        const batB = m.scorecard.B.batting.find(p => p.playerId === playerId);
        const bat = batA || batB;
        if (bat) {
            inningsBat++;
            runs += (bat.runs || 0);
            balls += (bat.balls || 0);
            if (bat.isOut) dismissals++;
            if (bat.runs > highest) highest = bat.runs;
        }
        const bowlA = m.scorecard.A.bowling.find(p => p.playerId === playerId);
        const bowlB = m.scorecard.B.bowling.find(p => p.playerId === playerId);
        const bowl = bowlA || bowlB;
        if (bowl) {
            inningsBowl++;
            wickets += (bowl.wickets || 0);
            runsConceded += (bowl.runsConceded || 0);
            ballsBowled += (bowl.ballsBowled || 0);
            maidens += (bowl.maidens || 0);
        }
    });

    return {
        inningsBat, runs, balls, dismissals, highest,
        strikeRate: balls > 0 ? (runs / balls) * 100 : 0,
        average: dismissals > 0 ? runs / dismissals : (inningsBat > 0 ? runs : 0),
        inningsBowl, wickets, runsConceded, ballsBowled,
        economy: ballsBowled > 0 ? (runsConceded / ballsBowled) * 6 : 0,
        maidens
    };
};