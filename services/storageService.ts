import { Tournament, Team, Match, MatchStatus, Player } from '../types';

// Keys
const TOURNAMENTS_KEY = 'cric_tournaments';
const TEAMS_KEY = 'cric_teams';
const MATCHES_KEY = 'cric_matches';

// Helpers
const get = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const set = <T>(key: string, data: T[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Tournament Methods
export const getTournaments = (): Tournament[] => get<Tournament>(TOURNAMENTS_KEY);
export const getTournament = (id: string): Tournament | undefined => getTournaments().find(t => t.id === id);
export const saveTournament = (tournament: Tournament) => {
  const list = getTournaments();
  const idx = list.findIndex(t => t.id === tournament.id);
  if (idx >= 0) list[idx] = tournament;
  else list.push(tournament);
  set(TOURNAMENTS_KEY, list);
};

// Team Methods
export const getTeams = (tournamentId: string): Team[] => get<Team>(TEAMS_KEY).filter(t => t.tournamentId === tournamentId);
export const getTeam = (id: string): Team | undefined => get<Team>(TEAMS_KEY).find(t => t.id === id);
export const saveTeam = (team: Team) => {
  const list = get<Team>(TEAMS_KEY);
  const idx = list.findIndex(t => t.id === team.id);
  if (idx >= 0) list[idx] = team;
  else list.push(team);
  set(TEAMS_KEY, list);
};
export const deleteTeam = (id: string) => {
    const list = get<Team>(TEAMS_KEY).filter(t => t.id !== id);
    set(TEAMS_KEY, list);
}

// Player Helper
export const addPlayerToTeam = (teamId: string, name: string, role: Player['role']) => {
    const teams = get<Team>(TEAMS_KEY);
    const teamIdx = teams.findIndex(t => t.id === teamId);
    if (teamIdx >= 0) {
        const newPlayer: Player = {
            id: Date.now().toString() + Math.random().toString().slice(2,5),
            name,
            role,
            totalRuns: 0,
            totalWickets: 0
        };
        if (!teams[teamIdx].players) teams[teamIdx].players = [];
        teams[teamIdx].players.push(newPlayer);
        set(TEAMS_KEY, teams);
    }
}

export const deletePlayerFromTeam = (teamId: string, playerId: string) => {
    const teams = get<Team>(TEAMS_KEY);
    const teamIdx = teams.findIndex(t => t.id === teamId);
    if (teamIdx >= 0 && teams[teamIdx].players) {
        teams[teamIdx].players = teams[teamIdx].players.filter(p => p.id !== playerId);
        set(TEAMS_KEY, teams);
    }
}

// Match Methods

// DATA MIGRATION HELPER
// Ensures old matches get the new structure automatically
const repairMatchData = (match: Match): Match => {
    const updated = { ...match };
    
    // Ensure Scorecard exists
    if (!updated.scorecard) {
        updated.scorecard = {
            A: { batting: [], bowling: [] },
            B: { batting: [], bowling: [] }
        };
    }
    
    // Ensure LiveDetails exists
    if (!updated.liveDetails) {
        updated.liveDetails = {
            strikerId: '', strikerName: '',
            nonStrikerId: '', nonStrikerName: '',
            bowlerId: '', bowlerName: ''
        };
    }

    return updated;
};

export const getMatches = (tournamentId: string): Match[] => {
    const matches = get<Match>(MATCHES_KEY).filter(m => m.tournamentId === tournamentId);
    // Apply repair on read to prevent crashes on old data
    return matches.map(repairMatchData);
};

export const getMatch = (id: string): Match | undefined => {
    const m = get<Match>(MATCHES_KEY).find(m => m.id === id);
    return m ? repairMatchData(m) : undefined;
};

export const saveMatch = (match: Match) => {
  const list = get<Match>(MATCHES_KEY);
  const idx = list.findIndex(m => m.id === match.id);
  if (idx >= 0) list[idx] = match;
  else list.push(match);
  set(MATCHES_KEY, list);
};
export const deleteMatch = (id: string) => {
    const list = get<Match>(MATCHES_KEY).filter(m => m.id !== id);
    set(MATCHES_KEY, list);
}

// Stats & Helpers
export const calculateOvers = (balls: number): number => {
  const full = Math.floor(balls / 6);
  const rem = balls % 6;
  return parseFloat(`${full}.${rem}`);
};

export const ballsFromOvers = (overs: number): number => {
    const str = overs.toString();
    const parts = str.split('.');
    const overPart = parseInt(parts[0] || '0');
    const ballPart = parseInt(parts[1] || '0');
    return (overPart * 6) + ballPart;
}

export const initializeMatch = (
  tId: string, 
  teamA: string, 
  teamB: string, 
  date: string, 
  time: string,
  type: string, 
  totalOvers: number,
  group: string
): Match => ({
  id: Date.now().toString(),
  tournamentId: tId,
  teamAId: teamA,
  teamBId: teamB,
  date,
  time,
  venue: 'Main Ground',
  type,
  groupStage: group,
  status: MatchStatus.SCHEDULED,
  totalOvers,
  scoreA: { runs: 0, wickets: 0, overs: 0, balls: 0 },
  scoreB: { runs: 0, wickets: 0, overs: 0, balls: 0 },
  // Initialize empty scorecard structure
  scorecard: {
      A: { batting: [], bowling: [] },
      B: { batting: [], bowling: [] }
  },
  liveDetails: {
      strikerId: '', strikerName: '',
      nonStrikerId: '', nonStrikerName: '',
      bowlerId: '', bowlerName: ''
  }
});