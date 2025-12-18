
import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { getTeams, getTournament, subscribeToMatches } from '../services/storageService';
import { calculateTable } from '../utils/statsHelper';
import { Match, Team, Tournament, TableRow, MatchStatus } from '../types';
import { MatchCard } from '../components/MatchCard';
import { LiveDetailedCard } from '../components/LiveDetailedCard';
import { MatchDetailModal } from '../components/MatchDetailModal';
import { Trophy, Activity, Calendar as CalIcon, BarChart3, Shield, Loader2, AlertCircle } from 'lucide-react';
import { Layout } from '../components/Layout';

export const PublicView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | undefined>();
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [table, setTable] = useState<TableRow[]>([]);
  const [activeTab, setActiveTab] = useState<'matches' | 'table' | 'squads' | 'stats'>('matches');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

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
            setTeams(tm);
        } catch (e) {
            setError("Failed to load tournament data.");
            setLoading(false);
        }
    };
    loadStaticData();
  }, [id]);

  useEffect(() => {
      if (!id) return;
      const unsubscribe = subscribeToMatches(id, (updatedMatches) => {
          setMatches(updatedMatches);
          setLoading(false); 
          if (teams.length > 0) setTable(calculateTable(teams, updatedMatches));
          if (selectedMatch) {
              const current = updatedMatches.find(m => m.id === selectedMatch.id);
              if (current) setSelectedMatch(current);
          }
      });
      return () => unsubscribe();
  }, [id, teams.length, selectedMatch?.id]); 

  // Memoized stats calculation to ensure it updates when teams/matches arrive
  const topStats = useMemo(() => {
    const battingStats: Record<string, {name: string, runs: number, team: string, image?: string}> = {};
    const bowlingStats: Record<string, {name: string, wickets: number, team: string, image?: string}> = {};

    matches.forEach(m => {
        if (!m.scorecard) return;

        // Helper to format team name (e.g., first 2 words if very long, else full)
        const formatTeamName = (tId: string) => {
            const team = teams.find(t => t.id === tId);
            if (!team) return 'Loading...';
            return team.name;
        };

        // Process Batting
        const processBatting = (scorecard: any[], teamId: string) => {
            scorecard.forEach(p => {
                if(!battingStats[p.playerId]) {
                    const team = teams.find(t => t.id === teamId);
                    const player = team?.players?.find(pl => pl.id === p.playerId);
                    battingStats[p.playerId] = { 
                        name: p.playerName, 
                        runs: 0, 
                        team: team?.name || 'Unknown', 
                        image: player?.image 
                    };
                }
                battingStats[p.playerId].runs += p.runs;
            });
        };

        // Process Bowling
        const processBowling = (scorecard: any[], teamId: string) => {
            scorecard.forEach(p => {
                if(!bowlingStats[p.playerId]) {
                    const team = teams.find(t => t.id === teamId);
                    const player = team?.players?.find(pl => pl.id === p.playerId);
                    bowlingStats[p.playerId] = { 
                        name: p.playerName, 
                        wickets: 0, 
                        team: team?.name || 'Unknown', 
                        image: player?.image 
                    };
                }
                bowlingStats[p.playerId].wickets += p.wickets;
            });
        };

        processBatting(m.scorecard.A.batting, m.teamAId);
        processBatting(m.scorecard.B.batting, m.teamBId);
        
        // Note: Team A is batting against Team B's bowling
        processBowling(m.scorecard.A.bowling, m.teamBId); 
        processBowling(m.scorecard.B.bowling, m.teamAId);
    });

    return {
        topBatsmen: Object.values(battingStats).sort((a,b) => b.runs - a.runs).slice(0, 10),
        topBowlers: Object.values(bowlingStats).sort((a,b) => b.wickets - a.wickets).slice(0, 10)
    };
  }, [matches, teams]);

  if (error) return <Layout><div className="flex flex-col items-center justify-center pt-20"><AlertCircle size={48} className="text-red-400 mb-4"/><p>{error}</p></div></Layout>;
  if (loading || !tournament) return <Layout><div className="flex justify-center mt-20"><Loader2 className="animate-spin text-emerald-600" size={40}/></div></Layout>;

  const liveMatches = matches.filter(m => m.status === MatchStatus.LIVE);
  const upcomingMatches = matches.filter(m => m.status === MatchStatus.SCHEDULED).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const completedMatches = matches.filter(m => m.status === MatchStatus.COMPLETED).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <Layout title={tournament.name}>
      <div className="mb-8 text-center sm:text-left">
         <p className="text-slate-500 font-medium">{new Date(tournament.startDate).toLocaleDateString()} - {new Date(tournament.endDate).toLocaleDateString()}</p>
      </div>

      {liveMatches.length > 0 && (
          <div className="mb-8">
              <h2 className="flex items-center gap-2 text-lg font-bold text-red-600 mb-4 animate-pulse"><Activity size={20} /> LIVE NOW</h2>
              <div className="grid grid-cols-1 gap-6">
                  {liveMatches.map(m => (
                      <div key={m.id} onClick={() => setSelectedMatch(m)} className="cursor-pointer transition-transform hover:scale-[1.01]">
                        <LiveDetailedCard match={m} teamA={teams.find(t => t.id === m.teamAId)!} teamB={teams.find(t => t.id === m.teamBId)!} />
                      </div>
                  ))}
              </div>
          </div>
      )}

      <div className="flex overflow-x-auto border-b border-slate-200 mb-6">
          {['matches', 'table', 'squads', 'stats'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap capitalize ${activeTab === tab ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{tab === 'table' ? 'Points Table' : tab}</button>
          ))}
      </div>

      {activeTab === 'matches' && (
          <div className="space-y-8">
               {upcomingMatches.length > 0 && (
                   <section>
                       <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 px-1 border-l-4 border-emerald-500"><CalIcon size={18}/> Upcoming</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {upcomingMatches.map(m => (
                              <MatchCard key={m.id} match={m} teamA={teams.find(t => t.id === m.teamAId)} teamB={teams.find(t => t.id === m.teamBId)} onClick={() => setSelectedMatch(m)} />
                          ))}
                       </div>
                   </section>
               )}
               {completedMatches.length > 0 && (
                   <section>
                       <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 px-1 border-l-4 border-blue-500"><Trophy size={18}/> Completed</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {completedMatches.map(m => (
                              <MatchCard key={m.id} match={m} teamA={teams.find(t => t.id === m.teamAId)} teamB={teams.find(t => t.id === m.teamBId)} onClick={() => setSelectedMatch(m)} />
                          ))}
                       </div>
                   </section>
               )}
               {upcomingMatches.length === 0 && completedMatches.length === 0 && liveMatches.length === 0 && <p className="text-slate-400 text-center py-10">No matches found.</p>}
          </div>
      )}

      {activeTab === 'table' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100 text-slate-600 uppercase text-xs font-semibold">
                        <tr><th className="px-6 py-3">Team</th><th className="px-6 py-3 text-center">Grp</th><th className="px-6 py-3 text-center">P</th><th className="px-6 py-3 text-center">W</th><th className="px-6 py-3 text-center">L</th><th className="px-6 py-3 text-center">NRR</th><th className="px-6 py-3 text-center font-bold">Pts</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {table.map((row, idx) => {
                             const team = teams.find(t => t.id === row.teamId);
                             return (
                            <tr key={row.teamId} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-2">
                                    <span className="text-slate-400 w-4 font-normal">{idx + 1}</span> 
                                    {row.teamName}
                                </td>
                                <td className="px-6 py-4 text-center text-slate-500">{team?.group || '-'}</td>
                                <td className="px-6 py-4 text-center">{row.played}</td>
                                <td className="px-6 py-4 text-center text-emerald-600 font-bold">{row.won}</td>
                                <td className="px-6 py-4 text-center text-red-500">{row.lost}</td>
                                <td className="px-6 py-4 text-center font-mono">{row.nrr.toFixed(3)}</td>
                                <td className="px-6 py-4 text-center font-bold text-emerald-800 bg-emerald-50/30">{row.points}</td>
                            </tr>
                        )})}
                    </tbody>
                </table>
              </div>
          </div>
      )}

      {activeTab === 'squads' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {teams.map(team => (
                  <div key={team.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                      <div className="flex justify-between items-center mb-4 border-b pb-2">
                          <h3 className="text-lg font-bold text-slate-900">{team.name}</h3>
                          <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-1 rounded border border-emerald-200">Group {team.group}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {team.players?.map(p => (
                              <div key={p.id} className="flex items-center gap-2 text-sm bg-slate-50 p-2 rounded-lg border border-slate-100">
                                  {p.image ? <img src={p.image} className="w-8 h-8 rounded-full object-cover border"/> : <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">{p.name[0]}</div>}
                                  <div className="truncate"><p className="font-bold text-slate-700 truncate">{p.name}</p><p className="text-[10px] text-slate-400 uppercase font-semibold">{p.role}</p></div>
                              </div>
                          ))}
                      </div>
                  </div>
              ))}
          </div>
      )}

      {activeTab === 'stats' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Top Batsmen */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-orange-500 text-white px-6 py-4 flex items-center gap-2"><Trophy size={20}/><h3 className="font-bold uppercase tracking-wider">Top Scorers</h3></div>
                  <div className="divide-y divide-slate-100">
                      {topStats.topBatsmen.map((p, i) => (
                          <div key={i} className="px-6 py-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                              <div className="flex items-center gap-3 min-w-0">
                                  <span className="font-bold text-slate-300 w-5">#{i+1}</span>
                                  {p.image ? (
                                      <img src={p.image} className="w-10 h-10 rounded-full object-cover shadow-sm border border-slate-200 shrink-0" />
                                  ) : (
                                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400 shrink-0 border border-slate-200">{p.name[0]}</div>
                                  )}
                                  <div className="truncate">
                                      <p className="font-bold text-slate-800 truncate">{p.name}</p>
                                      <p className="text-xs text-slate-500 font-semibold truncate bg-slate-100 inline-block px-1 rounded">{p.team}</p>
                                  </div>
                              </div>
                              <span className="font-mono font-bold text-emerald-600 text-xl pl-4">{p.runs}</span>
                          </div>
                      ))}
                      {topStats.topBatsmen.length === 0 && <p className="p-10 text-center text-slate-400 italic">No batting stats available yet.</p>}
                  </div>
              </div>

              {/* Top Bowlers */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-blue-600 text-white px-6 py-4 flex items-center gap-2"><Shield size={20}/><h3 className="font-bold uppercase tracking-wider">Top Wicket Takers</h3></div>
                  <div className="divide-y divide-slate-100">
                      {topStats.topBowlers.map((p, i) => (
                          <div key={i} className="px-6 py-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                              <div className="flex items-center gap-3 min-w-0">
                                  <span className="font-bold text-slate-300 w-5">#{i+1}</span>
                                  {p.image ? (
                                      <img src={p.image} className="w-10 h-10 rounded-full object-cover shadow-sm border border-slate-200 shrink-0" />
                                  ) : (
                                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400 shrink-0 border border-slate-200">{p.name[0]}</div>
                                  )}
                                  <div className="truncate">
                                      <p className="font-bold text-slate-800 truncate">{p.name}</p>
                                      <p className="text-xs text-slate-500 font-semibold truncate bg-slate-100 inline-block px-1 rounded">{p.team}</p>
                                  </div>
                              </div>
                              <span className="font-mono font-bold text-blue-600 text-xl pl-4">{p.wickets}</span>
                          </div>
                      ))}
                      {topStats.topBowlers.length === 0 && <p className="p-10 text-center text-slate-400 italic">No bowling stats available yet.</p>}
                  </div>
              </div>
          </div>
      )}

      {selectedMatch && <MatchDetailModal match={selectedMatch} teamA={teams.find(t => t.id === selectedMatch.teamAId)!} teamB={teams.find(t => t.id === selectedMatch.teamBId)!} onClose={() => setSelectedMatch(null)} />}
    </Layout>
  );
};
