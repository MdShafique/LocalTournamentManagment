
export enum MatchStatus {
  SCHEDULED = 'SCHEDULED',
  LIVE = 'LIVE',
  COMPLETED = 'COMPLETED',
  ABANDONED = 'ABANDONED'
}

export type StageType = 'group' | 'knockout';

export interface Player {
  id: string;
  name: string;
  role: 'Batsman' | 'Bowler' | 'All-Rounder' | 'WicketKeeper';
  totalRuns: number;
  totalWickets: number;
  image?: string;
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
  isDeclared?: boolean;
}

export interface BattingStats {
    playerId: string;
    playerName: string;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    isOut: boolean;
    dismissal?: string;
}

export interface BowlingStats {
    playerId: string;
    playerName: string;
    overs: number;
    ballsBowled: number;
    runsConceded: number;
    wickets: number;
    maidens: number;
}

export interface TeamScorecard {
    batting: BattingStats[];
    bowling: BowlingStats[];
    extras?: {
      wide: number;
      noBall: number;
      bye: number;
      legBye: number;
    };
}

export interface LiveDetails {
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
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
  stageType?: StageType; 
  status: MatchStatus;
  totalOvers: number;
  
  scoreA: InningsScore;
  scoreB: InningsScore;
  
  scorecard: {
      A: TeamScorecard;
      B: TeamScorecard;
  };

  liveDetails?: LiveDetails; 
  winnerId?: string;
  manOfTheMatch?: string; 
  commentary?: string[];
  history?: string[];
  
  // Tracking for maiden overs calculation
  currentOverRuns?: number;
  currentOverBalls?: number;
  maxWickets?: number;
}

export type PaymentMethod = 'bkash' | 'nagad' | 'rocket' | 'cash';

export interface CommitteeMember {
  id: string;
  name: string;
  title: string;       // e.g. President, Secretary, Member, Umpire
  description?: string; // Optional subtitle / bio / designation details
  phone?: string;
  imageUrl?: string;
}

export interface CommitteeGroup {
  id: string;
  name: string;        // e.g. "Tournament Organizing Committee", "Stadium Committee"
  members: CommitteeMember[];
}

export interface CommitteeConfig {
  tagline?: string;          // e.g. "Badarkhali Premier League Night Short-Pitch Cricket Tournament"
  presentedByLabel?: string; // e.g. "Presented By"
  presentedBy?: string;      // e.g. "ANM Hefaz Shikder" (shown as large heading)
  groups: CommitteeGroup[];
}

export interface SponsoredAdItem {
  id: string;
  badgeText?: string; // Custom badge/button text, e.g. "SPONSOR", "INFO", "NOTICE", "ঘোষণা"
  text: string;
  sponsorName?: string;
  logo?: string;
  link?: string;
}

export interface SponsoredAdsConfig {
  enabled?: boolean;
  defaultBadgeText?: string;
  speedSeconds?: number; // duration in seconds for one run across the screen (e.g. 15s)
  repeatCount?: number;  // 0 or undefined = infinite/unlimited, or specific count
  items: SponsoredAdItem[];
}

export interface PaymentGatewayConfig {
  bkashNumber?: string;
  bkashType?: 'Personal' | 'Merchant' | 'Agent';
  nagadNumber?: string;
  nagadType?: 'Personal' | 'Merchant';
  rocketNumber?: string;
  rocketType?: 'Personal' | 'Merchant';
  cashCollectorName?: string;
  cashCollectorPhone?: string;
  instructions?: string;
  enabledMethods?: PaymentMethod[];
}

export interface Tournament {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  adminId: string;
  logo?: string;
  venue?: string;
  registrationFee?: number;
  isRegistrationOpen?: boolean;
  registrationStartDate?: string;
  registrationEndDate?: string;
  rules?: string;
  paymentInfo?: PaymentGatewayConfig;
  isCommitteeVisible?: boolean;
  committee?: CommitteeConfig;
  sponsoredAds?: SponsoredAdsConfig;
  seriesAwards?: {
      playerOfSeries?: string;
      bestBatsman?: string;
      bestBowler?: string;
      championTeamId?: string;
      runnersUpTeamId?: string;
      emergencyNotes?: string;
  };
}

export type RegistrationStatus = 'pending' | 'approved' | 'rejected';

export interface PlayerRegistration {
  id: string;
  tournamentId: string;
  name: string;
  fatherName: string;
  motherName: string;
  whatsappNumber: string;
  role: 'Batsman' | 'Bowler' | 'All-Rounder' | 'WicketKeeper';
  bloodGroup: string;
  address: string;
  jerseyNumber?: string;
  jerseySize?: 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL' | string;
  imageUrl?: string;
  registrationFee: number;
  paymentMethod: PaymentMethod;
  senderNumber: string;
  transactionId: string;
  status: RegistrationStatus;
  assignedTeamId?: string;
  assignedTeamName?: string;
  createdAt: string;
  reviewedAt?: string;
  notes?: string;
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
