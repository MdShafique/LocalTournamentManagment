import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMatches, getTeams, getTournament, saveTeam, saveMatch, initializeMatch, deleteTeam, deleteMatch, addPlayerToTeam, deletePlayerFromTeam, saveTournament, updatePlayerInTeam } from '../services/storageService';
import { Match, Team, Tournament, Player, StageType, MatchStatus } from '../types';
import { Layout } from '../components/Layout';
import { AdminMatchControl } from '../components/AdminMatchControl';
import { MatchCard } from '../components/MatchCard';
import { auth, onAuthStateChanged } from '../services/firebase'; 
import { Plus, Users, Calendar, ArrowLeft, Share2, X, Trash2, Loader2, Lock, Edit2, Check, UserPlus, Save, Layers, Clock, Medal, Trophy } from 'lucide-react';

export const TournamentAdmin: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [tournament, setTournament] = useState<Tournament | undefined>();
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [view, setView] = useState<'overview' | 'teams' | 'matches' | 'awards'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamGroup, setNewTeamGroup] = useState('Group A');
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);

  const [selectedTeamForSquad, setSelectedTeamForSquad] = useState<Team | null>(null);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerRole, setNewPlayerRole] = useState<Player['role']>('Batsman');
  const [newPlayerImage, setNewPlayerImage] = useState('');

  const [isEditingTournament, setIsEditingTournament] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  const [showScheduler, setShowScheduler] = useState(false);
  const [schedData, setSchedData] = useState({
      teamA: '', teamB: '',
      date: new Date().toISOString().split('T')[0],
      time: '10:00', overs: 20, type: 'T20', groupStage: 'Group Stage',
      stageType: 'group' as StageType
  });

  const refreshData = useCallback(async () => {
    if (!id) return;
    
    try {
        const t = await getTournament(id);
        const currentUser = auth.currentUser;

        if (!t) {
            setIsLoading(false);
            return;
        }

        if (!currentUser || t.adminId !== currentUser.uid) {
            setPermissionDenied(true);
            setIsLoading(false);
            return;
        }

        const tm = await getTeams(id);
        const m = await getMatches(id);
        
        setTournament(t);
        setTeams(tm);
        setMatches(m);
        setSelectedTeamForSquad(prev => prev ? tm.find(team => team.id === prev.id) || null : null);
    } catch (err) {
        console.error("Refresh Error:", err);
    } finally {
        setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: any) => {
      if (user) {
        refreshData();
      } else {
        setIsLoading(false);
        setPermissionDenied(true);
      }
    });
    return () => unsubscribe();
  }, [refreshData]);

  // Enhanced allPlayers to include team names for identification
  const allPlayers = useMemo(() => {
    const list: (Player & { teamName: string })[] = [];
    teams.forEach(t => {
      if (t.players) {
        t.players.forEach(p => {
          list.push({ ...p, teamName: t.name });
        });
      }
    });
    return list.sort((a,b) => a.name.localeCompare(b.name));
  }, [teams]);

  const groupedTeams = useMemo(() => {
    const groups: Record<string, Team[]> = {};
    teams.forEach(t => {
      const g = (t.group || 'Group A').trim();
      if (!groups[g]) groups[g] = [];
      groups[g].push(t);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [teams]);

  const sortedMatches = useMemo(() => {
      const live = matches.filter(m => m.status === MatchStatus.LIVE);
      const scheduled = matches.filter(m => m.status === MatchStatus.SCHEDULED).sort((a, b) => {
          const dtA = new Date(`${a.date} ${a.time}`).getTime();
          const dtB = new Date(`${b.date} ${b.time}`).getTime();
          return dtA - dtB;
      });
      const results = matches.filter(m => m.status === MatchStatus.COMPLETED || m.status === MatchStatus.ABANDONED).sort((a, b) => {
          const dtA = new Date(`${a.date} ${a.time}`).getTime();
          const dtB = new Date(`${b.date} ${b.time}`).getTime();
          // Fix: Proper sorting for results (date descending)
          return dtB - dtA;
      });
      return [...live, ...scheduled, ...results];
  }, [matches]);

  const handleUpdateTournament = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!tournament) return;
      await saveTournament(tournament);
      setIsEditingTournament(false);
  };

  const handleSaveAwards = async () => {
    if (!tournament) return;
    setIsLoading(true);
    await saveTournament(tournament);
    setIsLoading(false);
    alert("Awards saved successfully!");
  };

  const handleAddTeam = async () => {
    if (!newTeamName.trim() || !id) return;
    const newTeam: Team = {
      id: Date.now().toString(),
      tournamentId: id,
      name: newTeamName,
      shortName: newTeamName.substring(0, 3).toUpperCase(),
      group: newTeamGroup || 'Group A',
      players: []
    };
    await saveTeam(newTeam);
    setNewTeamName('');
    await refreshData();
  };

  const handleUpdateTeam = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingTeam) return;
      await saveTeam(editingTeam);
      setEditingTeam(null);
      await refreshData();
  };

  const handleAddPlayer = async () => {
      if (!selectedTeamForSquad || !newPlayerName.trim()) return;
      await addPlayerToTeam(selectedTeamForSquad.id, newPlayerName, newPlayerRole, newPlayerImage);
      setNewPlayerName('');
      setNewPlayerImage('');
      await refreshData();
  };

  const handleUpdatePlayer = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedTeamForSquad || !editingPlayer) return;
      await updatePlayerInTeam(selectedTeamForSquad.id, editingPlayer);
      setEditingPlayer(null);
      await refreshData();
  };

  const handleDeletePlayer = async (playerId: string) => {
      if (!selectedTeamForSquad) return;
      if (window.confirm("Remove player?")) {
        await deletePlayerFromTeam(selectedTeamForSquad.id, playerId);
        await refreshData();
      }
  };

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || schedData.teamA === schedData.teamB) return;
    const m = initializeMatch(
      id, 
      schedData.teamA, 
      schedData.teamB, 
      schedData.date, 
      schedData.time, 
      schedData.type, 
      schedData.overs, 
      schedData.groupStage,
      schedData.stageType
    );
    await saveMatch(m);
    await refreshData();
    setShowScheduler(false);
    setView('matches');
  };

  const handleUpdateMatch = async (m: Match) => {
    setActiveMatch(m);
    await saveMatch(m);
    setMatches(prev => prev.map(pm => pm.id === m.id ? m : pm));
  };

  const handleDeleteMatch = async (mid: string) => {
      if(window.confirm('Delete match permanently?')) {
        await deleteMatch(mid);
        if (activeMatch?.id === mid) {
          setActiveMatch(null);
        }
        await refreshData();
      }
  };

  const handleDeleteTeam = async (tid: string) => {
      if(window.confirm('Delete team?')) {
          await deleteTeam(tid);
          await refreshData();
      }
  };

  if (isLoading) return <Layout><div className="flex justify-center mt-20"><Loader2 className="animate-spin text-emerald-600" size={40}/></div></Layout>;
  if (permissionDenied) return <Layout><div className="text-center pt-20"><Lock size={64} className="mx-auto mb-4 text-red-300"/><h1 className="text-2xl font-bold">Access Denied</h1><p className="text-slate-500 mt-2">You must be the admin to manage this tournament.</p><button onClick={() => navigate('/admin')} className="mt-4 bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold">Admin Portal</button></div></Layout>;
  if (!tournament) return <Layout><div className="text-center pt-20">Tournament not found.</div></Layout>;

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
           <button onClick={() => navigate('/admin')} className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-sm mb-2"><ArrowLeft size={16}/> Back</button>
           <div className="flex items-center gap-3">
               {tournament.logo && <img src={tournament.logo} className="w-10 h-10 rounded-full object-cover border" alt="logo"/>}
               {isEditingTournament ? (
                   <form onSubmit={handleUpdateTournament} className="flex items-center gap-2">
                       <input autoFocus className="text-2xl font-bold text-slate-900 border-b-2 border-emerald-500 outline-none bg-transparent" value={tournament.name} onChange={(e) => setTournament(prev => prev ? {...prev, name: e.target.value} : prev)} />
                       <button type="submit" className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-full"><Check size={20}/></button>
                       <button type="button" onClick={() => { setIsEditingTournament(false); refreshData(); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-full"><X size={20}/></button>
                   </form>
               ) : (
                   <>
                       <h1 className="text-2xl font-bold text-slate-900">{tournament.name}</h1>
                       <button onClick={() => setIsEditingTournament(true)} className="p-1.5 text-slate-400 hover:text-slate-600"><Edit2 size={16}/></button>
                   </>
               )}
           </div>
        </div>
        <button onClick={() => { const url = `${window.location.origin}/#/view/${tournament.id}`; navigator.clipboard.writeText(url); alert('URL copied!'); }} className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg font-bold border border-emerald-100"><Share2 size={18} /> Share Link</button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 border-b border-slate-200">
          {['overview', 'teams', 'matches', 'awards'].map(tab => (
              <button key={tab} onClick={() => { setView(tab as any); setActiveMatch(null); setSelectedTeamForSquad(null); }} className={`px-4 py-2 rounded-lg font-medium capitalize ${view === tab && !activeMatch && !selectedTeamForSquad ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'}`}>{tab}</button>
          ))}
      </div>

      {activeMatch ? (
          <AdminMatchControl 
            match={activeMatch} 
            teamA={teams.find(t => t.id === activeMatch.teamAId)!} 
            teamB={teams.find(t => t.id === activeMatch.teamBId)!} 
            onUpdate={handleUpdateMatch} 
            onDelete={() => handleDeleteMatch(activeMatch.id)}
          />
      ) : selectedTeamForSquad ? (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-fade-in-up">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                  <h3 className="font-bold text-lg flex items-center gap-2"><Users size={20} className="text-emerald-600"/> Squad: {selectedTeamForSquad.name}</h3>
                  <button onClick={() => setSelectedTeamForSquad(null)} className="text-slate-400 p-1 hover:bg-slate-100 rounded-full"><X size={24}/></button>
              </div>
              
              <div className="flex flex-col md:flex-row gap-3 mb-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Player Name</label>
                      <input className="w-full border rounded-lg px-3 py-2 mt-1" placeholder="Enter name" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} />
                  </div>
                  <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Role</label>
                      <select className="w-full border rounded-lg px-3 py-2 mt-1 bg-white" value={newPlayerRole} onChange={(e) => setNewPlayerRole(e.target.value as Player['role'])}>
                          <option value="Batsman">Batsman</option>
                          <option value="Bowler">Bowler</option>
                          <option value="All-Rounder">All-Rounder</option>
                          <option value="WicketKeeper">Keeper</option>
                      </select>
                  </div>
                  <button onClick={handleAddPlayer} className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold h-fit self-end flex items-center gap-2 mb-0.5"><Plus size={18}/> Add</button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {selectedTeamForSquad.players?.map(p => (
                      <div key={p.id} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl hover:border-emerald-200 group">
                          <div className="flex items-center gap-3 overflow-hidden">
                              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400 shrink-0 overflow-hidden border">
                                  {p.image ? <img src={p.image} className="w-full h-full object-cover" alt={p.name}/> : p.name[0]}
                              </div>
                              <div className="truncate">
                                  <p className="font-bold text-slate-800 truncate">{p.name}</p>
                                  <p className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full inline-block uppercase font-bold">{p.role}</p>
                              </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setEditingPlayer(p)} className="p-1.5 text-slate-400 hover:text-emerald-600"><Edit2 size={16}/></button>
                              <button onClick={() => handleDeletePlayer(p.id)} className="p-1.5 text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                          </div>
                      </div>
                  ))}
                  {(!selectedTeamForSquad.players || selectedTeamForSquad.players.length === 0) && (
                      <div className="col-span-full py-10 text-center text-slate-400 italic">No players added yet.</div>
                  )}
              </div>
          </div>
      ) : (
        <>
            {view === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up">
                    <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Users size={24}/></div>
                        <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Teams</p><p className="text-3xl font-black text-slate-900">{teams.length}</p></div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Calendar size={24}/></div>
                        <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Matches</p><p className="text-3xl font-black text-slate-900">{matches.length}</p></div>
                    </div>
                </div>
            )}
            {view === 'teams' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in-up">
                    <div className="bg-white p-6 rounded-2xl border shadow-sm h-fit">
                        <h3 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 mb-4">Register New Team</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 block">Team Name</label>
                                <input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="Full Team Name" className="w-full border rounded-xl px-4 py-3 mt-1" />
                            </div>
                            <div className="flex gap-2 items-end">
                                <div className="flex-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 block">Group / Pool Name</label>
                                    <input value={newTeamGroup} onChange={(e) => setNewTeamGroup(e.target.value)} placeholder="e.g. Group A" className="w-full border rounded-xl px-4 py-3 mt-1" />
                                </div>
                                <button onClick={handleAddTeam} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg h-[50px]">Add</button>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Manage Teams ({teams.length})</h3>
                        </div>
                        <div className="space-y-6">
                            {groupedTeams.map(([groupName, groupTeams]) => (
                                <div key={groupName} className="space-y-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Layers size={14} className="text-emerald-600" />
                                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">{groupName}</h4>
                                        <div className="flex-1 border-b border-slate-100"></div>
                                    </div>
                                    {groupTeams.map(t => (
                                        <div key={t.id} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-xl hover:border-emerald-200 group">
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-slate-800">{t.name}</span>
                                            </div>
                                            <div className="flex gap-1">
                                                <button onClick={() => setSelectedTeamForSquad(t)} className="text-[10px] font-black border bg-white px-3 py-1.5 rounded-lg text-emerald-600 hover:bg-emerald-600 hover:text-white uppercase transition-all">Squad</button>
                                                <button onClick={() => setEditingTeam(t)} className="p-1.5 text-slate-300 hover:text-blue-500 transition-colors"><Edit2 size={16}/></button>
                                                <button onClick={() => handleDeleteTeam(t.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            {view === 'matches' && (
                <div className="animate-fade-in-up">
                     <div className="flex justify-end mb-6"><button onClick={() => setShowScheduler(true)} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2"><Plus size={18}/> Schedule Match</button></div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sortedMatches.map(m => (
                            <MatchCard 
                                key={m.id} 
                                match={m} 
                                teamA={teams.find(t => t.id === m.teamAId)} 
                                teamB={teams.find(t => t.id === m.teamBId)} 
                                isAdmin={true} 
                                onClick={() => setActiveMatch(m)} 
                                onDelete={(e, mid) => handleDeleteMatch(mid)}
                                onEdit={(e, match) => { setShowScheduler(true); setSchedData({ ...schedData, teamA: match.teamAId, teamB: match.teamBId, date: match.date, time: match.time, overs: match.totalOvers, type: match.type, groupStage: match.groupStage, stageType: match.stageType || 'group' }); }}
                            />
                        ))}
                     </div>
                </div>
            )}
            {view === 'awards' && (
                <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
                    <div className="bg-white p-8 rounded-3xl border shadow-xl">
                        <div className="flex items-center gap-3 mb-8">
                            <Trophy className="text-yellow-500" size={32} />
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Tournament Awards</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Champion Team</label>
                                <select 
                                    className="w-full border rounded-xl px-4 py-3 bg-slate-50 font-bold"
                                    value={tournament.seriesAwards?.championTeamId || ''}
                                    onChange={(e) => setTournament({...tournament, seriesAwards: {...(tournament.seriesAwards || {}), championTeamId: e.target.value}})}
                                >
                                    <option value="">Select Champion...</option>
                                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Runners Up Team</label>
                                <select 
                                    className="w-full border rounded-xl px-4 py-3 bg-slate-50 font-bold"
                                    value={tournament.seriesAwards?.runnersUpTeamId || ''}
                                    onChange={(e) => setTournament({...tournament, seriesAwards: {...(tournament.seriesAwards || {}), runnersUpTeamId: e.target.value}})}
                                >
                                    <option value="">Select Runners Up...</option>
                                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Man of the Series</label>
                                <select 
                                    className="w-full border rounded-xl px-4 py-3 bg-slate-50 font-bold"
                                    value={tournament.seriesAwards?.playerOfSeries || ''}
                                    onChange={(e) => setTournament({...tournament, seriesAwards: {...(tournament.seriesAwards || {}), playerOfSeries: e.target.value}})}
                                >
                                    <option value="">Select Player...</option>
                                    {allPlayers.map(p => <option key={p.id} value={p.id}>{p.name} ({p.teamName})</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Best Batsman (Top Run Scorer)</label>
                                <select 
                                    className="w-full border rounded-xl px-4 py-3 bg-slate-50 font-bold"
                                    value={tournament.seriesAwards?.bestBatsman || ''}
                                    onChange={(e) => setTournament({...tournament, seriesAwards: {...(tournament.seriesAwards || {}), bestBatsman: e.target.value}})}
                                >
                                    <option value="">Select Player...</option>
                                    {allPlayers.map(p => <option key={p.id} value={p.id}>{p.name} ({p.teamName})</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Best Bowler (Top Wicket Taker)</label>
                                <select 
                                    className="w-full border rounded-xl px-4 py-3 bg-slate-50 font-bold"
                                    value={tournament.seriesAwards?.bestBowler || ''}
                                    onChange={(e) => setTournament({...tournament, seriesAwards: {...(tournament.seriesAwards || {}), bestBowler: e.target.value}})}
                                >
                                    <option value="">Select Player...</option>
                                    {allPlayers.map(p => <option key={p.id} value={p.id}>{p.name} ({p.teamName})</option>)}
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Additional Notes / Emergency Info</label>
                                <textarea 
                                    className="w-full border rounded-xl px-4 py-3 bg-slate-50 font-medium min-h-[100px]"
                                    placeholder="Any special mentions or tournament notes..."
                                    value={tournament.seriesAwards?.emergencyNotes || ''}
                                    onChange={(e) => setTournament({...tournament, seriesAwards: {...(tournament.seriesAwards || {}), emergencyNotes: e.target.value}})}
                                />
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t flex justify-end">
                            <button 
                                onClick={handleSaveAwards}
                                className="bg-emerald-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-100 flex items-center gap-2"
                            >
                                <Save size={18} /> Save All Awards
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
      )}

      {/* Edit Team Modal */}
      {editingTeam && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
              <div className="bg-white rounded-3xl p-8 w-full max-sm shadow-2xl animate-fade-in-up">
                  <h3 className="text-xl font-black mb-6 flex items-center gap-2"><Edit2 size={20} className="text-emerald-600"/> Edit Team</h3>
                  <form onSubmit={handleUpdateTeam} className="space-y-4">
                      <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Team Name</label>
                          <input className="w-full border rounded-xl px-4 py-3 mt-1" value={editingTeam.name} onChange={e => setEditingTeam({...editingTeam, name: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Group / Pool</label>
                          <input className="w-full border rounded-xl px-4 py-3 mt-1" value={editingTeam.group} onChange={e => setEditingTeam({...editingTeam, group: e.target.value})} />
                      </div>
                      <div className="flex gap-2 pt-4">
                          <button type="button" onClick={() => setEditingTeam(null)} className="flex-1 py-3 font-bold text-slate-400">Cancel</button>
                          <button type="submit" className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-100">Update</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Edit Player Modal */}
      {editingPlayer && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
              <div className="bg-white rounded-3xl p-8 w-full max-sm shadow-2xl animate-fade-in-up">
                  <h3 className="text-xl font-black mb-6 flex items-center gap-2"><Edit2 size={20} className="text-emerald-600"/> Edit Player</h3>
                  <form onSubmit={handleUpdatePlayer} className="space-y-4">
                      <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Name</label>
                          <input className="w-full border rounded-xl px-4 py-3 mt-1" value={editingPlayer.name} onChange={e => setEditingPlayer({...editingPlayer, name: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Role</label>
                          <select className="w-full border rounded-xl px-4 py-3 mt-1 bg-white" value={editingPlayer.role} onChange={e => setEditingPlayer({...editingPlayer, role: e.target.value as Player['role']})}>
                              <option value="Batsman">Batsman</option><option value="Bowler">Bowler</option>
                              <option value="All-Rounder">All-Rounder</option><option value="WicketKeeper">WicketKeeper</option>
                          </select>
                      </div>
                      <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Image URL (Optional)</label>
                          <input className="w-full border rounded-xl px-4 py-3 mt-1" value={editingPlayer.image || ''} onChange={e => setEditingPlayer({...editingPlayer, image: e.target.value})} />
                      </div>
                      <div className="flex gap-2 pt-4">
                          <button type="button" onClick={() => setEditingPlayer(null)} className="flex-1 py-3 font-bold text-slate-400">Cancel</button>
                          <button type="submit" className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-100">Save</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {showScheduler && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4">
              <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 animate-fade-in-up">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-2xl font-black text-slate-900 uppercase">Match Settings</h3>
                      <button onClick={() => setShowScheduler(false)} className="p-2 text-slate-400"><X size={24}/></button>
                  </div>
                  <form onSubmit={handleCreateMatch} className="space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Match Stage / Group</label>
                              <input placeholder="e.g. Group A or Final" value={schedData.groupStage} onChange={(e) => setSchedData({...schedData, groupStage: e.target.value})} className="w-full border rounded-xl px-4 py-3" required />
                          </div>
                          <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Stage Type</label>
                              <select value={schedData.stageType} onChange={(e) => setSchedData({...schedData, stageType: e.target.value as StageType})} className="w-full border rounded-xl px-4 py-3 bg-white">
                                  <option value="group">Group Stage (Points Table)</option>
                                  <option value="knockout">Knockout (No Points)</option>
                              </select>
                          </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Team A</label>
                              <select required value={schedData.teamA} onChange={(e) => setSchedData({...schedData, teamA: e.target.value})} className="w-full border rounded-xl px-4 py-3 bg-white"><option value="">Select Team</option>{teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                          </div>
                          <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Team B</label>
                              <select required value={schedData.teamB} onChange={(e) => setSchedData({...schedData, teamB: e.target.value})} className="w-full border rounded-xl px-4 py-3 bg-white"><option value="">Select Team</option>{teams.map(t => <option key={t.id} value={t.id} disabled={t.id === schedData.teamA}>{t.name}</option>)}</select>
                          </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                          <div className="col-span-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Overs</label>
                              <input type="number" value={schedData.overs} onChange={(e) => setSchedData({...schedData, overs: parseInt(e.target.value)})} className="w-full border rounded-xl px-4 py-3" />
                          </div>
                          <div className="col-span-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Format</label>
                              <input value={schedData.type} onChange={(e) => setSchedData({...schedData, type: e.target.value})} className="w-full border rounded-xl px-4 py-3" />
                          </div>
                          <div className="col-span-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Time</label>
                              <input type="time" value={schedData.time} onChange={(e) => setSchedData({...schedData, time: e.target.value})} className="w-full border rounded-xl px-4 py-3"/>
                          </div>
                      </div>
                      
                      <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Match Date</label>
                          <input type="date" value={schedData.date} onChange={(e) => setSchedData({...schedData, date: e.target.value})} className="w-full border rounded-xl px-4 py-3"/>
                      </div>

                      <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 mt-4">Confirm Schedule</button>
                  </form>
              </div>
          </div>
      )}
    </Layout>
  );
};