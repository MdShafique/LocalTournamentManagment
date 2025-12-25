import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { getTeams, getTournament, subscribeToMatches } from '../services/storageService';
import { calculateTable } from '../utils/statsHelper';
import { Match, Team, Tournament, TableRow, MatchStatus, Player } from '../types';
import { MatchCard } from '../components/MatchCard';
import { LiveDetailedCard } from '../components/LiveDetailedCard';
import { MatchDetailModal } from '../components/MatchDetailModal';
import { PlayerDetailModal } from '../components/PlayerDetailModal';
import { Trophy, Activity, BarChart3, Shield, Loader2, AlertCircle, Layers, Star, User, Calendar, ChevronRight, Award } from 'lucide-react';
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
      <div className={`relative group overflow-hidden rounded-[2.5rem] bg-gradient-to-br ${colorClass} p-8 text-white shadow-2xl transition-all hover:scale-[1.03] animate-fade-in-up`}>
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Icon size={160} />
          </div>
          <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-2">{title}</p>
              <div className="flex items-center gap-6">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-white/20 border-4 border-white/30 overflow-hidden shadow-2xl shrink-0">
                      {playerInfo?.player?.image || teamInfo?.logo ? (
                          <img src={playerInfo?.player?.image || teamInfo?.logo} className="w-full h-full object-cover" alt="Awardee" />
                      ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl font-black text-white/40">
                              {(playerInfo?.player?.name || teamInfo?.name || "?")[0]}
                          </div>
                      )}
                  </div>
                  <div>
                      <h4 className="text-2xl sm:text-4xl font-black uppercase tracking-tighter leading-tight mb-1">
                          {playerInfo?.player?.name || teamInfo?.name}
                      </h4>
                      <p className="text-sm font-bold opacity-80 uppercase tracking-widest">
                          {playerInfo?.team?.name || teamInfo?.group || "Tournament Star"}
                      </p>
                      {playerInfo?.player?.role && (
                        <span className="inline-block mt-3 px-3 py-1 bg-white/10 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10">
                            {playerInfo.player.role}
                        </span>
                      )}
                  </div>
              </div>
          </div>
      </div>
    );
  };

  if (error) return <Layout><div className="flex flex-col items-center justify-center pt-20 text-slate-500"><AlertCircle size={48} className="text-red-400 mb-4"/><h2>Oops! {error}</h2></div></Layout>;
  if (loading || !tournament) return <Layout><div className="flex flex-col items-center justify-center mt-20 gap-3"><Loader2 className="animate-spin text-emerald-600" size={40}/><p className="text-slate-500 uppercase text-[10px] font-black tracking-widest">CricManage Engine...</p></div></Layout>;

  return (
    <Layout title={tournament.name}>
      <div className="flex overflow-x-auto border-b border-slate-200 mb-8 sticky top-16 bg-slate-50/80 backdrop-blur-md z-40 no-scrollbar">
          {[
              { id: 'matches', label: 'Matches', icon: Activity },
              { id: 'table', label: 'Standings', icon: Layers },
              { id: 'squads', label: 'Squads', icon: Trophy },
              { id: 'stats', label: 'Leaderboard', icon: BarChart3 },
              { id: 'awards', label: 'Awards', icon: Award }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-6 py-5 font-black text-[11px] uppercase tracking-widest border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === tab.id ? 'border-emerald-600 text-emerald-600 bg-emerald-50/10' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                <tab.icon size={16} /> {tab.label}
            </button>
          ))}
      </div>

      {activeTab === 'matches' && (
          <div className="space-y-12 animate-fade-in-up">
              {sortedMatches.live.length > 0 && (
                  <div>
                      <h2 className="flex items-center gap-2 text-[10px] font-black text-red-600 mb-6 tracking-[0.3em] uppercase">
                          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span> Match Center (Live)
                      </h2>
                      {sortedMatches.live.map(m => {
                          const tA = teams.find(t => t.id === m.teamAId);
                          const tB = teams.find(t => t.id === m.teamBId);
                          if (!tA || !tB) return null;
                          return (
                            <div key={m.id} onClick={() => setSelectedMatch(m)} className="cursor-pointer transition-transform hover:scale-[1.01] mb-6">
                              <LiveDetailedCard match={m} teamA={tA} teamB={tB} />
                            </div>
                          );
                      })}
                  </div>
              )}
              {sortedMatches.upcoming.length > 0 && (
                  <div>
                      <h3 className="text-[10px] font-black text-slate-400 mb-6 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Calendar size={14} className="text-emerald-500" /> Upcoming Matches
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                          {sortedMatches.upcoming.map(m => (
                            <MatchCard key={m.id} match={m} teamA={teams.find(t => t.id === m.teamAId)} teamB={teams.find(t => t.id === m.teamBId)} onClick={() => setSelectedMatch(m)} />
                          ))}
                      </div>
                  </div>
              )}
              {sortedMatches.results.length > 0 && (
                  <div>
                      <h3 className="text-[10px] font-black text-slate-400 mb-6 uppercase tracking-[0.2em] flex items-center gap-2">
                        <ChevronRight size={14} /> Recent Results
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
          <div className="space-y-12 animate-fade-in-up">
              {Object.entries(groupedTables).map(([groupName, rows]) => (
                  <div key={groupName}>
                      <h3 className="text-xs font-black text-slate-400 mb-5 flex items-center gap-3 uppercase tracking-widest">{groupName} Standing</h3>
                      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-widest">
                                <tr>
                                    <th className="px-8 py-5">Team</th>
                                    <th className="px-6 py-5 text-center">P</th><th className="px-6 py-5 text-center">W</th><th className="px-6 py-5 text-center">L</th><th className="px-6 py-5 text-center">T</th><th className="px-6 py-5 text-center">NRR</th><th className="px-8 py-5 text-center bg-slate-100/30">Pts</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {rows.map((row, idx) => (
                                    <tr key={row.teamId} className="hover:bg-emerald-50/30 transition-colors">
                                        <td className="px-8 py-5 font-black text-slate-900"><span className="text-slate-200 mr-3 italic">{idx + 1}</span> {row.teamName}</td>
                                        <td className="px-6 py-5 text-center">{row.played}</td>
                                        <td className="px-6 py-5 text-center text-emerald-600">{row.won}</td>
                                        <td className="px-6 py-5 text-center text-red-500">{row.lost}</td>
                                        <td className="px-6 py-5 text-center text-blue-500 font-black">{row.tied}</td>
                                        <td className="px-6 py-5 text-center font-mono text-xs">{row.nrr.toFixed(3)}</td>
                                        <td className="px-8 py-5 text-center font-black bg-slate-50/50">{row.points}</td>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in-up">
              {teams.map(team => (
                  <div key={team.id} className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8">
                      <div className="flex justify-between items-center mb-6 border-b pb-4">
                          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">{team.name}</h3>
                          <span className="text-[10px] bg-slate-900 text-white px-3 py-1 rounded-full font-black uppercase tracking-widest">{team.group}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {team.players?.map(p => (
                              <button key={p.id} onClick={() => handlePlayerClick(p.id, team.id)} className="flex items-center gap-3 text-sm bg-slate-50/50 p-3 rounded-2xl border border-slate-100 hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left group">
                                  <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                                      {p.image ? <img src={p.image} className="w-full h-full object-cover" alt={p.name} /> : <User size={18} className="text-slate-400"/>}
                                  </div>
                                  <div className="truncate">
                                      <p className="font-black text-slate-800 truncate uppercase text-[11px] tracking-tight">{p.name}</p>
                                      <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">{p.role}</p>
                                  </div>
                              </button>
                          ))}
                      </div>
                  </div>
              ))}
          </div>
      )}

      {activeTab === 'stats' && (
          <div className="space-y-16 animate-fade-in-up">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-8">
                      <div className="flex items-center gap-3 px-2">
                        <div className="p-2.5 bg-orange-100 text-orange-600 rounded-2xl shadow-sm"><Star size={24} fill="currentColor"/></div>
                        <div>
                            <h3 className="font-black text-lg text-slate-900 uppercase tracking-tighter leading-none">Orange Cap</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Leading Run Scorers</p>
                        </div>
                      </div>
                      {topStats.topBatsmen.length > 0 ? (
                          <div className="space-y-6">
                              <div onClick={() => handlePlayerClick(topStats.topBatsmen[0].id, topStats.topBatsmen[0].teamId)} className="cursor-pointer bg-gradient-to-br from-orange-500 to-orange-700 rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden group transition-all hover:scale-[1.02]">
                                  <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-9xl">1</div>
                                  <div className="relative z-10 flex items-center gap-8">
                                      <div className="w-32 h-32 rounded-[2rem] bg-white/20 border-4 border-white/30 overflow-hidden shadow-2xl shrink-0">
                                          {topStats.topBatsmen[0].image ? <img src={topStats.topBatsmen[0].image} className="w-full h-full object-cover" alt={topStats.topBatsmen[0].name}/> : <div className="w-full h-full flex items-center justify-center text-5xl font-black text-white/30">{topStats.topBatsmen[0].name[0]}</div>}
                                      </div>
                                      <div>
                                          <p className="text-orange-100 font-black text-xs uppercase tracking-widest mb-2 flex items-center gap-2"><Trophy size={14}/> Top Performer</p>
                                          <h4 className="text-3xl font-black uppercase tracking-tighter leading-tight">{topStats.topBatsmen[0].name}</h4>
                                          <p className="text-orange-200 font-bold text-sm uppercase opacity-80 mt-1">{topStats.topBatsmen[0].team}</p>
                                          <div className="mt-4 flex items-baseline gap-2">
                                              <span className="text-6xl font-black tracking-tighter leading-none">{topStats.topBatsmen[0].runs}</span>
                                              <span className="text-xs font-black opacity-60 uppercase tracking-widest">Runs</span>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
                                  {topStats.topBatsmen.slice(1).map((p, i) => (
                                      <button key={p.id} onClick={() => handlePlayerClick(p.id, p.teamId)} className="w-full px-8 py-5 flex justify-between items-center border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-all text-left group">
                                          <div className="flex items-center gap-5">
                                              <span className="font-black text-slate-200 text-lg w-6">{i + 2}</span>
                                              <div className="w-12 h-12 rounded-2xl bg-slate-100 overflow-hidden border border-slate-200 group-hover:scale-105 transition-transform">
                                                {p.image ? <img src={p.image} className="w-full h-full object-cover" alt={p.name}/> : <div className="w-full h-full flex items-center justify-center text-slate-300 font-black text-lg">{p.name[0]}</div>}
                                              </div>
                                              <div>
                                                  <p className="font-black text-slate-800 uppercase text-[13px] tracking-tight">{p.name}</p>
                                                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest truncate max-w-[120px]">{p.team}</p>
                                              </div>
                                          </div>
                                          <div className="text-right">
                                              <span className="font-black text-orange-600 text-2xl tracking-tighter">{p.runs}</span>
                                              <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Runs</p>
                                          </div>
                                      </button>
                                  ))}
                              </div>
                          </div>
                      ) : <div className="p-12 text-center text-slate-400 bg-white rounded-[2.5rem] border border-dashed border-slate-200">No batting stats available yet.</div>}
                  </div>
                  <div className="space-y-8">
                      <div className="flex items-center gap-3 px-2">
                        <div className="p-2.5 bg-purple-100 text-purple-600 rounded-2xl shadow-sm"><Shield size={24} fill="currentColor"/></div>
                        <div>
                            <h3 className="font-black text-lg text-slate-900 uppercase tracking-tighter leading-none">Purple Cap</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Leading Wicket Takers</p>
                        </div>
                      </div>
                      {topStats.topBowlers.length > 0 ? (
                          <div className="space-y-6">
                              <div onClick={() => handlePlayerClick(topStats.topBowlers[0].id, topStats.topBowlers[0].teamId)} className="cursor-pointer bg-gradient-to-br from-purple-600 to-purple-800 rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden group transition-all hover:scale-[1.02]">
                                  <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-9xl">1</div>
                                  <div className="relative z-10 flex items-center gap-8">
                                      <div className="w-32 h-32 rounded-[2rem] bg-white/20 border-4 border-white/30 overflow-hidden shadow-2xl shrink-0">
                                          {topStats.topBowlers[0].image ? <img src={topStats.topBowlers[0].image} className="w-full h-full object-cover" alt={topStats.topBowlers[0].name}/> : <div className="w-full h-full flex items-center justify-center text-5xl font-black text-white/30">{topStats.topBowlers[0].name[0]}</div>}
                                      </div>
                                      <div>
                                          <p className="text-purple-100 font-black text-xs uppercase tracking-widest mb-2 flex items-center gap-2"><Trophy size={14}/> Top Wicket Taker</p>
                                          <h4 className="text-3xl font-black uppercase tracking-tighter leading-tight">{topStats.topBowlers[0].name}</h4>
                                          <p className="text-purple-200 font-bold text-sm uppercase opacity-80 mt-1">{topStats.topBowlers[0].team}</p>
                                          <div className="mt-4 flex items-baseline gap-2">
                                              <span className="text-6xl font-black tracking-tighter leading-none">{topStats.topBowlers[0].wickets}</span>
                                              <span className="text-xs font-black opacity-60 uppercase tracking-widest">Wkts</span>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
                                  {topStats.topBowlers.slice(1).map((p, i) => (
                                      <button key={p.id} onClick={() => handlePlayerClick(p.id, p.teamId)} className="w-full px-8 py-5 flex justify-between items-center border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-all text-left group">
                                          <div className="flex items-center gap-5">
                                              <span className="font-black text-slate-200 text-lg w-6">{i + 2}</span>
                                              <div className="w-12 h-12 rounded-2xl bg-slate-100 overflow-hidden border border-slate-200 group-hover:scale-105 transition-transform">
                                                {p.image ? <img src={p.image} className="w-full h-full object-cover" alt={p.name}/> : <div className="w-full h-full flex items-center justify-center text-slate-300 font-black text-lg">{p.name[0]}</div>}
                                              </div>
                                              <div>
                                                  <p className="font-black text-slate-800 uppercase text-[13px] tracking-tight">{p.name}</p>
                                                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest truncate max-w-[120px]">{p.team}</p>
                                              </div>
                                          </div>
                                          <div className="text-right">
                                              <span className="font-black text-purple-600 text-2xl tracking-tighter">{p.wickets}</span>
                                              <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Wkts</p>
                                          </div>
                                      </button>
                                  ))}
                              </div>
                          </div>
                      ) : <div className="p-12 text-center text-slate-400 bg-white rounded-[2.5rem] border border-dashed border-slate-200">No bowling stats available yet.</div>}
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'awards' && (
          <div className="max-w-5xl mx-auto space-y-10 animate-fade-in-up">
              {!awardPlayers || (!awardPlayers.champion && !awardPlayers.runnersUp && !awardPlayers.mos && !awardPlayers.bestBat && !awardPlayers.bestBowl) ? (
                  <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                      <Award size={64} className="mx-auto text-slate-200 mb-6" />
                      <h3 className="text-xl font-black text-slate-300 uppercase tracking-widest">Awards Ceremony Pending</h3>
                      <p className="text-slate-400 mt-2">The winners haven't been announced yet. Stay tuned!</p>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                          <div className="md:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
                              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4 flex items-center gap-2">
                                  <AlertCircle size={14} className="text-emerald-500" /> Tournament Notes
                              </h3>
                              <p className="text-slate-600 font-medium whitespace-pre-wrap leading-relaxed">{tournament.seriesAwards.emergencyNotes}</p>
                          </div>
                      )}
                  </div>
              )}
          </div>
      )}

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
    </Layout>
  );
};