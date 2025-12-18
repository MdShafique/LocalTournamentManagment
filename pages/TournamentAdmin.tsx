
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMatches, getTeams, getTournament, saveTeam, saveMatch, initializeMatch, deleteTeam, deleteMatch, addPlayerToTeam, deletePlayerFromTeam, saveTournament, updatePlayerInTeam } from '../services/storageService';
import { Match, Team, Tournament, Player } from '../types';
import { Layout } from '../components/Layout';
import { AdminMatchControl } from '../components/AdminMatchControl';
import { MatchCard } from '../components/MatchCard';
import { auth } from '../services/firebase'; // Import auth to check user
import { Plus, Users, Calendar, ArrowLeft, Share2, X, Trash2, Loader2, Lock, Edit2, Check, Image as ImageIcon } from 'lucide-react';

export const TournamentAdmin: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [tournament, setTournament] = useState<Tournament | undefined>();
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [view, setView] = useState<'overview' | 'teams' | 'matches'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  
  // Forms state
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamGroup, setNewTeamGroup] = useState('A');
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);

  // Player Management State
  const [selectedTeamForSquad, setSelectedTeamForSquad] = useState<Team | null>(null);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerRole, setNewPlayerRole] = useState<Player['role']>('Batsman');
  const [newPlayerImage, setNewPlayerImage] = useState('');

  // Editing States
  const [isEditingTournament, setIsEditingTournament] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  // Scheduling State
  const [showScheduler, setShowScheduler] = useState(false);
  const [schedData, setSchedData] = useState({
      teamA: '',
      teamB: '',
      date: new Date().toISOString().split('T')[0],
      time: '10:00',
      overs: 20,
      type: 'T20',
      groupStage: 'Group Stage'
  });

  useEffect(() => {
    refreshData();
  }, [id]);

  const refreshData = async () => {
    if (id) {
      setIsLoading(true);
      
      const t = await getTournament(id);
      
      // SECURITY CHECK: Ensure current logged in user owns this tournament
      const currentUser = auth.currentUser;
      if (!t || !currentUser || t.adminId !== currentUser.uid) {
          setPermissionDenied(true);
          setIsLoading(false);
          return;
      }

      const tm = await getTeams(id);
      const m = await getMatches(id);
      setTournament(t);
      setTeams(tm);
      setMatches(m);
      
      if (selectedTeamForSquad) {
          const updatedTeam = tm.find(team => team.id === selectedTeamForSquad.id);
          setSelectedTeamForSquad(updatedTeam || null);
      }
      setIsLoading(false);
    }
  };

  // --- ACTIONS ---

  const handleUpdateTournament = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!tournament) return;
      await saveTournament(tournament);
      setIsEditingTournament(false);
      await refreshData();
  };

  const handleAddTeam = async () => {
    if (!newTeamName.trim() || !id) return;
    const newTeam: Team = {
      id: Date.now().toString(),
      tournamentId: id,
      name: newTeamName,
      shortName: newTeamName.substring(0, 3).toUpperCase(),
      group: newTeamGroup,
      players: []
    };
    await saveTeam(newTeam);
    setNewTeamName('');
    await refreshData();
  };

  const handleUpdateTeam = async () => {
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

  const handleUpdatePlayer = async () => {
      if (!selectedTeamForSquad || !editingPlayer) return;
      await updatePlayerInTeam(selectedTeamForSquad.id, editingPlayer);
      setEditingPlayer(null);
      await refreshData();
  };

  const handleDeletePlayer = async (playerId: string) => {
      if (!selectedTeamForSquad) return;
      if (window.confirm("Remove player from squad?")) {
        await deletePlayerFromTeam(selectedTeamForSquad.id, playerId);
        await refreshData();
      }
  };

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (schedData.teamA === schedData.teamB) {
        alert("Teams must be different");
        return;
    }

    const m = initializeMatch(
        id, 
        schedData.teamA, 
        schedData.teamB, 
        schedData.date, 
        schedData.time, 
        schedData.type, 
        schedData.overs,
        schedData.groupStage
    );
    await saveMatch(m);
    await refreshData();
    setShowScheduler(false);
    setView('matches');
  };

  const handleUpdateMatch = async (m: Match) => {
    // Optimistic Update
    setActiveMatch(m);
    await saveMatch(m);
    setMatches(prev => prev.map(pm => pm.id === m.id ? m : pm));
  };

  const handleDeleteMatch = async (mid: string) => {
      if(window.confirm('Delete match?')) {
        await deleteMatch(mid);
        setActiveMatch(null);
        await refreshData();
      }
  };

  const handleDeleteTeam = async (tid: string) => {
      if(window.confirm('Delete team? This will NOT delete matches associated with it, but stats will break.')) {
          await deleteTeam(tid);
          await refreshData();
      }
  }

  if (permissionDenied) {
      return (
          <Layout>
              <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                  <Lock size={64} className="text-red-300 mb-4"/>
                  <h1 className="text-2xl font-bold text-slate-800">Access Denied</h1>
                  <p className="text-slate-500 mb-6">You do not have permission to manage this tournament.</p>
                  <button onClick={() => navigate('/admin')} className="bg-slate-900 text-white px-6 py-2 rounded-lg">
                      Back to Dashboard
                  </button>
              </div>
          </Layout>
      );
  }

  if ((!tournament && isLoading) || isLoading) {
      return <Layout><div className="flex justify-center mt-20"><Loader2 className="animate-spin text-emerald-600" size={40}/></div></Layout>;
  }

  if (!tournament) return <div>Not Found</div>;

  return (
    <Layout>
      {/* Top Bar with Tournament Info & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
           <button onClick={() => navigate('/admin')} className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-sm mb-2">
               <ArrowLeft size={16}/> Back to Dashboard
           </button>
           
           <div className="flex items-center gap-3">
               {tournament.logo && (
                   <img src={tournament.logo} alt="Logo" className="w-10 h-10 rounded-full object-cover border border-slate-200" />
               )}
               <h1 className="text-2xl font-bold text-slate-900">{tournament.name}</h1>
               <button onClick={() => setIsEditingTournament(true)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full">
                   <Edit2 size={16}/>
               </button>
           </div>
           <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded mt-1 inline-block">Admin Panel</span>
        </div>
        {tournament && (
            <button 
            onClick={() => {
                const url = `${window.location.origin}/#/view/${tournament.id}`;
                navigator.clipboard.writeText(url);
                alert('Public Viewer URL copied to clipboard: ' + url);
            }}
            className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg hover:bg-emerald-100 transition"
            >
                <Share2 size={18} /> Share Public Link
            </button>
        )}
      </div>

      {/* EDIT TOURNAMENT MODAL */}
      {isEditingTournament && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md animate-fade-in-up">
                  <h3 className="text-xl font-bold mb-4">Edit Tournament</h3>
                  <form onSubmit={handleUpdateTournament} className="space-y-4">
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Tournament Name</label>
                          <input 
                              type="text" 
                              value={tournament.name}
                              onChange={e => setTournament({...tournament, name: e.target.value})}
                              className="w-full border p-2 rounded"
                              required
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Logo URL (Optional)</label>
                          <input 
                              type="text" 
                              value={tournament.logo || ''}
                              onChange={e => setTournament({...tournament, logo: e.target.value})}
                              placeholder="https://..."
                              className="w-full border p-2 rounded"
                          />
                      </div>
                      <div className="flex gap-2 justify-end pt-2">
                          <button type="button" onClick={() => setIsEditingTournament(false)} className="px-4 py-2 text-slate-600">Cancel</button>
                          <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded font-bold">Save Changes</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 border-b border-slate-200">
          {[
              { id: 'overview', label: 'Overview' },
              { id: 'teams', label: 'Teams & Squads' },
              { id: 'matches', label: 'Matches' }
          ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setView(tab.id as any); setActiveMatch(null); setSelectedTeamForSquad(null); }}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${view === tab.id && !activeMatch && !selectedTeamForSquad ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                  {tab.label}
              </button>
          ))}
          {activeMatch && (
              <button className="px-4 py-2 rounded-lg font-medium bg-red-600 text-white flex items-center gap-2 animate-pulse">
                  <div className="w-2 h-2 bg-white rounded-full"></div> Live Console
              </button>
          )}
           {selectedTeamForSquad && (
              <button className="px-4 py-2 rounded-lg font-medium bg-emerald-600 text-white">
                  Managing: {selectedTeamForSquad.shortName}
              </button>
          )}
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
                  <div className="flex items-center gap-3">
                      {selectedTeamForSquad.logo && <img src={selectedTeamForSquad.logo} className="w-10 h-10 rounded-full object-cover"/>}
                      <h3 className="font-bold text-lg">Manage Squad: {selectedTeamForSquad.name}</h3>
                  </div>
                  <button onClick={() => setSelectedTeamForSquad(null)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
              </div>
              
              {/* Add New Player Form */}
              <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 bg-slate-50 rounded-lg">
                  <div className="flex-1 space-y-2">
                      <input 
                          className="w-full border rounded-lg px-4 py-2" 
                          placeholder="Player Name" 
                          value={newPlayerName}
                          onChange={(e) => setNewPlayerName(e.target.value)}
                      />
                      <input 
                          className="w-full border rounded-lg px-4 py-2 text-xs" 
                          placeholder="Image URL (Optional)" 
                          value={newPlayerImage}
                          onChange={(e) => setNewPlayerImage(e.target.value)}
                      />
                  </div>
                  <select 
                      className="border rounded-lg px-4 py-2 bg-white h-10"
                      value={newPlayerRole}
                      onChange={(e) => setNewPlayerRole(e.target.value as Player['role'])}
                  >
                      <option value="Batsman">Batsman</option>
                      <option value="Bowler">Bowler</option>
                      <option value="All-Rounder">All-Rounder</option>
                      <option value="WicketKeeper">WicketKeeper</option>
                  </select>
                  <button onClick={handleAddPlayer} className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold h-10">Add</button>
              </div>

              {/* Player List */}
              <div className="space-y-2">
                  {selectedTeamForSquad.players?.map(p => (
                      <div key={p.id} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
                          {editingPlayer?.id === p.id ? (
                              <div className="flex flex-col sm:flex-row gap-2 w-full items-center">
                                  <input 
                                    className="border p-1 rounded text-sm flex-1" 
                                    value={editingPlayer.name} 
                                    onChange={e => setEditingPlayer({...editingPlayer, name: e.target.value})}
                                  />
                                  <input 
                                    className="border p-1 rounded text-sm flex-1" 
                                    placeholder="Image URL"
                                    value={editingPlayer.image || ''} 
                                    onChange={e => setEditingPlayer({...editingPlayer, image: e.target.value})}
                                  />
                                  <button onClick={handleUpdatePlayer} className="p-1 bg-emerald-100 text-emerald-600 rounded"><Check size={16}/></button>
                                  <button onClick={() => setEditingPlayer(null)} className="p-1 bg-slate-100 text-slate-500 rounded"><X size={16}/></button>
                              </div>
                          ) : (
                              <>
                                <div className="flex items-center gap-3">
                                    {p.image ? (
                                        <img src={p.image} className="w-8 h-8 rounded-full object-cover border" alt={p.name[0]} />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">{p.name[0]}</div>
                                    )}
                                    <div>
                                        <span className="font-bold text-slate-800">{p.name}</span>
                                        <span className="ml-2 text-[10px] text-slate-500 bg-slate-50 border px-2 py-0.5 rounded-full uppercase tracking-wider">{p.role}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setEditingPlayer(p)} className="text-slate-400 hover:text-emerald-500"><Edit2 size={16}/></button>
                                    <button onClick={() => handleDeletePlayer(p.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
                                </div>
                              </>
                          )}
                      </div>
                  ))}
                  {(!selectedTeamForSquad.players || selectedTeamForSquad.players.length === 0) && (
                      <p className="text-slate-400 italic text-center py-4">No players added to this squad yet.</p>
                  )}
              </div>
          </div>
      ) : (
        <>
            {view === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Users size={24}/></div>
                            <div>
                                <p className="text-sm text-slate-500">Total Teams</p>
                                <p className="text-2xl font-bold">{teams.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><Calendar size={24}/></div>
                            <div>
                                <p className="text-sm text-slate-500">Total Matches</p>
                                <p className="text-2xl font-bold">{matches.length}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {view === 'teams' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Add Team Section */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-bold mb-4">Add New Team</h3>
                        <div className="flex flex-col gap-3">
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={newTeamName}
                                    onChange={(e) => setNewTeamName(e.target.value)}
                                    placeholder="Team Name"
                                    className="flex-1 border border-slate-300 rounded-lg px-4 py-2"
                                />
                                <select 
                                    value={newTeamGroup}
                                    onChange={(e) => setNewTeamGroup(e.target.value)}
                                    className="border border-slate-300 rounded-lg px-4 py-2 bg-white"
                                >
                                    <option value="A">Group A</option>
                                    <option value="B">Group B</option>
                                    <option value="C">Group C</option>
                                    <option value="D">Group D</option>
                                </select>
                            </div>
                            <button onClick={handleAddTeam} className="w-full bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 flex justify-center items-center gap-2">
                                <Plus size={20} /> Add Team
                            </button>
                        </div>
                    </div>

                    {/* Team List Section */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-bold mb-4">Team List</h3>
                        <div className="space-y-2">
                            {teams.map(t => (
                                <div key={t.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg group">
                                    {editingTeam?.id === t.id ? (
                                        <div className="flex flex-col gap-2 w-full">
                                            <input 
                                                className="border p-2 rounded text-sm w-full" 
                                                value={editingTeam.name} 
                                                onChange={e => setEditingTeam({...editingTeam, name: e.target.value})}
                                                placeholder="Team Name"
                                            />
                                            <input 
                                                className="border p-2 rounded text-sm w-full" 
                                                value={editingTeam.logo || ''} 
                                                onChange={e => setEditingTeam({...editingTeam, logo: e.target.value})}
                                                placeholder="Logo URL"
                                            />
                                            <div className="flex gap-2">
                                                <button onClick={handleUpdateTeam} className="bg-emerald-600 text-white px-3 py-1 rounded text-xs font-bold">Save</button>
                                                <button onClick={() => setEditingTeam(null)} className="bg-slate-300 text-slate-700 px-3 py-1 rounded text-xs">Cancel</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-2">
                                                <span className="bg-slate-200 text-slate-600 text-xs px-2 py-1 rounded font-bold">{t.group}</span>
                                                {t.logo && <img src={t.logo} alt="L" className="w-6 h-6 rounded-full object-cover"/>}
                                                <span className="font-medium">{t.name}</span>
                                                <span className="text-xs text-slate-400">({t.players?.length || 0})</span>
                                            </div>
                                            <div className="flex gap-2 items-center">
                                                <button onClick={() => setSelectedTeamForSquad(t)} className="text-xs bg-white border px-2 py-1 rounded text-emerald-600 hover:bg-emerald-50">
                                                    Squad
                                                </button>
                                                <button onClick={() => setEditingTeam(t)} className="text-slate-300 hover:text-blue-500">
                                                    <Edit2 size={16}/>
                                                </button>
                                                <button onClick={() => handleDeleteTeam(t.id)} className="text-slate-300 hover:text-red-500">
                                                    <Trash2 size={16}/>
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                            {teams.length === 0 && <p className="text-slate-400 italic text-sm">No teams added yet.</p>}
                        </div>
                    </div>
                </div>
            )}

            {view === 'matches' && (
                <div>
                     <div className="flex justify-end mb-4">
                        <button onClick={() => setShowScheduler(true)} className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 text-sm flex items-center gap-2">
                            <Plus size={16}/> Schedule Match
                        </button>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {matches.map(m => (
                            <MatchCard 
                                key={m.id}
                                match={m}
                                teamA={teams.find(t => t.id === m.teamAId)}
                                teamB={teams.find(t => t.id === m.teamBId)}
                                isAdmin={true}
                                onClick={() => setActiveMatch(m)}
                            />
                        ))}
                     </div>
                </div>
            )}
        </>
      )}

      {showScheduler && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 animate-fade-in-up">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold">Schedule New Match</h3>
                      <button onClick={() => setShowScheduler(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                  </div>
                  <form onSubmit={handleCreateMatch} className="space-y-4">
                      <div className="col-span-2">
                          <label className="block text-sm font-medium text-slate-700 mb-1">Match Stage</label>
                          <input 
                            type="text"
                            required
                            placeholder="e.g. Semi Final 1"
                            value={schedData.groupStage}
                            onChange={(e) => setSchedData({...schedData, groupStage: e.target.value})}
                            className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Team A</label>
                              <select 
                                required
                                value={schedData.teamA} 
                                onChange={(e) => setSchedData({...schedData, teamA: e.target.value})}
                                className="w-full border border-slate-300 rounded-lg p-2"
                              >
                                  <option value="">Select Team</option>
                                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Team B</label>
                              <select 
                                required
                                value={schedData.teamB} 
                                onChange={(e) => setSchedData({...schedData, teamB: e.target.value})}
                                className="w-full border border-slate-300 rounded-lg p-2"
                              >
                                  <option value="">Select Team</option>
                                  {teams.map(t => (
                                      <option key={t.id} value={t.id} disabled={t.id === schedData.teamA}>{t.name}</option>
                                  ))}
                              </select>
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                              <input 
                                type="date"
                                required
                                value={schedData.date}
                                onChange={(e) => setSchedData({...schedData, date: e.target.value})}
                                className="w-full border border-slate-300 rounded-lg p-2"
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
                              <input 
                                type="time"
                                required
                                value={schedData.time}
                                onChange={(e) => setSchedData({...schedData, time: e.target.value})}
                                className="w-full border border-slate-300 rounded-lg p-2"
                              />
                          </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                           <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Overs</label>
                              <input 
                                type="number"
                                required
                                min="1"
                                max="50"
                                value={schedData.overs}
                                onChange={(e) => setSchedData({...schedData, overs: parseInt(e.target.value)})}
                                className="w-full border border-slate-300 rounded-lg p-2"
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Format</label>
                              <input 
                                type="text"
                                required
                                value={schedData.type}
                                onChange={(e) => setSchedData({...schedData, type: e.target.value})}
                                className="w-full border border-slate-300 rounded-lg p-2"
                              />
                          </div>
                      </div>

                      <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800">
                          Schedule Match
                      </button>
                  </form>
              </div>
          </div>
      )}
    </Layout>
  );
};
