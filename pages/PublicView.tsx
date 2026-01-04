import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { getTeams, getTournament, subscribeToMatches } from '../services/storageService';
import { calculateTable } from '../utils/statsHelper';
import { Match, Team, Tournament, TableRow, MatchStatus, Player } from '../types';
import { MatchCard } from '../components/MatchCard';
import { LiveDetailedCard } from '../components/LiveDetailedCard';
import { MatchDetailModal } from '../components/MatchDetailModal';
import { PlayerDetailModal } from '../components/PlayerDetailModal';
import { Trophy, Activity, BarChart3, Shield, Loader2, AlertCircle, Layers, Star, User, Calendar, ChevronRight, Award, Coffee, Zap, Info, XCircle, CheckCircle2, MinusCircle } from 'lucide-react';
import { Layout } from '../components/Layout';

interface TopBatsman {
  id: string;
  name: string;
  runs: number;
  team: string;
  teamId: string;
  image?: string;
}

interface TopBowler {
  id: string;
  name: string;
  wickets: number;
  team: string;
  teamId: string;
  image?: string;
}

export const PublicView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | undefined>();
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [groupedTables, setGroupedTables] = useState<Record<string, TableRow[]>>({});
  const [activeTab, setActiveTab] = useState<'matches' | 'table' | 'squads' | 'stats' | 'awards'>('matches');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedPlayerInfo, setSelectedPlayerInfo] = useState<{ player: Player, team: Team } | null>(null);
  const [selectedTeamHistory, setSelectedTeamHistory] = useState<{ team: Team, row: TableRow } | null>(null);

  useEffect(() => {
    const loadStaticData = async () => {
        if (!id) return;
        try {
            const t = await getTournament(id);
            if (!t) {
                setError("Tournament not found.");
                setLoading(false);
                return;
            }
            const tm = await getTeams(id);
            setTournament(t);
            setTeams(tm || []);
            if (tm) setLoading(false);
        } catch (e) {
            console.error(e);
            setError("Failed to load data.");
            setLoading(false);
        }
    };
    loadStaticData();
  }, [id]);

  useEffect(() => {
      if (!id) return;
      const unsubscribe = subscribeToMatches(id, (updatedMatches) => {
          const validMatches = updatedMatches || [];
          setMatches(validMatches);
          const tableData = calculateTable(teams, validMatches);
          setGroupedTables(tableData);
          if (selectedMatch) {
              const current = validMatches.find(m => m.id === selectedMatch.id);
              if (current) setSelectedMatch(current);
          }
      });
      return () => unsubscribe();
  }, [id, teams, selectedMatch?.id]); 

  const handlePlayerClick = (playerId: string, teamId: string) => {
      const team = teams.find(t => t.id === teamId);
      const player = team?.players?.find(p => p.id === playerId);
      if (player && team) {
          setSelectedPlayerInfo({ player, team });
      }
  };

  const topStats = useMemo(() => {
    const battingStats: Record<string, TopBatsman> = {};
    const bowlingStats: Record<string, TopBowler> = {};

    matches.forEach(m => {
        if (!m.scorecard) return;
        const teamAMap = teams.find(t => t.id === m.teamAId);
        const teamBMap = teams.find(t => t.id === m.teamBId);

        if (m.scorecard.A && teamAMap) {
            (m.scorecard.A.batting || []).forEach(p => {
                const player = teamAMap.players?.find(pl => pl.id === p.playerId);
                if (!player) return; 
                if (!battingStats[p.playerId]) battingStats[p.playerId] = { id: p.playerId, name: player.name, runs: 0, team: teamAMap.name, teamId: teamAMap.id, image: player.image };
                battingStats[p.playerId].runs += (p.runs || 0);
            });
            (m.scorecard.A.bowling || []).forEach(p => {
                const player = teamAMap.players?.find(pl => pl.id === p.playerId);
                if (!player) return;
                if (!bowlingStats[p.playerId]) bowlingStats[p.playerId] = { id: p.playerId, name: player.name, wickets: 0, team: teamAMap.name, teamId: teamAMap.id, image: player.image };
                bowlingStats[p.playerId].wickets += (p.wickets || 0);
            });
        }
        if (m.scorecard.B && teamBMap) {
            (m.scorecard.B.batting || []).forEach(p => {
                const player = teamBMap.players?.find(pl => pl.id === p.playerId);
                if (!player) return;
                if (!battingStats[p.playerId]) battingStats[p.playerId] = { id: p.playerId, name: player.name, runs: 0, team: teamBMap.name, teamId: teamBMap.id, image: player.image };
                battingStats[p.playerId].runs += (p.runs || 0);
            });
            (m.scorecard.B.bowling || []).forEach(p => {
                const player = teamBMap.players?.find(pl => pl.id === p.playerId);
                if (!player) return;
                if (!bowlingStats[p.playerId]) bowlingStats[p.playerId] = { id: p.playerId, name: player.name, wickets: 0, team: teamBMap.name, teamId: teamBMap.id, image: player.image };
                bowlingStats[p.playerId].wickets += (p.wickets || 0);
            });
        }
    });

    return {
        topBatsmen: (Object.values(battingStats) as TopBatsman[]).sort((a,b) => b.runs - a.runs).slice(0, 10),
        topBowlers: (Object.values(bowlingStats) as TopBowler[]).sort((a,b) => b.wickets - a.wickets).slice(0, 10)
    };
  }, [matches, teams]);

  const sortedMatches = useMemo<{ upcoming: Match[], live: Match[], results: Match[] }>(() => {
      const upcoming = matches.filter(m => m.status === MatchStatus.SCHEDULED).sort((a, b) => {
          const dtA = new Date(`${a.date} ${a.time}`).getTime();
          const dtB = new Date(`${b.date} ${b.time}`).getTime();
          return dtA - dtB;
      });
      const live = matches.filter(m => m.status === MatchStatus.LIVE);
      const results = matches.filter(m => m.status === MatchStatus.COMPLETED || m.status === MatchStatus.ABANDONED).sort((a, b) => {
          const dtA = new Date(`${a.date} ${a.time}`).getTime();
          const dtB = new Date(`${b.date} ${b.time}`).getTime();
          return dtB - dtA;
      });
      return { upcoming, live, results };
  }, [matches]);

  const awardPlayers = useMemo(() => {
    if (!tournament?.seriesAwards) return null;
    const findP = (id: string) => {
      for(let t of teams) {
        const p = t.players?.find(pl => pl.id === id);
        if(p) return { player: p, team: t };
      }
      return null;
    };
    return {
      champion: teams.find(t => t.id === tournament.seriesAwards?.championTeamId),
      runnersUp: teams.find(t => t.id === tournament.seriesAwards?.runnersUpTeamId),
      mos: findP(tournament.seriesAwards?.playerOfSeries || ''),
      bestBat: findP(tournament.seriesAwards?.bestBatsman || ''),
      bestBowl: findP(tournament.seriesAwards?.bestBowler || '')
    };
  }, [tournament, teams]);

  const AwardCard = ({ title, playerInfo, teamInfo, icon: Icon, colorClass }: any) => {
    if (!playerInfo && !teamInfo) return null;
    return (
      <div className={`relative group overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] bg-gradient-to-br ${colorClass} p-6 sm:p-8 text-white shadow-2xl transition-all hover:scale-[1.03] animate-fade-in-up`}>
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Icon size={120} />
          </div>
          <div className="relative z-10">
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-2">{title}</p>
              <div className="flex items-center gap-4 sm:gap-6">
                  <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-2xl sm:rounded-3xl bg-white/20 border-4 border-white/30 overflow-hidden shadow-2xl shrink-0">
                      {playerInfo?.player?.image || teamInfo?.logo ? (
                          <img src={playerInfo?.player?.image || teamInfo?.logo} className="w-full h-full object-cover" alt="Awardee" />
                      ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl sm:text-4xl font-black text-white/40">
                              {(playerInfo?.player?.name || teamInfo?.name || "?")[0]}
                          </div>
                      )}
                  </div>
                  <div className="min-w-0">
                      <h4 className="text-xl sm:text-4xl font-black uppercase tracking-tighter leading-tight mb-1 truncate">
                          {playerInfo?.player?.name || teamInfo?.name}
                      </h4>
                      <p className="text-xs font-bold opacity-80 uppercase tracking-widest truncate">
                          {playerInfo?.team?.name || teamInfo?.group || "Tournament Star"}
                      </p>
                      {playerInfo?.player?.role && (
                        <span className="inline-block mt-2 px-2.5 py-1 bg-white/10 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest border border-white/10">
                            {playerInfo.player.role}
                        </span>
                      )}
                  </div>
              </div>
          </div>
      </div>
    );
  };

  const TeamDetailModal = ({ team, row, onClose }: { team: Team, row: TableRow, onClose: () => void }) => {
    const teamMatches = matches.filter(m => m.teamAId === team.id || m.teamBId === team.id);
    const completed = teamMatches.filter(m => m.status === MatchStatus.COMPLETED).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const scheduled = teamMatches.filter(m => m.status === MatchStatus.SCHEDULED).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return (
      <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-[100] p-0 sm:p-4 animate-fade-in">
        <div className="bg-white sm:rounded-[3rem] shadow-2xl w-full h-full sm:h-auto sm:max-w-2xl overflow-hidden animate-fade-in-up">
          <div className="bg-slate-900 p-8 sm:p-10 text-white relative">
            <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
              <XCircle size={24} />
            </button>
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center text-4xl font-black border border-white/10 overflow-hidden">
                {team.logo ? <img src={team.logo} className="w-full h-full object-cover" alt="Logo" /> : team.name[0]}
              </div>
              <div>
                <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-1">{team.group}</p>
                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter">{team.name}</h2>
                <div className="flex gap-4 mt-3">
                  <div className="text-center"><p className="text-[10px] text-white/40 font-bold uppercase">Points</p><p className="text-xl font-black text-emerald-400">{row.points}</p></div>
                  <div className="text-center"><p className="text-[10px] text-white/40 font-bold uppercase">Wins</p><p className="text-xl font-black">{row.won}</p></div>
                  <div className="text-center"><p className="text-[10px] text-white/40 font-bold uppercase">NRR</p><p className="text-base sm:text-xl font-black text-blue-400">{row.nrr.toFixed(3)}</p></div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6 sm:p-10 max-h-[60vh] overflow-y-auto no-scrollbar">
             {completed.length > 0 && (
               <div className="mb-8">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                   <Activity size={14} /> Match History
                 </h3>
                 <div className="space-y-3">
                   {completed.map(m => {
                     const opponentId = m.teamAId === team.id ? m.teamBId : m.teamAId;
                     const opponent = teams.find(t => t.id === opponentId);
                     const isWin = m.winnerId === team.id;
                     const isTie = m.winnerId === 'TIED';
                     return (
                       <div key={m.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                         <div className="flex items-center gap-4 min-w-0">
                           <div className={`p-2 rounded-xl shrink-0 ${isWin ? 'bg-emerald-100 text-emerald-600' : (isTie ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600')}`}>
                             {isWin ? <CheckCircle2 size={20} /> : (isTie ? <MinusCircle size={20} /> : <XCircle size={20} />)}
                           </div>
                           <div className="truncate">
                             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{m.groupStage}</p>
                             <p className="font-black text-slate-800 truncate">vs {opponent?.name || "Unknown Team"}</p>
                           </div>
                         </div>
                         <div className="text-right shrink-0">
                           <p className="text-sm font-black text-slate-900">
                             {m.teamAId === team.id ? `${m.scoreA.runs}/${m.scoreA.wickets}` : `${m.scoreB.runs}/${m.scoreB.wickets}`}
                             <span className="text-slate-300 mx-1">-</span>
                             {m.teamAId === team.id ? `${m.scoreB.runs}/${m.scoreB.wickets}` : `${m.scoreA.runs}/${m.scoreA.wickets}`}
                           </p>
                           <p className={`text-[9px] font-black uppercase ${isWin ? 'text-emerald-600' : (isTie ? 'text-blue-600' : 'text-red-500')}`}>
                             {isWin ? "Win" : (isTie ? "Tied" : "Loss")}
                           </p>
                         </div>
                       </div>
                     );
                   })}
                 </div>
               </div>
             )}

             {scheduled.length > 0 && (
               <div>
                 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                   <Calendar size={14} /> Upcoming Fixtures
                 </h3>
                 <div className="space-y-3">
                   {scheduled.map(m => {
                     const opponentId = m.teamAId === team.id ? m.teamBId : m.teamAId;
                     const opponent = teams.find(t => t.id === opponentId);
                     return (
                       <div key={m.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                         <div className="truncate">
                           <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{m.date} @ {m.time}</p>
                           <p className="font-black text-slate-800 truncate">vs {opponent?.name}</p>
                         </div>
                         <div className="text-[9px] bg-slate-100 px-2.5 py-1 rounded-full font-black text-slate-500 uppercase shrink-0">
                           {m.venue}
                         </div>
                       </div>
                     );
                   })}
                 </div>
               </div>
             )}
             
             {teamMatches.length === 0 && (
               <div className="text-center py-10 text-slate-400 italic">No matches recorded for this team yet.</div>
             )}
          </div>
          <div className="p-6 bg-slate-50 text-center border-t border-slate-100">
             <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">Team Performance Analytics • CricManage Pro</p>
          </div>
        </div>
      </div>
    );
  };

  if (error) return <Layout><div className="flex flex-col items-center justify-center pt-20 text-slate-500"><AlertCircle size={48} className="text-red-400 mb-4"/><h2>Oops! {error}</h2></div></Layout>;
  if (loading || !tournament) return <Layout><div className="flex flex-col items-center justify-center mt-20 gap-3"><Loader2 className="animate-spin text-emerald-600" size={40}/><p className="text-slate-500 uppercase text-[10px] font-black tracking-widest">CricManage Engine...</p></div></Layout>;

  return (
    <Layout title={tournament.name}>
      {/* Pill Style Navigation */}
      <div className="flex overflow-x-auto gap-2 p-1 mb-6 sticky top-16 bg-slate-50/90 backdrop-blur-md z-40 no-scrollbar items-center">
          {[
              { id: 'matches', label: 'Matches', icon: Activity },
              { id: 'table', label: 'Standings', icon: Layers },
              { id: 'squads', label: 'Squads', icon: Trophy },
              { id: 'stats', label: 'Leaderboard', icon: BarChart3 },
              { id: 'awards', label: 'Awards', icon: Award }
          ].map(tab => (
            <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id as any)} 
                className={`px-5 py-2.5 rounded-full font-bold text-[10px] sm:text-xs uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2 border shadow-sm ${
                    activeTab === tab.id 
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-200 shadow-lg' 
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
            >
                <tab.icon size={14} /> {tab.label}
            </button>
          ))}
      </div>

      <div className="max-w-full overflow-x-hidden">
          {activeTab === 'matches' && (
              <div className="space-y-8 sm:space-y-12 animate-fade-in-up px-1">
                  {sortedMatches.live.length > 0 && (
                      <div className="mb-8">
                          <h2 className="flex items-center gap-2 text-[10px] font-black text-red-600 mb-4 tracking-[0.3em] uppercase ml-1">
                              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span> Match Center (Live)
                          </h2>
                          {sortedMatches.live.map(m => {
                              const tA = teams.find(t => t.id === m.teamAId);
                              const tB = teams.find(t => t.id === m.teamBId);
                              if (!tA || !tB) return null;
                              
                              // Detect Innings Break
                              const isInningsBreak = m.scoreA.balls > 0 && 
                                (m.scoreA.wickets === 10 || m.scoreA.balls === m.totalOvers * 6 || m.scoreA.isDeclared) && 
                                m.scoreB.balls === 0 && m.status !== MatchStatus.COMPLETED;

                              if (isInningsBreak) {
                                return (
                                  <div key={m.id} onClick={() => setSelectedMatch(m)} className="cursor-pointer mb-6 group">
                                     <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 text-white shadow-2xl relative overflow-hidden border border-white/10 group-hover:scale-[1.01] transition-transform">
                                        <div className="relative z-10 flex flex-col items-center text-center">
                                            <div className="px-4 py-1 bg-yellow-400 text-yellow-900 rounded-full font-black text-[12px] uppercase tracking-[0.2em] mb-4">Innings Break</div>
                                            <h3 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter mb-2">{tA.name} Innings End</h3>
                                            <div className="flex items-center gap-4 mb-6">
                                                <div className="text-4xl sm:text-6xl font-black text-white">{m.scoreA.runs}/{m.scoreA.wickets}</div>
                                                <div className="text-emerald-400 font-black text-sm sm:text-xl">({m.scoreA.overs} OVERS)</div>
                                            </div>
                                            <div className="bg-white/10 backdrop-blur-md border border-white/20 px-8 py-4 rounded-3xl">
                                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-1">Target for {tB.name}</p>
                                                <p className="text-3xl font-black text-yellow-400 tracking-tighter">{m.scoreA.runs + 1} RUNS</p>
                                            </div>
                                            <div className="mt-8 flex items-center gap-2 text-white/40 animate-pulse">
                                               <Zap size={14} className="text-emerald-500 fill-emerald-500" />
                                               <p className="text-[9px] font-black uppercase tracking-[0.4em]">Waiting for 2nd Innings to Start</p>
                                            </div>
                                        </div>
                                     </div>
                                  </div>
                                );
                              }

                              return (
                                <div key={m.id} onClick={() => setSelectedMatch(m)} className="cursor-pointer transition-transform hover:scale-[1.01] mb-6">
                                  <LiveDetailedCard match={m} teamA={tA} teamB={tB} />
                                </div>
                              );
                          })}
                      </div>
                  )}

                  {sortedMatches.upcoming.length > 0 && (
                      <div className="mb-8">
                          <h3 className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                            <Calendar size={14} className="text-emerald-500" /> Upcoming Matches
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                              {sortedMatches.upcoming.map(m => (
                                <MatchCard key={m.id} match={m} teamA={teams.find(t => t.id === m.teamAId)} teamB={teams.find(t => t.id === m.teamBId)} onClick={() => setSelectedMatch(m)} />
                              ))}
                          </div>
                      </div>
                  )}

                  {sortedMatches.results.length > 0 && (
                      <div className="mb-8">
                          <h3 className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                            <ChevronRight size={14} /> Recent Results
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                              {sortedMatches.results.map(m => (
                                <MatchCard key={m.id} match={m} teamA={teams.find(t => t.id === m.teamAId)} teamB={teams.find(t => t.id === m.teamBId)} onClick={() => setSelectedMatch(m)} />
                              ))}
                          </div>
                      </div>
                  )}

                  {matches.length === 0 && <div className="text-center py-20 text-slate-400 italic">No matches available yet.</div>}
              </div>
          )}

          {activeTab === 'table' && (
              <div className="space-y-10 animate-fade-in-up px-1">
                  {(Object.entries(groupedTables) as [string, TableRow[]][]).map(([groupName, rows]) => (
                      <div key={groupName}>
                          <div className="flex items-center justify-between mb-3 ml-1">
                            <h3 className="text-[10px] font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest">{groupName} Standing</h3>
                            <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1"><Info size={10} /> Click team for history</p>
                          </div>
                          <div className="bg-white rounded-[1.5rem] sm:rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden w-full">
                                <table className="w-full text-[10px] sm:text-sm text-left table-fixed">
                                    <thead className="bg-slate-50 text-slate-500 uppercase text-[8px] sm:text-[9px] font-black tracking-widest">
                                        <tr>
                                            <th className="px-3 py-4 sm:px-8 w-auto">Team</th>
                                            <th className="px-1 py-4 text-center w-6 sm:w-10">P</th>
                                            <th className="px-1 py-4 text-center w-6 sm:w-10">W</th>
                                            <th className="px-1 py-4 text-center w-6 sm:w-10">L</th>
                                            <th className="px-1 py-4 text-center w-6 sm:w-10">T</th>
                                            <th className="px-1 py-4 text-center bg-slate-100/30 w-10 sm:w-16">PTS</th>
                                            <th className="px-2 py-4 text-center w-14 sm:w-24">NRR</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {rows.map((row, idx) => (
                                          <tr 
                                            key={row.teamId} 
                                            onClick={() => {
                                                const team = teams.find(t => t.id === row.teamId);
                                                if (team) setSelectedTeamHistory({ team, row });
                                            }}
                                            className="hover:bg-emerald-50/30 transition-colors cursor-pointer group"
                                          >
                                              <td className="px-3 py-4 font-black text-slate-900 truncate">
                                                  <div className="flex items-center gap-1 sm:gap-2 truncate">
                                                      <span className="text-slate-300 italic hidden xs:inline group-hover:text-emerald-300">{idx + 1}</span> 
                                                      <span className="truncate group-hover:text-emerald-700 underline decoration-transparent group-hover:decoration-emerald-200 underline-offset-4">{row.teamName}</span>
                                                  </div>
                                              </td>
                                              <td className="px-1 py-4 text-center">{row.played}</td>
                                              <td className="px-1 py-4 text-center text-emerald-600 font-bold">{row.won}</td>
                                              <td className="px-1 py-4 text-center text-red-500 font-bold">{row.lost}</td>
                                              <td className="px-1 py-4 text-center text-blue-500 font-black">{row.tied}</td>
                                              <td className="px-1 py-4 text-center font-black bg-slate-50/50">{row.points}</td>
                                              <td className="px-2 py-4 text-center font-mono text-[9px] sm:text-[10px]">{row.nrr.toFixed(3)}</td>
                                          </tr>
                                        ))}
                                    </tbody>
                                </table>
                          </div>
                      </div>
                  ))}
              </div>
          )}

          {activeTab === 'squads' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 animate-fade-in-up px-1">
                  {teams.map(team => (
                      <div key={team.id} className="bg-white rounded-[1.5rem] sm:rounded-[2rem] shadow-xl border border-slate-100 p-6 sm:p-8">
                          <div className="flex justify-between items-center mb-6 border-b pb-4">
                              <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tighter truncate max-w-[200px]">{team.name}</h3>
                              <span className="text-[9px] bg-slate-900 text-white px-3 py-1 rounded-full font-black uppercase tracking-widest">{team.group}</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                              {team.players?.map(p => (
                                  <button key={p.id} onClick={() => handlePlayerClick(p.id, team.id)} className="flex items-center gap-3 text-sm bg-slate-50/50 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-100 hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left group">
                                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                                          {p.image ? <img src={p.image} className="w-full h-full object-cover" alt={p.name} /> : <User size={16} className="text-slate-400"/>}
                                      </div>
                                      <div className="truncate">
                                          <p className="font-black text-slate-800 truncate uppercase text-[10px] sm:text-[11px] tracking-tight">{p.name}</p>
                                          <p className="text-[8px] sm:text-[9px] text-slate-400 uppercase font-black tracking-widest">{p.role}</p>
                                      </div>
                                  </button>
                              ))}
                          </div>
                      </div>
                  ))}
              </div>
          )}

          {activeTab === 'stats' && (
              <div className="space-y-12 sm:space-y-16 animate-fade-in-up px-1">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-12">
                      <div className="space-y-6 sm:space-y-8">
                          <div className="flex items-center gap-3 px-1">
                            <div className="p-2 bg-orange-100 text-orange-600 rounded-xl shadow-sm"><Star size={20} fill="currentColor"/></div>
                            <div>
                                <h3 className="font-black text-base sm:text-lg text-slate-900 uppercase tracking-tighter leading-none">Orange Cap</h3>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Leading Run Scorers</p>
                            </div>
                          </div>

                          {topStats.topBatsmen.length > 0 ? (
                              <div className="space-y-4 sm:space-y-6">
                                  <div onClick={() => handlePlayerClick(topStats.topBatsmen[0].id, topStats.topBatsmen[0].teamId)} className="cursor-pointer bg-gradient-to-br from-orange-500 to-orange-700 rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden group transition-all hover:scale-[1.01]">
                                      <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-7xl sm:text-9xl pointer-events-none">1</div>
                                      <div className="relative z-10 flex items-center gap-6 sm:gap-8">
                                          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl sm:rounded-[2rem] bg-white/20 border-2 sm:border-4 border-white/30 overflow-hidden shadow-2xl shrink-0">
                                              {topStats.topBatsmen[0].image ? <img src={topStats.topBatsmen[0].image} className="w-full h-full object-cover" alt={topStats.topBatsmen[0].name}/> : <div className="w-full h-full flex items-center justify-center text-4xl sm:text-5xl font-black text-white/30">{topStats.topBatsmen[0].name[0]}</div>}
                                          </div>
                                          <div className="min-w-0">
                                              <p className="text-orange-100 font-black text-[9px] sm:text-xs uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                                  <Trophy size={12}/> Top Performer
                                              </p>
                                              <h4 className="text-xl sm:text-3xl font-black uppercase tracking-tighter leading-tight truncate">{topStats.topBatsmen[0].name}</h4>
                                              <p className="text-orange-200 font-bold text-[10px] sm:text-sm uppercase opacity-80 mt-1 truncate">{topStats.topBatsmen[0].team}</p>
                                              <div className="mt-3 flex items-baseline gap-1.5">
                                                  <span className="text-4xl sm:text-6xl font-black tracking-tighter leading-none">{topStats.topBatsmen[0].runs}</span>
                                                  <span className="text-[9px] font-black opacity-60 uppercase tracking-widest">Runs</span>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                                  <div className="bg-white rounded-[1.5rem] sm:rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
                                      {topStats.topBatsmen.slice(1).map((p, i) => (
                                          <button key={p.id} onClick={() => handlePlayerClick(p.id, p.teamId)} className="w-full px-5 py-4 sm:px-8 sm:py-5 flex justify-between items-center border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-all text-left group">
                                              <div className="flex items-center gap-4 sm:gap-5">
                                                  <span className="font-black text-slate-200 text-sm sm:text-lg w-5">{i + 2}</span>
                                                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-slate-100 overflow-hidden border border-slate-200 group-hover:scale-105 transition-transform">
                                                    {p.image ? <img src={p.image} className="w-full h-full object-cover" alt={p.name}/> : <div className="w-full h-full flex items-center justify-center text-slate-300 font-black text-base">{p.name[0]}</div>}
                                                  </div>
                                                  <div className="min-w-0">
                                                      <p className="font-black text-slate-800 uppercase text-[11px] sm:text-[13px] tracking-tight truncate">{p.name}</p>
                                                      <p className="text-[8px] sm:text-[9px] text-slate-400 font-black uppercase tracking-widest truncate max-w-[100px] sm:max-w-[150px]">{p.team}</p>
                                                  </div>
                                              </div>
                                              <div className="text-right shrink-0">
                                                  <span className="font-black text-orange-600 text-xl sm:text-2xl tracking-tighter">{p.runs}</span>
                                                  <p className="text-[7px] sm:text-[8px] font-black text-slate-300 uppercase tracking-widest">Runs</p>
                                              </div>
                                          </button>
                                      ))}
                                  </div>
                              </div>
                          ) : <div className="p-12 text-center text-slate-400 bg-white rounded-[2rem] border border-dashed border-slate-200">No batting stats available yet.</div>}
                      </div>

                      <div className="space-y-6 sm:space-y-8">
                          <div className="flex items-center gap-3 px-1">
                            <div className="p-2 bg-purple-100 text-purple-600 rounded-xl shadow-sm"><Shield size={20} fill="currentColor"/></div>
                            <div>
                                <h3 className="font-black text-base sm:text-lg text-slate-900 uppercase tracking-tighter leading-none">Purple Cap</h3>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Leading Wicket Takers</p>
                            </div>
                          </div>

                          {topStats.topBowlers.length > 0 ? (
                              <div className="space-y-4 sm:space-y-6">
                                  <div onClick={() => handlePlayerClick(topStats.topBowlers[0].id, topStats.topBowlers[0].teamId)} className="cursor-pointer bg-gradient-to-br from-purple-600 to-purple-800 rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden group transition-all hover:scale-[1.01]">
                                      <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-7xl sm:text-9xl pointer-events-none">1</div>
                                      <div className="relative z-10 flex items-center gap-6 sm:gap-8">
                                          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl sm:rounded-[2rem] bg-white/20 border-2 sm:border-4 border-white/30 overflow-hidden shadow-2xl shrink-0">
                                              {topStats.topBowlers[0].image ? <img src={topStats.topBowlers[0].image} className="w-full h-full object-cover" alt={topStats.topBowlers[0].name}/> : <div className="w-full h-full flex items-center justify-center text-4xl sm:text-5xl font-black text-white/30">{topStats.topBowlers[0].name[0]}</div>}
                                          </div>
                                          <div className="min-w-0">
                                              <p className="text-purple-100 font-black text-[9px] sm:text-xs uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                                  <Trophy size={12}/> Top Wicket Taker
                                              </p>
                                              <h4 className="text-xl sm:text-3xl font-black uppercase tracking-tighter leading-tight truncate">{topStats.topBowlers[0].name}</h4>
                                              <p className="text-purple-200 font-bold text-[10px] sm:text-sm uppercase opacity-80 mt-1 truncate">{topStats.topBowlers[0].team}</p>
                                              <div className="mt-3 flex items-baseline gap-1.5">
                                                  <span className="text-4xl sm:text-6xl font-black tracking-tighter leading-none">{topStats.topBowlers[0].wickets}</span>
                                                  <span className="text-[9px] font-black opacity-60 uppercase tracking-widest">Wkts</span>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                                  <div className="bg-white rounded-[1.5rem] sm:rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
                                      {topStats.topBowlers.slice(1).map((p, i) => (
                                          <button key={p.id} onClick={() => handlePlayerClick(p.id, p.teamId)} className="w-full px-5 py-4 sm:px-8 sm:py-5 flex justify-between items-center border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-all text-left group">
                                              <div className="flex items-center gap-4 sm:gap-5">
                                                  <span className="font-black text-slate-200 text-sm sm:text-lg w-5">{i + 2}</span>
                                                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-slate-100 overflow-hidden border border-slate-200 group-hover:scale-105 transition-transform">
                                                    {p.image ? <img src={p.image} className="w-full h-full object-cover" alt={p.name}/> : <div className="w-full h-full flex items-center justify-center text-slate-300 font-black text-base">{p.name[0]}</div>}
                                                  </div>
                                                  <div className="min-w-0">
                                                      <p className="font-black text-slate-800 uppercase text-[11px] sm:text-[13px] tracking-tight truncate">{p.name}</p>
                                                      <p className="text-[8px] sm:text-[9px] text-slate-400 font-black uppercase tracking-widest truncate max-w-[100px] sm:max-w-[150px]">{p.team}</p>
                                                  </div>
                                              </div>
                                              <div className="text-right shrink-0">
                                                  <span className="font-black text-purple-600 text-xl sm:text-2xl tracking-tighter">{p.wickets}</span>
                                                  <p className="text-[7px] sm:text-[8px] font-black text-slate-300 uppercase tracking-widest">Wkts</p>
                                              </div>
                                          </button>
                                      ))}
                                  </div>
                              </div>
                          ) : <div className="p-12 text-center text-slate-400 bg-white rounded-[2rem] border border-dashed border-slate-200">No bowling stats available yet.</div>}
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'awards' && (
              <div className="max-w-5xl mx-auto space-y-10 animate-fade-in-up px-1 pb-10">
                  {!awardPlayers || (!awardPlayers.champion && !awardPlayers.runnersUp && !awardPlayers.mos && !awardPlayers.bestBat && !awardPlayers.bestBowl) ? (
                      <div className="text-center py-24 sm:py-32 bg-white rounded-[2.5rem] sm:rounded-[3rem] border-2 border-dashed border-slate-200">
                          <Award className="mx-auto text-slate-200 mb-6 w-12 h-12 sm:w-16 sm:h-16" />
                          <h3 className="text-sm sm:text-xl font-black text-slate-300 uppercase tracking-widest">Awards Ceremony Pending</h3>
                          <p className="text-xs sm:text-slate-400 mt-2">The winners haven't been announced yet.</p>
                      </div>
                  ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                          <div className="md:col-span-2">
                              <AwardCard title="Tournament Champion" teamInfo={awardPlayers.champion} icon={Trophy} colorClass="from-yellow-500 to-yellow-700" />
                          </div>
                          <div className="md:col-span-2">
                              <AwardCard title="Runners Up" teamInfo={awardPlayers.runnersUp} icon={Shield} colorClass="from-slate-500 to-slate-700" />
                          </div>
                          <AwardCard title="Man of the Series" playerInfo={awardPlayers.mos} icon={Star} colorClass="from-emerald-600 to-emerald-800" />
                          <AwardCard title="Best Batsman" playerInfo={awardPlayers.bestBat} icon={BarChart3} colorClass="from-orange-500 to-orange-700" />
                          <AwardCard title="Best Bowler" playerInfo={awardPlayers.bestBowl} icon={Shield} colorClass="from-purple-600 to-purple-800" />
                          
                          {tournament.seriesAwards?.emergencyNotes && (
                              <div className="md:col-span-2 bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 shadow-xl">
                                  <h3 className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4 flex items-center gap-2">
                                      <AlertCircle size={14} className="text-emerald-500" /> Tournament Notes
                                  </h3>
                                  <p className="text-xs sm:text-sm text-slate-600 font-medium whitespace-pre-wrap leading-relaxed">{tournament.seriesAwards.emergencyNotes}</p>
                              </div>
                          )}
                      </div>
                  )}
              </div>
          )}
      </div>

      {selectedMatch && (
          <MatchDetailModal 
            match={selectedMatch} 
            teamA={teams.find(t => t.id === selectedMatch.teamAId)!} 
            teamB={teams.find(t => t.id === selectedMatch.teamBId)!} 
            onClose={() => setSelectedMatch(null)}
            onPlayerClick={handlePlayerClick}
          />
      )}

      {selectedPlayerInfo && (
          <PlayerDetailModal 
            player={selectedPlayerInfo.player} 
            team={selectedPlayerInfo.team} 
            matches={matches} 
            onClose={() => setSelectedPlayerInfo(null)}
          />
      )}

      {selectedTeamHistory && (
          <TeamDetailModal 
            team={selectedTeamHistory.team}
            row={selectedTeamHistory.row}
            onClose={() => setSelectedTeamHistory(null)}
          />
      )}
    </Layout>
  );
};