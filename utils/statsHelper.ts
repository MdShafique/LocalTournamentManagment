import { Match, Team, TableRow, MatchStatus } from '../types';
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

  // Temporary storage for NRR calc
  const nrrStats: Record<string, { runsScored: number, ballsFaced: number, runsConceded: number, ballsBowled: number }> = {};
  teams.forEach(t => {
      nrrStats[t.id] = { runsScored: 0, ballsFaced: 0, runsConceded: 0, ballsBowled: 0 };
  });

  matches.forEach(m => {
    if (m.status === MatchStatus.COMPLETED && m.winnerId) {
      if (!stats[m.teamAId] || !stats[m.teamBId]) return;

      stats[m.teamAId].played++;
      stats[m.teamBId].played++;

      // Points
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

      // NRR Data Accumulation
      // Note: In real ICC rules, if a team is all out, balls faced is treated as full quota of overs.
      // For simplicity here, we use actual balls unless all out logic is added strictly.
      
      // Team A stats
      nrrStats[m.teamAId].runsScored += m.scoreA.runs;
      nrrStats[m.teamAId].ballsFaced += (m.scoreA.wickets === 10 ? m.totalOvers * 6 : ballsFromOvers(m.scoreA.overs));
      nrrStats[m.teamAId].runsConceded += m.scoreB.runs;
      nrrStats[m.teamAId].ballsBowled += (m.scoreB.wickets === 10 ? m.totalOvers * 6 : ballsFromOvers(m.scoreB.overs));

      // Team B stats
      nrrStats[m.teamBId].runsScored += m.scoreB.runs;
      nrrStats[m.teamBId].ballsFaced += (m.scoreB.wickets === 10 ? m.totalOvers * 6 : ballsFromOvers(m.scoreB.overs));
      nrrStats[m.teamBId].runsConceded += m.scoreA.runs;
      nrrStats[m.teamBId].ballsBowled += (m.scoreA.wickets === 10 ? m.totalOvers * 6 : ballsFromOvers(m.scoreA.overs));
    }
  });

  // Calculate Final NRR
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