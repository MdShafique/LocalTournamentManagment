import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getTeams, getTournament, subscribeToMatches } from '../services/storageService';
import { calculateTable } from '../utils/statsHelper';
import { Match, Team, Tournament, TableRow, MatchStatus } from '../types';
import { MatchCard } from '../components/MatchCard';
import { LiveDetailedCard } from '../components/LiveDetailedCard';
import { MatchDetailModal } from '../components/MatchDetailModal';
import { Trophy, Activity, Calendar as CalIcon, BarChart3, Shield, Loader2 } from 'lucide-react';
import { Layout } from '../components/Layout';

export const PublicView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | undefined>();
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [table, setTable] = useState<TableRow[]>([]);
  const [activeTab, setActiveTab] = useState<'matches' | 'table' | 'squads' | 'stats'>('matches');
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  // Initial Load (Teams & Tournament Info)
  useEffect(() => {
    const loadStaticData = async () => {
        if (id) {
            const t = await getTournament(id);
            const tm = await getTeams(id);
            setTournament(t);
            setTeams(tm);
            setLoading(false);
        }
    };
    loadStaticData();
  }, [id]);

  // REAL-TIME LISTENER FOR MATCHES
  useEffect(() => {
      if (!id) return;

      // Subscribe to real-time updates
      const unsubscribe = subscribeToMatches(id, (updatedMatches) => {
          setMatches(updatedMatches);
          
          // Re-calculate table whenever matches update
          if (teams.length > 0) {
             setTable(calculateTable(teams, updatedMatches));
          }

          // If a modal is open, update its data live!
          if (selectedMatch) {
              const current = updatedMatches.find(m => m.id === selectedMatch.id);
              if (current) setSelectedMatch(current);
          }
      });

      // Cleanup listener on unmount
      return () => unsubscribe();
  }, [id, teams.length, selectedMatch?.id]); 

  if (loading || !tournament) return <Layout><div className="flex justify-center mt-20"><Loader2 className="animate-spin text-emerald-600" size={40}/></div></Layout>;

  const liveMatches = matches.filter(m => m.status === MatchStatus.LIVE);
  const upcomingMatches = matches.filter(m => m.status === MatchStatus.SCHEDULED).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const completedMatches = matches.filter(m => m.status === MatchStatus.COMPLETED).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Aggregate stats from scorecards
  const getAllBattingStats = () => {
      const stats: Record<string, {name: string, runs: number, team: string}> = {};
      matches.forEach(m => {
          [...m.scorecard.A.batting, ...m.scorecard.B.batting].forEach(p => {
              if(!stats[p.playerId]) {
                  const team = teams.find(t => t.players?.some(pl => pl.id === p.playerId));
                  stats[p.playerId] = { name: p.playerName, runs: 0, team: team?.shortName || '' };
              }
              stats[p.playerId].runs += p.runs;
          });
      });
      return Object.values(stats).sort((a,b) => b.runs - a.runs).slice(0, 5);
  };
  
  const getAllBowlingStats = () => {
      const stats: Record<string, {name: string, wickets: number, team: string}> = {};
      matches.forEach(m => {
          [...m.scorecard.A.bowling, ...m.scorecard.B.bowling].forEach(p => {
               if(!stats[p.playerId]) {
                  const team = teams.find(t => t.players?.some(pl => pl.id === p.playerId));
                  stats[p.playerId] = { name: p.playerName, wickets: 0, team: team?.shortName || '' };
              }
              stats[p.playerId].wickets += p.wickets;
          });
      });
      return Object.values(stats).sort((a,b) => b.wickets - a.wickets).slice(0, 5);
  };

  const topBatsmen = getAllBattingStats();
  const topBowlers = getAllBowlingStats();

  return (
    <Layout title={tournament.name}>
      <div className="mb-8 text-center sm:text-left">
         <div className="sm:hidden mb-2">
            <h1 className="text-2xl font-bold text-slate-900">{tournament.name}</h1>
         </div>
         <p className="text-slate-500">
             {new Date(tournament.startDate).toLocaleDateString()} - {new Date(tournament.endDate).toLocaleDateString()}
         </p>
      </div>

      {/* Live Section */}
      {liveMatches.length > 0 && (
          <div className="mb-8">
              <h2 className="flex items-center gap-2 text-lg font-bold text-red-600 mb-4 animate-pulse">
                  <Activity size={20} /> LIVE NOW
              </h2>
              <div className="grid grid-cols-1 gap-6">
                  {liveMatches.map(m => (
                      <div key={m.id} onClick={() => setSelectedMatch(m)} className="cursor-pointer transition-transform hover:scale-[1.01]">
                        <LiveDetailedCard 
                            match={m} 
                            teamA={teams.find(t => t.id === m.teamAId)!}
                            teamB={teams.find(t => t.id === m.teamBId)!}
                        />
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* Navigation */}
      <div className="flex overflow-x-auto border-b border-slate-200 mb-6">
          {[
              { id: 'matches', label: 'Matches' },
              { id: 'table', label: 'Points Table' },
              { id: 'squads', label: 'Squads' },
              { id: 'stats', label: 'Stats' }
          ].map(tab => (
            <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                {tab.label}
            </button>
          ))}
      </div>

      {activeTab === 'matches' && (
          <div className="space-y-8 animate-fade-in-up">
               {upcomingMatches.length > 0 && (
                   <section>
                       <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><CalIcon size={18}/> Upcoming</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {upcomingMatches.map(m => (
                              <MatchCard 
                                key={m.id} 
                                match={m} 
                                teamA={teams.find(t => t.id === m.teamAId)}
                                teamB={teams.find(t => t.id === m.teamBId)}
                                onClick={() => setSelectedMatch(m)}
                              />
                          ))}
                       </div>
                   </section>
               )}
               {completedMatches.length > 0 && (
                   <section>
                       <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Trophy size={18}/> Completed</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {completedMatches.map(m => (
                              <MatchCard 
                                key={m.id} 
                                match={m} 
                                teamA={teams.find(t => t.id === m.teamAId)}
                                teamB={teams.find(t => t.id === m.teamBId)}
                                onClick={() => setSelectedMatch(m)}
                              />
                          ))}
                       </div>
                   </section>
               )}
               {upcomingMatches.length === 0 && completedMatches.length === 0 && liveMatches.length === 0 && (
                   <p className="text-slate-400 text-center py-10">No matches scheduled yet.</p>
               )}
          </div>
      )}

      {activeTab === 'table' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in-up">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100 text-slate-600 uppercase text-xs font-semibold">
                        <tr>
                            <th className="px-6 py-3">Team</th>
                            <th className="px-6 py-3 text-center">Grp</th>
                            <th className="px-6 py-3 text-center">P</th>
                            <th className="px-6 py-3 text-center">W</th>
                            <th className="px-6 py-3 text-center">L</th>
                            <th className="px-6 py-3 text-center">T</th>
                            <th className="px-6 py-3 text-center">NRR</th>
                            <th className="px-6 py-3 text-center font-bold">Pts</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {table.map((row, idx) => {
                             const team = teams.find(t => t.id === row.teamId);
                             return (
                            <tr key={row.teamId} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-2">
                                    <span className="text-slate-400 w-4">{idx + 1}</span> {row.teamName}
                                </td>
                                <td className="px-6 py-4 text-center text-slate-500 font-mono text-xs">{team?.group || '-'}</td>
                                <td className="px-6 py-4 text-center">{row.played}</td>
                                <td className="px-6 py-4 text-center text-emerald-600">{row.won}</td>
                                <td className="px-6 py-4 text-center text-red-500">{row.lost}</td>
                                <td className="px-6 py-4 text-center text-slate-500">{row.tied}</td>
                                <td className="px-6 py-4 text-center font-mono">{row.nrr.toFixed(3)}</td>
                                <td className="px-6 py-4 text-center font-bold text-slate-900">{row.points}</td>
                            </tr>
                        )})}
                    </tbody>
                </table>
              </div>
          </div>
      )}

      {activeTab === 'squads' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up">
              {teams.map(team => (
                  <div key={team.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                      <div className="flex justify-between items-center mb-4 border-b pb-2">
                          <h3 className="text-lg font-bold text-slate-900">{team.name}</h3>
                          <span className="text-xs bg-slate-100 px-2 py-1 rounded">{team.group}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          {team.players && team.players.length > 0 ? (
                              team.players.map(p => (
                                  <div key={p.id} className="flex items-center gap-2 text-sm">
                                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                                          {p.name[0]}
                                      </div>
                                      <div>
                                          <p className="font-medium">{p.name}</p>
                                          <p className="text-xs text-slate-400">{p.role}</p>
                                      </div>
                                  </div>
                              ))
                          ) : (
                              <p className="col-span-2 text-slate-400 italic text-sm text-center">No players added.</p>
                          )}
                      </div>
                  </div>
              ))}
          </div>
      )}

      {activeTab === 'stats' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in-up">
              {/* Most Runs */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-orange-500 text-white px-6 py-4 flex items-center gap-2">
                      <Trophy size={20}/>
                      <h3 className="font-bold">Most Runs</h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                      {topBatsmen.length > 0 ? topBatsmen.map((p, i) => (
                          <div key={i} className="px-6 py-3 flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                  <span className="font-bold text-slate-300">#{i+1}</span>
                                  <div>
                                      <p className="font-bold text-slate-800">{p.name}</p>
                                      <p className="text-xs text-slate-500">{p.team}</p>
                                  </div>
                              </div>
                              <span className="font-bold text-emerald-600">{p.runs}</span>
                          </div>
                      )) : <p className="p-6 text-center text-slate-400">Score matches to see stats.</p>}
                  </div>
              </div>

              {/* Most Wickets */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-blue-600 text-white px-6 py-4 flex items-center gap-2">
                      <Shield size={20}/>
                      <h3 className="font-bold">Most Wickets</h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                      {topBowlers.length > 0 ? topBowlers.map((p, i) => (
                          <div key={i} className="px-6 py-3 flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                  <span className="font-bold text-slate-300">#{i+1}</span>
                                  <div>
                                      <p className="font-bold text-slate-800">{p.name}</p>
                                      <p className="text-xs text-slate-500">{p.team}</p>
                                  </div>
                              </div>
                              <span className="font-bold text-blue-600">{p.wickets}</span>
                          </div>
                      )) : <p className="p-6 text-center text-slate-400">Score matches to see stats.</p>}
                  </div>
              </div>
          </div>
      )}

      {selectedMatch && (
          <MatchDetailModal 
            match={selectedMatch} 
            teamA={teams.find(t => t.id === selectedMatch.teamAId)!} 
            teamB={teams.find(t => t.id === selectedMatch.teamBId)!} 
            onClose={() => setSelectedMatch(null)}
          />
      )}

    </Layout>
  );
};