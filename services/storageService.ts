// Consolidating imports and removing unused QuerySnapshot to resolve module export errors
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot
} from "firebase/firestore";
import { db } from './firebase';
import { Tournament, Team, Match, MatchStatus, Player, StageType, PlayerRegistration, RegistrationStatus } from '../types';

// Collections
const TOURNAMENTS_COL = 'tournaments';
const TEAMS_COL = 'teams';
const MATCHES_COL = 'matches';
const REGISTRATIONS_COL = 'registrations';

// --- HELPERS ---

const cleanForFirestore = <T>(data: T): T => {
    return JSON.parse(JSON.stringify(data));
};

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

const repairMatchData = (match: Match): Match => {
    const updated = { ...match };
    if (!updated.scorecard) {
        updated.scorecard = { A: { batting: [], bowling: [] }, B: { batting: [], bowling: [] } };
    }
    
    if (updated.scorecard.A.bowling) {
        updated.scorecard.A.bowling = updated.scorecard.A.bowling.map(b => ({ ...b, maidens: b.maidens || 0 }));
    }
    if (updated.scorecard.B.bowling) {
        updated.scorecard.B.bowling = updated.scorecard.B.bowling.map(b => ({ ...b, maidens: b.maidens || 0 }));
    }

    if (!updated.liveDetails) {
        updated.liveDetails = {
            strikerId: '', strikerName: '', nonStrikerId: '', nonStrikerName: '',
            bowlerId: '', bowlerName: ''
        };
    }
    if (!updated.history) {
        updated.history = [];
    }
    if (updated.currentOverRuns === undefined) updated.currentOverRuns = 0;
    if (updated.currentOverBalls === undefined) updated.currentOverBalls = 0;
    
    // CRITICAL: Only set default if field is truly missing. 
    // This ensures that small matches (like 4P/3 Wkts) don't get reset to 10.
    if (updated.maxWickets === undefined || updated.maxWickets === null) {
        updated.maxWickets = 10;
    }
    
    return updated;
};

// --- TOURNAMENT METHODS ---

export const getTournaments = async (): Promise<Tournament[]> => {
    const snapshot = await getDocs(collection(db, TOURNAMENTS_COL));
    return snapshot.docs.map(d => d.data() as Tournament);
};

