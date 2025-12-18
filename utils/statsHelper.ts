
import { Match, Team, TableRow, MatchStatus, Player } from '../types';
import { ballsFromOvers } from '../services/storageService';

export const calculateTable = (teams: Team[], matches: Match[]): TableRow[] => {
  const stats: Record<string, TableRow> = {};

  // Initialize
  teams.forEach(t => {
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
    if (m.status === MatchStatus.COMPLETED && m.winnerId) {
      if (!stats[m.teamAId] || !stats[m.teamBId]) return;

      stats[m.teamAId].played++;
      stats[m.teamBId].played++;

      if (m.winnerId === m.teamAId) {
        stats[m.teamAId].won++;
        stats[m.teamAId].points += 2;
        stats[m.teamBId].lost++;
      } else if (m.winnerId === m.teamBId) {
        stats[m.teamBId].won++;
        stats[m.teamBId].points += 2;
        stats[m.teamAId].lost++;
      } else {
        stats[m.teamAId].tied++;
        stats[m.teamBId].tied++;
        stats[m.teamAId].points += 1;
        stats[m.teamBId].points += 1;
      }

      nrrStats[m.teamAId].runsScored += m.scoreA.runs;
      nrrStats[m.teamAId].ballsFaced += (m.scoreA.wickets === 10 ? m.totalOvers * 6 : ballsFromOvers(m.scoreA.overs));
      nrrStats[m.teamAId].runsConceded += m.scoreB.runs;
      nrrStats[m.teamAId].ballsBowled += (m.scoreB.wickets === 10 ? m.totalOvers * 6 : ballsFromOvers(m.scoreB.overs));

      nrrStats[m.teamBId].runsScored += m.scoreB.runs;
      nrrStats[m.teamBId].ballsFaced += (m.scoreB.wickets === 10 ? m.totalOvers * 6 : ballsFromOvers(m.scoreB.overs));
      nrrStats[m.teamBId].runsConceded += m.scoreA.runs;
      nrrStats[m.teamBId].ballsBowled += (m.scoreA.wickets === 10 ? m.totalOvers * 6 : ballsFromOvers(m.scoreA.overs));
    }
  });

  Object.keys(stats).forEach(tid => {
      const d = nrrStats[tid];
      if (d.ballsFaced > 0 && d.ballsBowled > 0) {
          const runRateFor = (d.runsScored / d.ballsFaced) * 6;
          const runRateAgainst = (d.runsConceded / d.ballsBowled) * 6;
          stats[tid].nrr = parseFloat((runRateFor - runRateAgainst).toFixed(3));
      }
  });

  return Object.values(stats).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.nrr - a.nrr;
  });
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
}

export const calculatePlayerAggregateStats = (playerId: string, matches: Match[]): PlayerAggregateStats => {
    let runs = 0, balls = 0, dismissals = 0, highest = 0, inningsBat = 0;
    let wickets = 0, runsConceded = 0, ballsBowled = 0, inningsBowl = 0;

    matches.forEach(m => {
        if (!m.scorecard) return;
        
        // Batting lookup
        const batA = m.scorecard.A.batting.find(p => p.playerId === playerId);
        const batB = m.scorecard.B.batting.find(p => p.playerId === playerId);
        const bat = batA || batB;

        if (bat) {
            inningsBat++;
            runs += bat.runs;
            balls += bat.balls;
            if (bat.isOut) dismissals++;
            if (bat.runs > highest) highest = bat.runs;
        }

        // Bowling lookup
        const bowlA = m.scorecard.A.bowling.find(p => p.playerId === playerId);
        const bowlB = m.scorecard.B.bowling.find(p => p.playerId === playerId);
        const bowl = bowlA || bowlB;

        if (bowl) {
            inningsBowl++;
            wickets += bowl.wickets;
            runsConceded += bowl.runsConceded;
            ballsBowled += bowl.ballsBowled;
        }
    });

    return {
        inningsBat,
        runs,
        balls,
        dismissals,
        highest,
        strikeRate: balls > 0 ? (runs / balls) * 100 : 0,
        average: dismissals > 0 ? runs / dismissals : (inningsBat > 0 ? runs : 0),
        inningsBowl,
        wickets,
        runsConceded,
        ballsBowled,
        economy: ballsBowled > 0 ? (runsConceded / ballsBowled) * 6 : 0
    };
};
