import { Tournament, Team, Match, MatchStatus, Player } from '../types';

// Using LocalStorage instead of Firestore due to missing firebase dependencies.
const TOURNAMENTS_KEY = 'cric_tournaments';
const TEAMS_KEY = 'cric_teams';
const MATCHES_KEY = 'cric_matches';

// --- HELPERS ---

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

// Internal LocalStorage Helpers
const getStored = <T>(key: string): T[] => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : [];
    } catch (e) {
        console.error(`Error reading ${key}`, e);
        return [];
    }
};

const setStored = (key: string, data: any[]) => {
    localStorage.setItem(key, JSON.stringify(data));
};

// Data Repair Helper
const repairMatchData = (match: Match): Match => {
    const updated = { ...match };
    if (!updated.scorecard) {
        updated.scorecard = { A: { batting: [], bowling: [] }, B: { batting: [], bowling: [] } };
    }
    if (!updated.liveDetails) {
        updated.liveDetails = {
            strikerId: '', strikerName: '', nonStrikerId: '', nonStrikerName: '',
            bowlerId: '', bowlerName: ''
        };
    }
    return updated;
};

// --- TOURNAMENT METHODS ---

export const getTournaments = async (): Promise<Tournament[]> => {
    return getStored<Tournament>(TOURNAMENTS_KEY);
};

export const getTournamentsByAdmin = async (adminId: string): Promise<Tournament[]> => {
    const all = getStored<Tournament>(TOURNAMENTS_KEY);
    return all.filter(t => t.adminId === adminId);
};

export const getTournament = async (id: string): Promise<Tournament | undefined> => {
    const all = getStored<Tournament>(TOURNAMENTS_KEY);
    return all.find(t => t.id === id);
};

export const saveTournament = async (tournament: Tournament) => {
    const all = getStored<Tournament>(TOURNAMENTS_KEY);
    const index = all.findIndex(t => t.id === tournament.id);
    if (index >= 0) {
        all[index] = tournament;
    } else {
        all.push(tournament);
    }
    setStored(TOURNAMENTS_KEY, all);
};

// --- TEAM METHODS ---

export const getTeams = async (tournamentId: string): Promise<Team[]> => {
    const all = getStored<Team>(TEAMS_KEY);
    return all.filter(t => t.tournamentId === tournamentId);
};

export const saveTeam = async (team: Team) => {
    const all = getStored<Team>(TEAMS_KEY);
    const index = all.findIndex(t => t.id === team.id);
    if (index >= 0) {
        all[index] = team;
    } else {
        all.push(team);
    }
    setStored(TEAMS_KEY, all);
};

export const deleteTeam = async (id: string) => {
    const all = getStored<Team>(TEAMS_KEY);
    const filtered = all.filter(t => t.id !== id);
    setStored(TEAMS_KEY, filtered);
};

// Player Management
export const addPlayerToTeam = async (teamId: string, name: string, role: Player['role']) => {
    const all = getStored<Team>(TEAMS_KEY);
    const index = all.findIndex(t => t.id === teamId);
    if (index >= 0) {
        const team = all[index];
        const newPlayer: Player = {
            id: Date.now().toString() + Math.random().toString().slice(2,5),
            name,
            role,
            totalRuns: 0,
            totalWickets: 0
        };
        team.players = team.players ? [...team.players, newPlayer] : [newPlayer];
        all[index] = team;
        setStored(TEAMS_KEY, all);
    }
};

export const deletePlayerFromTeam = async (teamId: string, playerId: string) => {
    const all = getStored<Team>(TEAMS_KEY);
    const index = all.findIndex(t => t.id === teamId);
    if (index >= 0) {
        const team = all[index];
        if (team.players) {
            team.players = team.players.filter(p => p.id !== playerId);
            all[index] = team;
            setStored(TEAMS_KEY, all);
        }
    }
};

// --- MATCH METHODS ---

export const getMatches = async (tournamentId: string): Promise<Match[]> => {
    const all = getStored<Match>(MATCHES_KEY);
    return all.filter(m => m.tournamentId === tournamentId).map(repairMatchData);
};

// REAL-TIME LISTENER (Polled for LocalStorage)
export const subscribeToMatches = (tournamentId: string, callback: (matches: Match[]) => void) => {
    const fetch = () => {
        const all = getStored<Match>(MATCHES_KEY);
        const matches = all.filter(m => m.tournamentId === tournamentId).map(repairMatchData);
        callback(matches);
    };
    
    fetch(); // Initial
    const interval = setInterval(fetch, 2000); // Poll every 2 seconds
    return () => clearInterval(interval);
};

export const saveMatch = async (match: Match) => {
    const all = getStored<Match>(MATCHES_KEY);
    const index = all.findIndex(m => m.id === match.id);
    if (index >= 0) {
        all[index] = match;
    } else {
        all.push(match);
    }
    setStored(MATCHES_KEY, all);
};

export const deleteMatch = async (id: string) => {
    const all = getStored<Match>(MATCHES_KEY);
    const filtered = all.filter(m => m.id !== id);
    setStored(MATCHES_KEY, filtered);
};

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