export const getTournamentsByAdmin = async (adminId: string): Promise<Tournament[]> => {
    const q = query(collection(db, TOURNAMENTS_COL), where("adminId", "==", adminId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as Tournament);
};

export const getTournament = async (id: string): Promise<Tournament | undefined> => {
    const snap = await getDoc(doc(db, TOURNAMENTS_COL, id));
    return snap.exists() ? (snap.data() as Tournament) : undefined;
};

export const subscribeToTournament = (id: string, callback: (tournament: Tournament | undefined) => void) => {
    const unsubscribe = onSnapshot(doc(db, TOURNAMENTS_COL, id), (snap) => {
        if (snap.exists()) {
            callback(snap.data() as Tournament);
        } else {
            callback(undefined);
        }
    }, (error) => {
        console.error("Error subscribing to tournament:", error);
    });

    return unsubscribe;
};

export const saveTournament = async (tournament: Tournament) => {
    await setDoc(doc(db, TOURNAMENTS_COL, tournament.id), cleanForFirestore(tournament));
};

export const deleteTournament = async (id: string) => {
    await deleteDoc(doc(db, TOURNAMENTS_COL, id));
};

// --- TEAM METHODS ---

export const getTeams = async (tournamentId: string): Promise<Team[]> => {
    const q = query(collection(db, TEAMS_COL), where("tournamentId", "==", tournamentId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as Team);
};

export const saveTeam = async (team: Team) => {
    await setDoc(doc(db, TEAMS_COL, team.id), cleanForFirestore(team));
};

export const deleteTeam = async (id: string) => {
    await deleteDoc(doc(db, TEAMS_COL, id));
};

export const addPlayerToTeam = async (teamId: string, name: string, role: Player['role'], image?: string) => {
    const teamRef = doc(db, TEAMS_COL, teamId);
    const teamSnap = await getDoc(teamRef);
    
    if (teamSnap.exists()) {
        const team = teamSnap.data() as Team;
        const newPlayer: Player = {
            id: Date.now().toString() + Math.random().toString().slice(2,5),
            name,
            role,
            totalRuns: 0,
            totalWickets: 0,
            image: image || ''
        };
        const updatedPlayers = team.players ? [...team.players, newPlayer] : [newPlayer];
        await setDoc(teamRef, cleanForFirestore({ ...team, players: updatedPlayers }));
    }
};

export const updatePlayerInTeam = async (teamId: string, player: Player) => {
    const teamRef = doc(db, TEAMS_COL, teamId);
    const teamSnap = await getDoc(teamRef);
    
    if (teamSnap.exists()) {
        const team = teamSnap.data() as Team;
        if (team.players) {
            const updatedPlayers = team.players.map(p => p.id === player.id ? { ...p, ...player } : p);
            await setDoc(teamRef, cleanForFirestore({ ...team, players: updatedPlayers }));
        }
    }
};

export const deletePlayerFromTeam = async (teamId: string, playerId: string) => {
    const teamRef = doc(db, TEAMS_COL, teamId);
    const teamSnap = await getDoc(teamRef);
    
    if (teamSnap.exists()) {
        const team = teamSnap.data() as Team;
        if (team.players) {
            const updatedPlayers = team.players.filter(p => p.id !== playerId);
            await setDoc(teamRef, cleanForFirestore({ ...team, players: updatedPlayers }));
        }
    }
};

// --- MATCH METHODS ---

export const getMatches = async (tournamentId: string): Promise<Match[]> => {
    const q = query(collection(db, MATCHES_COL), where("tournamentId", "==", tournamentId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => repairMatchData(d.data() as Match));
};

export const subscribeToMatches = (tournamentId: string, callback: (matches: Match[]) => void) => {
    const q = query(collection(db, MATCHES_COL), where("tournamentId", "==", tournamentId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const matches = snapshot.docs.map(d => repairMatchData(d.data() as Match));
        callback(matches);
    }, (error) => {
        console.error("Error subscribing to matches:", error);
    });

    return unsubscribe;
};

export const saveMatch = async (match: Match) => {
    await setDoc(doc(db, MATCHES_COL, match.id), cleanForFirestore(match));
};

export const deleteMatch = async (id: string) => {
    await deleteDoc(doc(db, MATCHES_COL, id));
};

export const initializeMatch = (
  tId: string, 
  teamAId: string, 
  teamBId: string, 
  date: string, 
  time: string,
  venue: string,
  type: string, 
  totalOvers: number,
  groupStage: string,
  stageType: StageType = 'group',
  maxWickets: number = 10
): Match => ({
  id: Date.now().toString(),
  tournamentId: tId,
  teamAId,
  teamBId,
  date,
  time,
  venue,
  type,
  groupStage,
  stageType,
  status: MatchStatus.SCHEDULED,
  totalOvers,
  maxWickets, 
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
  },
  history: [],
  currentOverRuns: 0,
  currentOverBalls: 0
});

// --- REGISTRATION METHODS ---

export const getRegistrations = async (tournamentId: string): Promise<PlayerRegistration[]> => {
    const q = query(collection(db, REGISTRATIONS_COL), where("tournamentId", "==", tournamentId));
    const snapshot = await getDocs(q);
    const list = snapshot.docs.map(d => d.data() as PlayerRegistration);
    list.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
    return list;
};

export const subscribeToRegistrations = (tournamentId: string, callback: (regs: PlayerRegistration[]) => void) => {
    const q = query(collection(db, REGISTRATIONS_COL), where("tournamentId", "==", tournamentId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const regs = snapshot.docs.map(d => d.data() as PlayerRegistration);
        regs.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
        callback(regs);
    }, (error) => {
        console.error("Error subscribing to registrations:", error);
    });

    return unsubscribe;
};

export const savePlayerRegistration = async (registration: PlayerRegistration) => {
    await setDoc(doc(db, REGISTRATIONS_COL, registration.id), cleanForFirestore(registration));
};

export const updateRegistrationStatus = async (
    id: string, 
    status: RegistrationStatus, 
    assignedTeamId?: string, 
    assignedTeamName?: string
) => {
    const ref = doc(db, REGISTRATIONS_COL, id);
    const snap = await getDoc(ref);
    if (snap.exists()) {
        const data = snap.data() as PlayerRegistration;
        const updated: PlayerRegistration = {
            ...data,
            status,
            reviewedAt: new Date().toISOString(),
            ...(assignedTeamId !== undefined ? { assignedTeamId } : {}),
            ...(assignedTeamName !== undefined ? { assignedTeamName } : {})
        };
        await setDoc(ref, cleanForFirestore(updated));
    }
};

export const deleteRegistration = async (id: string) => {
    await deleteDoc(doc(db, REGISTRATIONS_COL, id));
};

export const assignPlayerToTeam = async (
    tournamentId: string,
    registration: PlayerRegistration,
    teamId: string,
    teamName: string
) => {
    // 1. Add player to the team's squad if not already present
    const teamRef = doc(db, TEAMS_COL, teamId);
    const teamSnap = await getDoc(teamRef);
    if (teamSnap.exists()) {
        const team = teamSnap.data() as Team;
        const existingPlayer = team.players?.find(p => p.name.toLowerCase() === registration.name.toLowerCase());
        
        if (!existingPlayer) {
            const newPlayer: Player = {
                id: Date.now().toString() + Math.random().toString().slice(2, 5),
                name: registration.name,
                role: registration.role,
                totalRuns: 0,
                totalWickets: 0,
                image: registration.imageUrl || ''
            };
            const updatedPlayers = team.players ? [...team.players, newPlayer] : [newPlayer];
            await setDoc(teamRef, cleanForFirestore({ ...team, players: updatedPlayers }));
        }
    }

    // 2. Update registration status to approved and assign team
    await updateRegistrationStatus(registration.id, 'approved', teamId, teamName);
};
