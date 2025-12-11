import { Tournament, Team, Match, MatchStatus, Player } from '../types';
import { db } from './firebase';
import { 
    collection, 
    getDocs, 
    doc, 
    setDoc, 
    getDoc, 
    deleteDoc, 
    query, 
    where,
    onSnapshot
} from 'firebase/firestore';

// Collection Names
const TOURNAMENTS_COL = 'tournaments';
const TEAMS_COL = 'teams';
const MATCHES_COL = 'matches';

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

// Data Repair Helper (Kept from previous version)
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
    try {
        const snapshot = await getDocs(collection(db, TOURNAMENTS_COL));
        return snapshot.docs.map(doc => doc.data() as Tournament);
    } catch (error) {
        console.error("Error fetching tournaments:", error);
        return [];
    }
};

export const getTournament = async (id: string): Promise<Tournament | undefined> => {
    try {
        const docRef = doc(db, TOURNAMENTS_COL, id);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? (docSnap.data() as Tournament) : undefined;
    } catch (error) {
        console.error("Error fetching tournament:", error);
        return undefined;
    }
};

export const saveTournament = async (tournament: Tournament) => {
    try {
        await setDoc(doc(db, TOURNAMENTS_COL, tournament.id), tournament);
    } catch (error) {
        console.error("Error saving tournament:", error);
    }
};

// --- TEAM METHODS ---

export const getTeams = async (tournamentId: string): Promise<Team[]> => {
    try {
        const q = query(collection(db, TEAMS_COL), where("tournamentId", "==", tournamentId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as Team);
    } catch (error) {
        console.error("Error fetching teams:", error);
        return [];
    }
};

export const saveTeam = async (team: Team) => {
    await setDoc(doc(db, TEAMS_COL, team.id), team);
};

export const deleteTeam = async (id: string) => {
    await deleteDoc(doc(db, TEAMS_COL, id));
};

// Player Management
export const addPlayerToTeam = async (teamId: string, name: string, role: Player['role']) => {
    const teamRef = doc(db, TEAMS_COL, teamId);
    const teamSnap = await getDoc(teamRef);
    if (teamSnap.exists()) {
        const team = teamSnap.data() as Team;
        const newPlayer: Player = {
            id: Date.now().toString() + Math.random().toString().slice(2,5),
            name,
            role,
            totalRuns: 0,
            totalWickets: 0
        };
        const updatedPlayers = team.players ? [...team.players, newPlayer] : [newPlayer];
        await setDoc(teamRef, { ...team, players: updatedPlayers });
    }
};

export const deletePlayerFromTeam = async (teamId: string, playerId: string) => {
    const teamRef = doc(db, TEAMS_COL, teamId);
    const teamSnap = await getDoc(teamRef);
    if (teamSnap.exists()) {
        const team = teamSnap.data() as Team;
        if (team.players) {
            const updatedPlayers = team.players.filter(p => p.id !== playerId);
            await setDoc(teamRef, { ...team, players: updatedPlayers });
        }
    }
};

// --- MATCH METHODS ---

export const getMatches = async (tournamentId: string): Promise<Match[]> => {
    try {
        const q = query(collection(db, MATCHES_COL), where("tournamentId", "==", tournamentId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => repairMatchData(doc.data() as Match));
    } catch (error) {
        console.error("Error fetching matches:", error);
        return [];
    }
};

// REAL-TIME LISTENER (For Public View)
export const subscribeToMatches = (tournamentId: string, callback: (matches: Match[]) => void) => {
    const q = query(collection(db, MATCHES_COL), where("tournamentId", "==", tournamentId));
    return onSnapshot(q, (snapshot) => {
        const matches = snapshot.docs.map(doc => repairMatchData(doc.data() as Match));
        callback(matches);
    });
};

export const saveMatch = async (match: Match) => {
    await setDoc(doc(db, MATCHES_COL, match.id), match);
};

export const deleteMatch = async (id: string) => {
    await deleteDoc(doc(db, MATCHES_COL, id));
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