
export enum MatchStatus {
  SCHEDULED = 'SCHEDULED',
  LIVE = 'LIVE',
  COMPLETED = 'COMPLETED',
  ABANDONED = 'ABANDONED'
}

export interface Player {
  id: string;
  name: string;
  role: 'Batsman' | 'Bowler' | 'All-Rounder' | 'WicketKeeper';
  totalRuns: number;
  totalWickets: number;
}

export interface Team {
  id: string;
  tournamentId: string;
  name: string;
  shortName: string;
  logo?: string;
  group: string;
  players: Player[];
}

export interface InningsScore {
  runs: number;
  wickets: number;
  overs: number;
  balls: number;
  isDeclared?: boolean; // New field to handle manual innings end
}

export interface BattingStats {
    playerId: string;
    playerName: string;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    isOut: boolean;
    dismissal?: string; // e.g. "b. BowlerX"
}

export interface BowlingStats {
    playerId: string;
    playerName: string;
    overs: number; // Stored as balls ideally, but using float x.y for display simplicity here or derived
    ballsBowled: number;
    runsConceded: number;
    wickets: number;
    maidens: number;
}

export interface TeamScorecard {
    batting: BattingStats[];
    bowling: BowlingStats[];
}

export interface LiveDetails {
  strikerId: string; // ID mapping to scorecard
  nonStrikerId: string;
  bowlerId: string;
  // Display names for quick UI access, though could be derived
  strikerName: string;
  nonStrikerName: string;
  bowlerName: string;
}

export interface Match {
  id: string;
  tournamentId: string;
  teamAId: string;
  teamBId: string;
  date: string;
  time: string;
  venue: string;
  type: string; 
  groupStage: string; 
  status: MatchStatus;
  totalOvers: number;
  
  scoreA: InningsScore;
  scoreB: InningsScore;
  
  // New: Detailed Stats per team
  scorecard: {
      A: TeamScorecard;
      B: TeamScorecard;
  };

  liveDetails?: LiveDetails; 
  winnerId?: string;
  manOfTheMatch?: string;
  commentary?: string[];
}

export interface Tournament {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  adminId: string;
  logo?: string;
}

export interface TableRow {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  lost: number;
  tied: number;
  nrr: number;
  points: number;
}
