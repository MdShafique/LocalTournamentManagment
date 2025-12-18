
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMatches, getTeams, getTournament, saveTeam, saveMatch, initializeMatch, deleteTeam, deleteMatch, addPlayerToTeam, deletePlayerFromTeam, saveTournament, updatePlayerInTeam } from '../services/storageService';
import { Match, Team, Tournament, Player } from '../types';
import { Layout } from '../components/Layout';
import { AdminMatchControl } from '../components/AdminMatchControl';
import { MatchCard } from '../components/MatchCard';
import { auth } from '../services/firebase'; 
import { Plus, Users, Calendar, ArrowLeft, Share2, X, Trash2, Loader2, Lock, Edit2, Check } from 'lucide-react';

export const TournamentAdmin: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [tournament, setTournament] = useState<Tournament | undefined>();
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [view, setView] = useState<'overview' | 'teams' | 'matches'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamGroup, setNewTeamGroup] = useState('A');
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
      time: '10:00', overs: 20, type: 'T20', groupStage: 'Group Stage'
  });

  useEffect(() => { refreshData(); }, [id]);

  const refreshData = async () => {
    if (id) {
      setIsLoading(true);
      const t = await getTournament(id);
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
      if (window.confirm("Remove player?")) {
        await deletePlayerFromTeam(selectedTeamForSquad.id, playerId);
        await refreshData();
      }
  };

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || schedData.teamA === schedData.teamB) return;
    const m = initializeMatch(id, schedData.teamA, schedData.teamB, schedData.date, schedData.time, schedData.type, schedData.overs, schedData.groupStage);
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
      if(window.confirm('Delete match?')) {
        await deleteMatch(mid);
        setActiveMatch(null);
        await refreshData();
      }
  };

  const handleDeleteTeam = async (tid: string) => {
      if(window.confirm('Delete team?')) {
          await deleteTeam(tid);
          await refreshData();
      }
  };

  if (permissionDenied) return <Layout><div className="text-center pt-20"><Lock size={64} className="mx-auto mb-4 text-red-300"/><h1 className="text-2xl font-bold">Access Denied</h1></div></Layout>;
  if (isLoading || !tournament) return <Layout><div className="flex justify-center mt-20"><Loader2 className="animate-spin text-emerald-600" size={40}/></div></Layout>;

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
           <button onClick={() => navigate('/admin')} className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-sm mb-2"><ArrowLeft size={16}/> Back</button>
           <div className="flex items-center gap-3">
               {tournament.logo && <img src={tournament.logo} className="w-10 h-10 rounded-full object-cover border"/>}
               <h1 className="text-2xl font-bold text-slate-900">{tournament.name}</h1>
               <button onClick={() => setIsEditingTournament(true)} className="p-1.5 text-slate-400 hover:text-slate-600"><Edit2 size={16}/></button>
           </div>
        </div>
        <button onClick={() => { const url = `${window.location.origin}/#/view/${tournament.id}`; navigator.clipboard.writeText(url); alert('URL copied!'); }} className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg"><Share2 size={18} /> Share Public Link</button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 border-b border-slate-200">
          {['overview', 'teams', 'matches'].map(tab => (
              <button key={tab} onClick={() => { setView(tab as any); setActiveMatch(null); setSelectedTeamForSquad(null); }} className={`px-4 py-2 rounded-lg font-medium capitalize ${view === tab && !activeMatch && !selectedTeamForSquad ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'}`}>{tab}</button>
          ))}
          {activeMatch && <button className="px-4 py-2 rounded-lg font-medium bg-red-600 text-white flex items-center gap-2 animate-pulse"><div className="w-2 h-2 bg-white rounded-full"></div> Scoring: {teams.find(t=>t.id===activeMatch.teamAId)?.name} vs {teams.find(t=>t.id===activeMatch.teamBId)?.name}</button>}
      </div>

      {activeMatch ? (
          <AdminMatchControl match={activeMatch} teamA={teams.find(t => t.id === activeMatch.teamAId)!} teamB={teams.find(t => t.id === activeMatch.teamBId)!} onUpdate={handleUpdateMatch} onDelete={() => handleDeleteMatch(activeMatch.id)} />
      ) : selectedTeamForSquad ? (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-6 border-b pb-4"><h3 className="font-bold text-lg">Manage Squad: {selectedTeamForSquad.name}</h3><button onClick={() => setSelectedTeamForSquad(null)} className="text-slate-400"><X size={24}/></button></div>
              <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 bg-slate-50 rounded-lg">
                  <input className="flex-1 border rounded-lg px-4 py-2" placeholder="Player Name" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} />
                  <select className="border rounded-lg px-4 py-2 bg-white" value={newPlayerRole} onChange={(e) => setNewPlayerRole(e.target.value as Player['role'])}><option value="Batsman">Batsman</option><option value="Bowler">Bowler</option><option value="All-Rounder">All-Rounder</option><option value="WicketKeeper">WicketKeeper</option></select>
                  <button onClick={handleAddPlayer} className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold">Add</button>
              </div>
              <div className="space-y-2">
                  {selectedTeamForSquad.players?.map(p => (
                      <div key={p.id} className="flex justify-between items-center p-3 bg-white border rounded-lg">
                          <div className="flex items-center gap-3">
                              {p.image ? <img src={p.image} className="w-8 h-8 rounded-full border"/> : <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400">{p.name[0]}</div>}
                              <span className="font-bold">{p.name}</span><span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full uppercase">{p.role}</span>
                          </div>
                          <button onClick={() => handleDeletePlayer(p.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                      </div>
                  ))}
              </div>
          </div>
      ) : (
        <>
            {view === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-xl border"><p className="text-sm text-slate-500">Teams</p><p className="text-2xl font-bold">{teams.length}</p></div>
                    <div className="bg-white p-6 rounded-xl border"><p className="text-sm text-slate-500">Matches</p><p className="text-2xl font-bold">{matches.length}</p></div>
                </div>
            )}
            {view === 'teams' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white p-6 rounded-xl border">
                        <h3 className="font-bold mb-4">Add Team</h3>
                        <div className="flex gap-2"><input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="Full Team Name" className="flex-1 border rounded-lg px-4 py-2"/><select value={newTeamGroup} onChange={(e) => setNewTeamGroup(e.target.value)} className="border rounded-lg px-4 py-2"><option value="A">Grp A</option><option value="B">Grp B</option></select></div>
                        <button onClick={handleAddTeam} className="w-full bg-emerald-600 text-white px-4 py-2 rounded-lg mt-3">Add Team</button>
                    </div>
                    <div className="bg-white p-6 rounded-xl border">
                        <h3 className="font-bold mb-4">Team List</h3>
                        <div className="space-y-2">
                            {teams.map(t => (
                                <div key={t.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                    <div className="flex items-center gap-2"><span className="text-xs bg-slate-200 px-2 py-1 rounded">{t.group}</span><span className="font-medium">{t.name}</span></div>
                                    <div className="flex gap-2"><button onClick={() => setSelectedTeamForSquad(t)} className="text-xs border px-2 py-1 rounded text-emerald-600">Squad</button><button onClick={() => handleDeleteTeam(t.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            {view === 'matches' && (
                <div>
                     <div className="flex justify-end mb-4"><button onClick={() => setShowScheduler(true)} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm">+ Schedule Match</button></div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{matches.map(m => <MatchCard key={m.id} match={m} teamA={teams.find(t => t.id === m.teamAId)} teamB={teams.find(t => t.id === m.teamBId)} isAdmin={true} onClick={() => setActiveMatch(m)} />)}</div>
                </div>
            )}
        </>
      )}

      {showScheduler && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
                  <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold">New Match</h3><button onClick={() => setShowScheduler(false)} className="text-slate-400"><X size={24}/></button></div>
                  <form onSubmit={handleCreateMatch} className="space-y-4">
                      <input placeholder="Match Stage (e.g. Semi Final)" value={schedData.groupStage} onChange={(e) => setSchedData({...schedData, groupStage: e.target.value})} className="w-full border rounded-lg p-2" required />
                      <div className="grid grid-cols-2 gap-4">
                          <select required value={schedData.teamA} onChange={(e) => setSchedData({...schedData, teamA: e.target.value})} className="w-full border rounded-lg p-2"><option value="">Team A</option>{teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                          <select required value={schedData.teamB} onChange={(e) => setSchedData({...schedData, teamB: e.target.value})} className="w-full border rounded-lg p-2"><option value="">Team B</option>{teams.map(t => <option key={t.id} value={t.id} disabled={t.id === schedData.teamA}>{t.name}</option>)}</select>
                      </div>
                      <div className="grid grid-cols-2 gap-4"><input type="date" value={schedData.date} onChange={(e) => setSchedData({...schedData, date: e.target.value})} className="w-full border rounded-lg p-2"/><input type="time" value={schedData.time} onChange={(e) => setSchedData({...schedData, time: e.target.value})} className="w-full border rounded-lg p-2"/></div>
                      <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold">Schedule Match</button>
                  </form>
              </div>
          </div>
      )}
    </Layout>
  );
};
