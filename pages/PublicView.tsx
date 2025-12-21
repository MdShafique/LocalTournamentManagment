
import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { getTeams, getTournament, subscribeToMatches } from '../services/storageService';
import { calculateTable } from '../utils/statsHelper';
import { Match, Team, Tournament, TableRow, MatchStatus, Player } from '../types';
import { MatchCard } from '../components/MatchCard';
import { LiveDetailedCard } from '../components/LiveDetailedCard';
import { MatchDetailModal } from '../components/MatchDetailModal';
import { Trophy, Activity, BarChart3, Shield, Loader2, AlertCircle, Layers } from 'lucide-react';
import { Layout } from '../components/Layout';

export const PublicView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | undefined>();
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [groupedTables, setGroupedTables] = useState<Record<string, TableRow[]>>({});
  const [activeTab, setActiveTab] = useState<'matches' | 'table' | 'squads' | 'stats'>('matches');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal State
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  // Initial Load (Teams & Tournament Info)
  useEffect(() => {
    const loadStaticData = async () => {
        if (!id) return;
        try {
            const t = await getTournament(id);
            if (!t) {
                setError("Tournament not found. Please check the URL.");
                setLoading(false);
                return;
            }
            const tm = await getTeams(id);
            setTournament(t);
            setTeams(tm || []);
            // If teams load but matches listener takes time, we still want to show initial state
            if (tm) setLoading(false);
        } catch (e) {
            console.error(e);
            setError("Failed to load tournament data.");
            setLoading(false);
        }
    };
    loadStaticData();
  }, [id]);

  // REAL-TIME LISTENER FOR MATCHES
  useEffect(() => {
      if (!id) return;

      const unsubscribe = subscribeToMatches(id, (updatedMatches) => {
          const validMatches = updatedMatches || [];
          setMatches(validMatches);
          setLoading(false); 
          
          if (teams.length > 0) {
             // Correctly handle the grouped table from statsHelper
             const tableData = calculateTable(teams, validMatches);
             setGroupedTables(tableData);
          }

          if (selectedMatch) {
              const current = validMatches.find(m => m.id === selectedMatch.id);
              if (current) setSelectedMatch(current);
          }
      });

      return () => unsubscribe();
  }, [id, teams, selectedMatch?.id]); 

  // Aggregated Stats with safety checks
  const topStats = useMemo(() => {
    const battingStats: Record<string, {name: string, runs: number, team: string}> = {};
    const bowlingStats: Record<string, {name: string, wickets: number, team: string}> = {};

    matches.forEach(m => {
        if (!m.scorecard) return;
        
        const processStats = (inn: 'A' | 'B', tId: string, opponentTId: string) => {
            const scorecard = m.scorecard[inn];
            if (!scorecard) return;

            (scorecard.batting || []).forEach(p => {
                if(!battingStats[p.playerId]) {
                    const team = teams.find(t => t.id === tId);
                    battingStats[p.playerId] = { 
                        name: p.playerName || 'Unknown', 
                        runs: 0, 
                        team: team?.shortName || '??' 
                    };
                }
                battingStats[p.playerId].runs += (p.runs || 0);
            });

            (scorecard.bowling || []).forEach(p => {
                if(!bowlingStats[p.playerId]) {
                    const team = teams.find(t => t.id === opponentTId);
                    bowlingStats[p.playerId] = { 
                        name: p.playerName || 'Unknown', 
                        wickets: 0, 
                        team: team?.shortName || '??' 
                    };
                }
                bowlingStats[p.playerId].wickets += (p.wickets || 0);
            });
        };

        processStats('A', m.teamAId, m.teamBId);
        processStats('B', m.teamBId, m.teamAId);
    });

    return {
        topBatsmen: Object.values(battingStats).sort((a,b) => b.runs - a.runs).slice(0, 5),
        topBowlers: Object.values(bowlingStats).sort((a,b) => b.wickets - a.wickets).slice(0, 5)
    };
  }, [matches, teams]);

  if (error) {
      return (
          <Layout>
              <div className="flex flex-col items-center justify-center pt-20 text-slate-500">
                  <AlertCircle size={48} className="text-red-400 mb-4"/>
                  <h2 className="text-xl font-bold text-slate-800">Oops!</h2>
                  <p>{error}</p>
              </div>
          </Layout>
      );
  }

  if (loading || !tournament) {
      return (
        <Layout>
            <div className="flex flex-col items-center justify-center mt-20 gap-3">
                <Loader2 className="animate-spin text-emerald-600" size={40}/>
                <p className="text-slate-500 animate-pulse">Loading Live Scores...</p>
            </div>
        </Layout>
      );
  }

  const liveMatches = matches.filter(m => m.status === MatchStatus.LIVE);
  const otherMatches = matches.filter(m => m.status !== MatchStatus.LIVE)
    .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <Layout title={tournament.name}>
      {/* Header Section (Date removed as requested) */}
      <div className="mb-8 text-center sm:text-left">
         <div className="sm:hidden mb-2">
            <h1 className="text-2xl font-bold text-slate-900">{tournament.name}</h1>
         </div>
         {/* Date range removed from here */}
      </div>

      {/* Live Section */}
      {liveMatches.length > 0 && (
          <div className="mb-8">
              <h2 className="flex items-center gap-2 text-lg font-bold text-red-600 mb-4 animate-pulse">
                  <Activity size={20} /> LIVE NOW
              </h2>
              <div className="grid grid-cols-1 gap-6">
                  {liveMatches.map(m => {
                      const tA = teams.find(t => t.id === m.teamAId);
                      const tB = teams.find(t => t.id === m.teamBId);
                      if (!tA || !tB) return null;
                      return (
                        <div key={m.id} onClick={() => setSelectedMatch(m)} className="cursor-pointer transition-transform hover:scale-[1.01]">
                          <LiveDetailedCard 
                              match={m} 
                              teamA={tA}
                              teamB={tB}
                          />
                        </div>
                      );
                  })}
              </div>
          </div>
      )}

      {/* Navigation */}
      <div className="flex overflow-x-auto border-b border-slate-200 mb-6 sticky top-16 bg-slate-50 z-40">
          {[
              { id: 'matches', label: 'Matches', icon: Activity },
              { id: 'table', label: 'Points Table', icon: Layers },
              { id: 'squads', label: 'Squads', icon: Trophy },
              { id: 'stats', label: 'Stats', icon: BarChart3 }
          ].map(tab => (
            <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-4 font-bold text-sm border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === tab.id ? 'border-emerald-600 text-emerald-600 bg-emerald-50/10' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                <tab.icon size={16} /> {tab.label}
            </button>
          ))}
      </div>

      {activeTab === 'matches' && (
          <div className="space-y-8 animate-fade-in-up">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {otherMatches.map(m => {
                       const tA = teams.find(t => t.id === m.teamAId);
                       const tB = teams.find(t => t.id === m.teamBId);
                       return (
                        <MatchCard 
                            key={m.id} 
                            match={m} 
                            teamA={tA}
                            teamB={tB}
                            onClick={() => setSelectedMatch(m)}
                        />
                       );
                   })}
               </div>
               {matches.length === 0 && (
                   <p className="text-slate-400 text-center py-10 italic">No matches scheduled yet.</p>
               )}
          </div>
      )}

      {activeTab === 'table' && (
          <div className="space-y-10 animate-fade-in-up">
              {Object.entries(groupedTables).length > 0 ? (Object.entries(groupedTables) as [string, TableRow[]][]).sort(([a],[b]) => a.localeCompare(b)).map(([groupName, rows]) => (
                  <div key={groupName}>
                      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-tight">
                          <Layers className="text-emerald-600" size={20}/> {groupName} Standing
                      </h3>
                      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 text-slate-600 uppercase text-xs font-semibold">
                                <tr>
                                    <th className="px-6 py-3">Team</th>
                                    <th className="px-6 py-3 text-center">P</th>
                                    <th className="px-6 py-3 text-center">W</th>
                                    <th className="px-6 py-3 text-center">L</th>
                                    <th className="px-6 py-3 text-center font-bold text-blue-600">T</th>
                                    <th className="px-6 py-3 text-center">NRR</th>
                                    <th className="px-6 py-3 text-center font-bold text-slate-900">Pts</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {rows.map((row: TableRow, idx: number) => (
                                    <tr key={row.teamId} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-900">
                                            <span className="text-slate-300 mr-2">{idx + 1}</span> {row.teamName}
                                        </td>
                                        <td className="px-6 py-4 text-center">{row.played}</td>
                                        <td className="px-6 py-4 text-center text-emerald-600">{row.won}</td>
                                        <td className="px-6 py-4 text-center text-red-500">{row.lost}</td>
                                        <td className="px-6 py-4 text-center text-blue-500 font-bold">{row.tied}</td>
                                        <td className="px-6 py-4 text-center font-mono text-xs">{row.nrr.toFixed(3)}</td>
                                        <td className="px-6 py-4 text-center font-bold text-slate-900 bg-slate-50/50">{row.points}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                      </div>
                  </div>
              )) : <p className="text-center py-20 text-slate-400 italic">No match data available yet.</p>}
          </div>
      )}

      {activeTab === 'squads' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up">
              {teams.map((team: Team) => (
                  <div key={team.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                      <div className="flex justify-between items-center mb-4 border-b pb-2">
                          <h3 className="text-lg font-bold text-slate-900">{team.name}</h3>
                          <span className="text-xs bg-slate-100 px-2 py-1 rounded font-bold uppercase">{team.group}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {team.players && team.players.length > 0 ? (
                              (team.players as Player[]).map((p: Player) => (
                                  <div key={p.id} className="flex items-center gap-3 text-sm bg-slate-50 p-2 rounded-lg border border-slate-100">
                                      <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 overflow-hidden shrink-0">
                                          {p.image ? <img src={p.image} className="w-full h-full object-cover" alt={p.name} /> : p.name[0]}
                                      </div>
                                      <div className="truncate">
                                          <p className="font-bold text-slate-800 truncate">{p.name}</p>
                                          <p className="text-[10px] text-slate-400 uppercase font-bold">{p.role}</p>
                                      </div>
                                  </div>
                              ))
                          ) : (
                              <p className="col-span-full text-slate-400 italic text-sm text-center py-4">No players added.</p>
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
                      <h3 className="font-bold uppercase text-sm tracking-wider">Most Runs</h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                      {topStats.topBatsmen.length > 0 ? topStats.topBatsmen.map((p, i) => (
                          <div key={i} className="px-6 py-4 flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                  <span className="font-bold text-slate-200 text-lg w-6">#{i+1}</span>
                                  <div>
                                      <p className="font-bold text-slate-800 uppercase tracking-tight">{p.name}</p>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase">{p.team}</p>
                                  </div>
                              </div>
                              <span className="font-black text-emerald-600 text-2xl tracking-tighter">{p.runs}</span>
                          </div>
                      )) : <p className="p-10 text-center text-slate-400 italic">Score matches to see stats.</p>}
                  </div>
              </div>

              {/* Most Wickets */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-blue-600 text-white px-6 py-4 flex items-center gap-2">
                      <Shield size={20}/>
                      <h3 className="font-bold uppercase text-sm tracking-wider">Most Wickets</h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                      {topStats.topBowlers.length > 0 ? topStats.topBowlers.map((p, i) => (
                          <div key={i} className="px-6 py-4 flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                  <span className="font-black text-slate-200 text-lg w-6">#{i+1}</span>
                                  <div>
                                      <p className="font-bold text-slate-800 uppercase tracking-tight">{p.name}</p>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase">{p.team}</p>
                                  </div>
                              </div>
                              <span className="font-black text-blue-600 text-2xl tracking-tighter">{p.wickets}</span>
                          </div>
                      )) : <p className="p-10 text-center text-slate-400 italic">Score matches to see stats.</p>}
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
