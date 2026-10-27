import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  getMatches, 
  getTeams, 
  getTournament, 
  saveTeam, 
  saveMatch, 
  initializeMatch, 
  deleteTeam, 
  deleteMatch, 
  addPlayerToTeam, 
  deletePlayerFromTeam, 
  saveTournament, 
  updatePlayerInTeam,
  getRegistrations,
  updateRegistrationStatus,
  deleteRegistration,
  assignPlayerToTeam
} from '../services/storageService';
import { Match, Team, Tournament, Player, StageType, MatchStatus, PlayerRegistration, CommitteeGroup, CommitteeMember, SponsoredAdItem, SponsoredAdsConfig } from '../types';
import { Layout } from '../components/Layout';
import { AdminMatchControl } from '../components/AdminMatchControl';
import { MatchCard } from '../components/MatchCard';
import { auth, onAuthStateChanged } from '../services/firebase'; 
import { 
  Plus, Users, Calendar, ArrowLeft, Share2, X, Trash2, Loader2, Lock, Edit2, 
  Check, UserPlus, Save, Layers, Clock, Medal, Trophy, Image as ImageIcon, 
  MapPin, DollarSign, CheckCircle2, XCircle, Phone, Heart, UserCheck, Eye, 
  CreditCard, Banknote, ShieldAlert, Settings, Smartphone, FileText, HelpCircle, Copy,
  Printer, Download, Upload, Building2, Award, Megaphone, Sparkles
} from 'lucide-react';
import { uploadImageToCloudinary } from '../services/cloudinaryService';

export const TournamentAdmin: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [tournament, setTournament] = useState<Tournament | undefined>();
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [registrations, setRegistrations] = useState<PlayerRegistration[]>([]);
  const [view, setView] = useState<'overview' | 'teams' | 'matches' | 'awards' | 'registrations'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  
  // Registration Filter & Assign State
  const [regFilter, setRegFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedRegForDetail, setSelectedRegForDetail] = useState<PlayerRegistration | null>(null);
  const [teamAssignSelection, setTeamAssignSelection] = useState<Record<string, string>>({});

  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamLogo, setNewTeamLogo] = useState('');
  const [newTeamGroup, setNewTeamGroup] = useState('Group A');
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);

  const [selectedTeamForSquad, setSelectedTeamForSquad] = useState<Team | null>(null);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerRole, setNewPlayerRole] = useState<Player['role']>('Batsman');
  const [newPlayerImage, setNewPlayerImage] = useState('');

  // Image Upload States
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingTeamLogo, setUploadingTeamLogo] = useState(false);
  const [uploadingPlayerImage, setUploadingPlayerImage] = useState(false);
  const [uploadingEditTeamLogo, setUploadingEditTeamLogo] = useState(false);
  const [uploadingEditPlayerImage, setUploadingEditPlayerImage] = useState(false);

  const [isEditingTournament, setIsEditingTournament] = useState(false);
  const [editSettingsTab, setEditSettingsTab] = useState<'info' | 'rules' | 'payment' | 'committee' | 'ads'>('info');
  const [newGroupName, setNewGroupName] = useState('');
  const [addingMemberToGroupId, setAddingMemberToGroupId] = useState<string | null>(null);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberTitle, setNewMemberTitle] = useState('');
  const [newMemberDescription, setNewMemberDescription] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberPhoto, setNewMemberPhoto] = useState('');
  const [uploadingMemberPhoto, setUploadingMemberPhoto] = useState(false);
  const [editingMemberInfo, setEditingMemberInfo] = useState<{
    groupId: string;
    memberId: string;
    name: string;
    title: string;
    description: string;
    phone: string;
    imageUrl: string;
  } | null>(null);
  const [uploadingEditMemberPhoto, setUploadingEditMemberPhoto] = useState(false);

  // Sponsored Ads states
  const [newAdBadgeText, setNewAdBadgeText] = useState('SPONSOR');
  const [newAdText, setNewAdText] = useState('');
  const [newAdSponsorName, setNewAdSponsorName] = useState('');
  const [newAdLogo, setNewAdLogo] = useState('');
  const [newAdLink, setNewAdLink] = useState('');
  const [uploadingAdLogo, setUploadingAdLogo] = useState(false);
  const [editingAdItem, setEditingAdItem] = useState<SponsoredAdItem | null>(null);
  const [uploadingEditAdLogo, setUploadingEditAdLogo] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  const [showScheduler, setShowScheduler] = useState(false);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [schedData, setSchedData] = useState({
      teamA: '', teamB: '',
      date: new Date().toISOString().split('T')[0],
      time: '10:00', overs: 20, type: 'T20', groupStage: 'Group Stage',
      stageType: 'group' as StageType,
      squadSize: 11,
      venue: 'Main Ground'
  });

  const refreshData = useCallback(async () => {
    if (!id) return;
    try {
        const t = await getTournament(id);
        const currentUser = auth.currentUser;
        if (!t) { setIsLoading(false); return; }
        if (!currentUser || t.adminId !== currentUser.uid) { setPermissionDenied(true); setIsLoading(false); return; }
        const tm = await getTeams(id);
        const m = await getMatches(id);
        const regs = await getRegistrations(id);
        setTournament(t);
        setTeams(tm);
        setMatches(m);
        setRegistrations(regs);
        setSelectedTeamForSquad(prev => prev ? tm.find(team => team.id === prev.id) || null : null);
    } catch (err) { console.error("Refresh Error:", err); } finally { setIsLoading(false); }
  }, [id]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: any) => {
      if (user) refreshData();
      else { setIsLoading(false); setPermissionDenied(true); }
    });
    return () => unsubscribe();
  }, [refreshData]);

  const allPlayers = useMemo(() => {
    const list: (Player & { teamName: string })[] = [];
    teams.forEach(t => {
      if (t.players) t.players.forEach(p => list.push({ ...p, teamName: t.name }));
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
          return dtB - dtA;
      });
      return [...live, ...scheduled, ...results];
  }, [matches]);

  const filteredRegistrations = useMemo(() => {
    if (regFilter === 'all') return registrations;
    return registrations.filter(r => r.status === regFilter);
  }, [registrations, regFilter]);

  const pendingRegCount = useMemo(() => {
    return registrations.filter(r => r.status === 'pending').length;
  }, [registrations]);

  const approvedRegCount = useMemo(() => {
    return registrations.filter(r => r.status === 'approved').length;
  }, [registrations]);

  const totalCollectedFee = useMemo(() => {
    return registrations
      .filter(r => r.status === 'approved')
      .reduce((sum, r) => sum + (r.registrationFee || 0), 0);
  }, [registrations]);

  const handleUpdateTournament = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!tournament) return;
      setIsLoading(true);

      const sanitizedSponsoredAds = tournament.sponsoredAds ? {
        ...tournament.sponsoredAds,
        speedSeconds: Number(tournament.sponsoredAds.speedSeconds) > 0 ? Number(tournament.sponsoredAds.speedSeconds) : 15,
        repeatCount: Number(tournament.sponsoredAds.repeatCount) >= 0 ? Number(tournament.sponsoredAds.repeatCount) : 0,
      } : undefined;

      const updatedTournament: Tournament = {
        ...tournament,
        registrationFee: tournament.registrationFee !== undefined && !isNaN(Number(tournament.registrationFee)) ? Number(tournament.registrationFee) : 0,
        sponsoredAds: sanitizedSponsoredAds
      };

      setTournament(updatedTournament);
      await saveTournament(updatedTournament);
      setIsEditingTournament(false);
      setIsLoading(false);
      await refreshData();
  };

  const handleToggleRegistration = async () => {
    if (!tournament) return;
    const updated: Tournament = {
      ...tournament,
      isRegistrationOpen: tournament.isRegistrationOpen === false ? true : false
    };
    setTournament(updated);
    await saveTournament(updated);
  };

  const handleToggleCommittee = async () => {
    if (!tournament) return;
    const updated: Tournament = {
      ...tournament,
      isCommitteeVisible: !tournament.isCommitteeVisible
    };
    setTournament(updated);
    await saveTournament(updated);
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
      logo: newTeamLogo,
      group: newTeamGroup || 'Group A',
      players: []
    };
    await saveTeam(newTeam);
    setNewTeamName(''); setNewTeamLogo('');
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
      setNewPlayerName(''); setNewPlayerImage('');
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

  const handleSaveMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || schedData.teamA === schedData.teamB) return;

    const calculatedMaxWickets = schedData.squadSize > 1 ? schedData.squadSize - 1 : 1;

    if (editingMatchId) {
        const existingMatch = matches.find(m => m.id === editingMatchId);
        if (existingMatch) {
            const updatedMatch: Match = {
                ...existingMatch,
                teamAId: schedData.teamA,
                teamBId: schedData.teamB,
                date: schedData.date,
                time: schedData.time,
                venue: schedData.venue,
                type: schedData.type,
                totalOvers: schedData.overs,
                groupStage: schedData.groupStage,
                stageType: schedData.stageType,
                maxWickets: calculatedMaxWickets
            };
            await saveMatch(updatedMatch);
        }
    } else {
        const m = initializeMatch(
          id, 
          schedData.teamA, 
          schedData.teamB, 
          schedData.date, 
          schedData.time, 
          schedData.venue,
          schedData.type, 
          schedData.overs, 
          schedData.groupStage,
          schedData.stageType,
          calculatedMaxWickets
        );
        await saveMatch(m);
    }
    
    await refreshData();
    setShowScheduler(false);
    setEditingMatchId(null);
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
        if (activeMatch?.id === mid) setActiveMatch(null);
        await refreshData();
      }
  };

  const handleDeleteTeam = async (tid: string) => {
      if(window.confirm('Delete team?')) {
          await deleteTeam(tid);
          await refreshData();
      }
  };

  // Registration Actions
  const handleApproveRegistration = async (reg: PlayerRegistration) => {
    try {
      await updateRegistrationStatus(reg.id, 'approved');
      await refreshData();
    } catch (err) {
      console.error(err);
      alert('Failed to approve registration.');
    }
  };

  const handleRejectRegistration = async (reg: PlayerRegistration) => {
    if (window.confirm(`Reject registration for ${reg.name}?`)) {
      try {
        await updateRegistrationStatus(reg.id, 'rejected');
        await refreshData();
      } catch (err) {
        console.error(err);
        alert('Failed to reject registration.');
      }
    }
  };

  const handleAssignPlayer = async (reg: PlayerRegistration, teamId: string) => {
    if (!id || !teamId) return;
    const team = teams.find(t => t.id === teamId);
    if (!team) return;

    try {
      await assignPlayerToTeam(id, reg, team.id, team.name);
      alert(`Success! ${reg.name} has been added to ${team.name}'s squad.`);
      await refreshData();
    } catch (err) {
      console.error(err);
      alert('Failed to assign player to team.');
    }
  };

  const handleDeleteRegistration = async (regId: string) => {
    if (window.confirm('Delete this registration record permanently?')) {
      try {
        await deleteRegistration(regId);
        await refreshData();
      } catch (err) {
        console.error(err);
        alert('Failed to delete registration.');
      }
    }
  };

  const handlePrintRegistration = (reg: PlayerRegistration) => {
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      alert('Please allow popups to print/download the registration form.');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="bn">
      <head>
        <meta charset="UTF-8">
        <title>Player Registration - ${reg.name}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #1e293b;
            margin: 0;
            padding: 20px;
            background: #fff;
          }
          .card {
            border: 2px solid #0f766e;
            border-radius: 16px;
            padding: 24px;
            max-width: 720px;
            margin: 0 auto;
            position: relative;
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          .title-area h1 {
            font-size: 22px;
            margin: 0;
            color: #0f766e;
            font-weight: 800;
          }
          .title-area p {
            margin: 4px 0 0;
            font-size: 13px;
            color: #64748b;
          }
          .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
          }
          .badge-approved { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
          .badge-pending { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
          .badge-rejected { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
          .main-content {
            display: flex;
            gap: 24px;
            margin-bottom: 24px;
          }
          .photo-box {
            width: 140px;
            height: 160px;
            border: 2px dashed #94a3b8;
            border-radius: 12px;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f8fafc;
            flex-shrink: 0;
          }
          .photo-box img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .info-table {
            width: 100%;
            border-collapse: collapse;
          }
          .info-table th, .info-table td {
            padding: 8px 12px;
            text-align: left;
            font-size: 13px;
            border-bottom: 1px solid #f1f5f9;
          }
          .info-table th {
            color: #64748b;
            font-weight: 600;
            width: 35%;
          }
          .info-table td {
            color: #0f172a;
            font-weight: 700;
          }
          .section-title {
            font-size: 14px;
            font-weight: 800;
            color: #0f766e;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin: 20px 0 8px;
            border-left: 4px solid #0f766e;
            padding-left: 8px;
          }
          .payment-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 16px;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            font-size: 13px;
          }
          .payment-item span {
            display: block;
            color: #64748b;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
          }
          .payment-item strong {
            color: #0f172a;
            font-size: 14px;
          }
          .footer-signs {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
            padding-top: 24px;
          }
          .sign-line {
            width: 180px;
            border-top: 1px dashed #64748b;
            text-align: center;
            font-size: 12px;
            color: #64748b;
            padding-top: 6px;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <div class="title-area">
              <h1>${tournament?.name || 'Tournament Player Registration'}</h1>
              <p>Player Official Registration Form & Verification Receipt</p>
            </div>
            <div>
              <span class="badge ${reg.status === 'approved' ? 'badge-approved' : reg.status === 'pending' ? 'badge-pending' : 'badge-rejected'}">
                ${reg.status}
              </span>
            </div>
          </div>

          <div class="main-content">
            <div class="photo-box">
              ${reg.imageUrl ? `<img src="${reg.imageUrl}" alt="${reg.name}" />` : '<span style="color:#94a3b8; font-size:12px;">No Photo</span>'}
            </div>
            <table class="info-table">
              <tr><th>Player Name</th><td>${reg.name}</td></tr>
              <tr><th>Player Role</th><td>${reg.role}</td></tr>
              <tr><th>Father's Name</th><td>${reg.fatherName || '-'}</td></tr>
              <tr><th>Mother's Name</th><td>${reg.motherName || '-'}</td></tr>
              <tr><th>WhatsApp / Mobile</th><td>${reg.whatsappNumber}</td></tr>
              <tr><th>Blood Group</th><td>${reg.bloodGroup || '-'}</td></tr>
              <tr><th>Jersey No & Size</th><td>${reg.jerseyNumber ? '#' + reg.jerseyNumber : '-'} (${reg.jerseySize || '-'})</td></tr>
              <tr><th>Assigned Team</th><td>${reg.assignedTeamName || 'Not Assigned Yet'}</td></tr>
              <tr><th>Address</th><td>${reg.address || '-'}</td></tr>
            </table>
          </div>

          <div class="section-title">Payment & Verification Information</div>
          <div class="payment-box">
            <div class="payment-item">
              <span>Registration Fee</span>
              <strong>৳${reg.registrationFee}</strong>
            </div>
            <div class="payment-item">
              <span>Payment Gateway</span>
              <strong style="text-transform: uppercase;">${reg.paymentMethod}</strong>
            </div>
            <div class="payment-item">
              <span>Sender Number</span>
              <strong>${reg.senderNumber || '-'}</strong>
            </div>
            <div class="payment-item">
              <span>Transaction ID (TrxID)</span>
              <strong>${reg.transactionId || '-'}</strong>
            </div>
            <div class="payment-item">
              <span>Registration Date</span>
              <strong>${new Date(reg.createdAt).toLocaleDateString()}</strong>
            </div>
            <div class="payment-item">
              <span>Registration ID</span>
              <strong style="font-family: monospace;">${reg.id}</strong>
            </div>
          </div>

          <div class="footer-signs">
            <div class="sign-line">Player Signature</div>
            <div class="sign-line">Admin / Authority Signature</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
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
               {tournament.logo && <img src={tournament.logo} className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500 shadow-sm" alt="logo"/>}
               <div>
                 <div className="flex items-center gap-2">
                   <h1 className="text-2xl font-bold text-slate-900">{tournament.name}</h1>
                   <button 
                     onClick={() => { setIsEditingTournament(true); setEditSettingsTab('info'); }} 
                     className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
                     title="Edit Tournament Settings"
                   ><Settings size={16}/></button>
                 </div>
                 <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 flex-wrap">
                   <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-200">
                     Fee: ৳{tournament.registrationFee ?? 0}
                   </span>
                   <button
                     onClick={handleToggleRegistration}
                     className={`font-bold px-2 py-0.5 rounded-full border text-[10px] transition-all ${
                       tournament.isRegistrationOpen !== false 
                         ? 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200' 
                         : 'bg-rose-100 text-rose-700 border-rose-300 hover:bg-rose-200'
                     }`}
                     title="Click to toggle registration open/closed"
                   >
                     {tournament.isRegistrationOpen !== false ? '● Reg: OPEN' : '○ Reg: CLOSED'}
                   </button>
                    <button
                      onClick={handleToggleCommittee}
                      className={`font-bold px-2 py-0.5 rounded-full border text-[10px] transition-all ${
                        tournament.isCommitteeVisible 
                          ? 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200' 
                          : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                      }`}
                      title="Click to toggle Committee visibility"
                    >
                      {tournament.isCommitteeVisible ? '🏛️ Committee: ON' : '🏛️ Committee: OFF'}
                    </button>
                   {tournament.venue && <span><MapPin size={12} className="inline mr-1 text-slate-400"/>{tournament.venue}</span>}
                 </div>
               </div>
           </div>
        </div>
        <button onClick={() => { const url = `${window.location.origin}/#/view/${tournament.id}`; navigator.clipboard.writeText(url); alert('URL copied!'); }} className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg font-bold border border-emerald-100"><Share2 size={18} /> Share Link</button>
      </div>

      {/* ============ TOURNAMENT SETTINGS MODAL ============ */}
      {isEditingTournament && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-[90] p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl border border-slate-100 my-8">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 rounded-t-3xl flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white">Tournament Settings</h2>
                <p className="text-xs text-slate-300">{tournament.name}</p>
              </div>
              <button onClick={() => { setIsEditingTournament(false); refreshData(); }} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white">
                <X size={20} />
              </button>
            </div>

            {/* Settings Tabs */}
            <div className="flex gap-1 p-2 bg-slate-100 m-4 mb-0 rounded-xl text-xs font-bold">
              {[
                { id: 'info', label: '📋 Basic Info', },
                { id: 'rules', label: '📜 Rules & ToS', },
                { id: 'payment', label: '💳 Payment Gateways', },
                { id: 'committee', label: '🏛️ Committee', },
                { id: 'ads', label: '📢 Sponsored Ads', },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setEditSettingsTab(t.id as any)}
                  className={`flex-1 py-2 px-3 rounded-lg transition-all ${
                    editSettingsTab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleUpdateTournament} className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              
              {/* ---- TAB: BASIC INFO ---- */}
              {editSettingsTab === 'info' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Tournament Name</label>
                      <input 
                        autoFocus
                        className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500" 
                        value={tournament.name} 
                        onChange={(e) => setTournament(prev => prev ? {...prev, name: e.target.value} : prev)} 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Venue</label>
                      <input 
                        className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500" 
                        placeholder="e.g. Main Ground" 
                        value={tournament.venue || ''} 
                        onChange={(e) => setTournament(prev => prev ? {...prev, venue: e.target.value} : prev)} 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Tournament Logo</label>
                      <div className="flex items-center gap-2">
                        {tournament.logo && (
                          <img src={tournament.logo} alt="Logo" className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0" />
                        )}
                        <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl cursor-pointer text-xs font-bold text-slate-700 transition">
                          <Upload size={14} className="text-emerald-600" />
                          <span>{uploadingLogo ? 'আপলোড হচ্ছে...' : 'লোগো ফাইল আপলোড'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploadingLogo}
                            onChange={async (e) => {
                              if (e.target.files && e.target.files[0]) {
                                setUploadingLogo(true);
                                try {
                                  const url = await uploadImageToCloudinary(e.target.files[0]);
                                  setTournament(prev => prev ? {...prev, logo: url} : prev);
                                } catch (err) {
                                  alert('ছবি আপলোড ব্যর্থ হয়েছে');
                                } finally {
                                  setUploadingLogo(false);
                                }
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Registration Fee (৳)</label>
                      <input 
                        type="number" min="0"
                        className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-semibold" 
                        value={tournament.registrationFee !== undefined ? tournament.registrationFee : ''} 
                        onChange={(e) => {
                          const val = e.target.value;
                          setTournament(prev => prev ? {
                            ...prev,
                            registrationFee: val === '' ? ('' as any) : (isNaN(parseFloat(val)) ? ('' as any) : parseFloat(val))
                          } : prev);
                        }}
                        onBlur={(e) => {
                          const val = e.target.value;
                          if (val === '' || isNaN(parseFloat(val)) || parseFloat(val) < 0) {
                            setTournament(prev => prev ? { ...prev, registrationFee: 0 } : prev);
                          }
                        }}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Registration Toggle */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-slate-800">Player Registration Status</p>
                      <p className="text-xs text-slate-500">
                        {tournament.isRegistrationOpen !== false 
                          ? '🟢 চালু আছে — ফ্রন্টএন্ডে রেজিস্ট্রেশন বাটন দৃশ্যমান' 
                          : '🔴 বন্ধ আছে — কোথাও রেজিস্ট্রেশন বাটন দেখা যাবে না'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTournament(prev => prev ? {...prev, isRegistrationOpen: prev.isRegistrationOpen === false ? true : false} : prev)}
                      className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                        tournament.isRegistrationOpen !== false ? 'bg-emerald-600' : 'bg-slate-300'
                      }`}
                    >
                      <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition duration-200 ${
                        tournament.isRegistrationOpen !== false ? 'translate-x-7' : 'translate-x-0'
                      }`}/>
                    </button>
                  </div>

                  {/* Registration Countdown Timer Dates */}
                  <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 space-y-3">
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wider text-amber-900">Registration Timer / Deadline (ঐচ্ছিক)</h4>
                      <p className="text-[11px] text-amber-800/80">শুরু এবং শেষ সময় দিলে ফ্রন্টএন্ডে লাইভ কাউন্টডাউন শো করবে।</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">রেজিস্ট্রেশন শুরু</label>
                        <input
                          type="datetime-local"
                          value={tournament.registrationStartDate || ''}
                          onChange={(e) => setTournament(prev => prev ? {...prev, registrationStartDate: e.target.value} : prev)}
                          className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">রেজিস্ট্রেশন শেষ (Deadline)</label>
                        <input
                          type="datetime-local"
                          value={tournament.registrationEndDate || ''}
                          onChange={(e) => setTournament(prev => prev ? {...prev, registrationEndDate: e.target.value} : prev)}
                          className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ---- TAB: RULES & TOS ---- */}
              {editSettingsTab === 'rules' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 uppercase">নিয়মাবলী ও শর্তসমূহ</label>
                    <span className="text-[11px] text-slate-400">প্রতি লাইনে একটি করে নিয়ম লিখুন</span>
                  </div>
                  <textarea
                    rows={9}
                    value={tournament.rules || ''}
                    onChange={(e) => setTournament(prev => prev ? {...prev, rules: e.target.value} : prev)}
                    placeholder="১. টুর্নামেন্টের নিয়মাবলী লিখুন..."
                    className="w-full border border-slate-300 rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none leading-relaxed"
                  />
                  <p className="text-[11px] text-slate-400">
                    খেলোয়াড়রা রেজিস্ট্রেশন বাটনে ক্লিক করলে প্রথম ধাপে এই শর্তগুলো দেখানো হবে এবং সম্মতি ছাড়া এগোনো যাবে না।
                  </p>
                </div>
              )}

              {/* ---- TAB: PAYMENT GATEWAYS ---- */}
              {editSettingsTab === 'payment' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500 bg-blue-50 border border-blue-100 p-3 rounded-xl">
                    💡 যেসব গেটওয়ের নম্বর পূরণ করবেন, ফ্রন্টএন্ডে শুধুমাত্র সেগুলোই প্লেয়ারদের দেখানো হবে।
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* BKASH */}
                    <div className="bg-pink-50/60 border border-pink-200 p-4 rounded-2xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-pink-700 uppercase flex items-center gap-1"><Smartphone size={13}/> bKash</span>
                        <select
                          value={tournament.paymentInfo?.bkashType || 'Personal'}
                          onChange={(e) => setTournament(prev => prev ? {...prev, paymentInfo: {...(prev.paymentInfo||{}), bkashType: e.target.value as any}} : prev)}
                          className="text-xs border border-pink-200 rounded-lg px-2 py-1 bg-white font-bold text-pink-700 outline-none"
                        >
                          <option value="Personal">Personal</option>
                          <option value="Merchant">Merchant</option>
                          <option value="Agent">Agent</option>
                        </select>
                      </div>
                      <input
                        type="tel"
                        value={tournament.paymentInfo?.bkashNumber || ''}
                        onChange={(e) => setTournament(prev => prev ? {...prev, paymentInfo: {...(prev.paymentInfo||{}), bkashNumber: e.target.value}} : prev)}
                        placeholder="017xxxxxxxx"
                        className="w-full border border-pink-200 rounded-xl px-3 py-2 text-sm bg-white font-mono outline-none focus:ring-2 focus:ring-pink-400"
                      />
                    </div>

                    {/* NAGAD */}
                    <div className="bg-orange-50/60 border border-orange-200 p-4 rounded-2xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-orange-700 uppercase flex items-center gap-1"><Smartphone size={13}/> Nagad</span>
                        <select
                          value={tournament.paymentInfo?.nagadType || 'Personal'}
                          onChange={(e) => setTournament(prev => prev ? {...prev, paymentInfo: {...(prev.paymentInfo||{}), nagadType: e.target.value as any}} : prev)}
                          className="text-xs border border-orange-200 rounded-lg px-2 py-1 bg-white font-bold text-orange-700 outline-none"
                        >
                          <option value="Personal">Personal</option>
                          <option value="Merchant">Merchant</option>
                        </select>
                      </div>
                      <input
                        type="tel"
                        value={tournament.paymentInfo?.nagadNumber || ''}
                        onChange={(e) => setTournament(prev => prev ? {...prev, paymentInfo: {...(prev.paymentInfo||{}), nagadNumber: e.target.value}} : prev)}
                        placeholder="018xxxxxxxx"
                        className="w-full border border-orange-200 rounded-xl px-3 py-2 text-sm bg-white font-mono outline-none focus:ring-2 focus:ring-orange-400"
                      />
                    </div>

                    {/* ROCKET */}
                    <div className="bg-purple-50/60 border border-purple-200 p-4 rounded-2xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-purple-700 uppercase flex items-center gap-1"><Smartphone size={13}/> Rocket</span>
                        <select
                          value={tournament.paymentInfo?.rocketType || 'Personal'}
                          onChange={(e) => setTournament(prev => prev ? {...prev, paymentInfo: {...(prev.paymentInfo||{}), rocketType: e.target.value as any}} : prev)}
                          className="text-xs border border-purple-200 rounded-lg px-2 py-1 bg-white font-bold text-purple-700 outline-none"
                        >
                          <option value="Personal">Personal</option>
                          <option value="Merchant">Merchant</option>
                        </select>
                      </div>
                      <input
                        type="tel"
                        value={tournament.paymentInfo?.rocketNumber || ''}
                        onChange={(e) => setTournament(prev => prev ? {...prev, paymentInfo: {...(prev.paymentInfo||{}), rocketNumber: e.target.value}} : prev)}
                        placeholder="019xxxxxxxx (ঐচ্ছিক)"
                        className="w-full border border-purple-200 rounded-xl px-3 py-2 text-sm bg-white font-mono outline-none focus:ring-2 focus:ring-purple-400"
                      />
                    </div>

                    {/* CASH */}
                    <div className="bg-emerald-50/60 border border-emerald-200 p-4 rounded-2xl space-y-2.5">
                      <span className="font-bold text-xs text-emerald-800 uppercase flex items-center gap-1"><Banknote size={13}/> Cash on Hand</span>
                      <input
                        type="text"
                        value={tournament.paymentInfo?.cashCollectorName || ''}
                        onChange={(e) => setTournament(prev => prev ? {...prev, paymentInfo: {...(prev.paymentInfo||{}), cashCollectorName: e.target.value}} : prev)}
                        placeholder="দায়িত্বপ্রাপ্ত ব্যক্তির নাম"
                        className="w-full border border-emerald-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                      <input
                        type="tel"
                        value={tournament.paymentInfo?.cashCollectorPhone || ''}
                        onChange={(e) => setTournament(prev => prev ? {...prev, paymentInfo: {...(prev.paymentInfo||{}), cashCollectorPhone: e.target.value}} : prev)}
                        placeholder="যোগাযোগ মোবাইল নম্বর"
                        className="w-full border border-emerald-200 rounded-xl px-3 py-2 text-sm bg-white font-mono outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                    </div>
                  </div>

                  {/* Extra Instructions */}
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">অতিরিক্ত পেমেন্ট নির্দেশনা (ঐচ্ছিক)</label>
                    <input
                      type="text"
                      value={tournament.paymentInfo?.instructions || ''}
                      onChange={(e) => setTournament(prev => prev ? {...prev, paymentInfo: {...(prev.paymentInfo||{}), instructions: e.target.value}} : prev)}
                      placeholder="e.g. টাকা পাঠানোর সময় রেফারেন্সে প্লেয়ারের নাম লিখুন"
                      className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}

              {/* ---- TAB: COMMITTEE ---- */}
              {editSettingsTab === 'committee' && (
                <div className="space-y-6">
                  {/* Committee Visibility Switch */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-slate-800">Public Committee Page (পাবলিক কমিটি দৃশ্যমানতা)</p>
                      <p className="text-xs text-slate-500">
                        {tournament.isCommitteeVisible 
                          ? '🟢 চালু আছে — ফ্রন্টএন্ডে "About Committee" বাটন দেখা যাবে' 
                          : '🔴 বন্ধ আছে — ফ্রন্টএন্ডে কমিটি বাটন গোপন থাকবে'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTournament(prev => prev ? {...prev, isCommitteeVisible: !prev.isCommitteeVisible} : prev)}
                      className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                        tournament.isCommitteeVisible ? 'bg-blue-600' : 'bg-slate-300'
                      }`}
                    >
                      <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition duration-200 ${
                        tournament.isCommitteeVisible ? 'translate-x-7' : 'translate-x-0'
                      }`}/>
                    </button>
                  </div>

                  {/* Committee Header & Presented By Setup */}
                  <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                        <Award size={15} /> কমিটি পেজ হেডার ও প্রেজেন্টার সেটআপ (Header & Presenter)
                      </h4>
                      <span className="text-[11px] text-amber-800/80">ফ্রন্টএন্ডে বড় হেডিং আকারে শো করবে</span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          টুর্নামেন্টের পূর্ণ নাম / ব্যানার শিরোনাম (Tagline)
                        </label>
                        <input
                          type="text"
                          value={tournament.committee?.tagline ?? ''}
                          onChange={(e) => setTournament(prev => prev ? {
                            ...prev,
                            committee: {
                              ...(prev.committee || { groups: [] }),
                              tagline: e.target.value
                            }
                          } : prev)}
                          placeholder="e.g. Badarkhali Premier League Night Short-Pitch Cricket Tournament"
                          className="w-full border border-amber-200 rounded-xl px-3.5 py-2 text-xs bg-white outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            প্রেজেন্টেশন লেবেল (Label)
                          </label>
                          <input
                            type="text"
                            value={tournament.committee?.presentedByLabel ?? ''}
                            onChange={(e) => setTournament(prev => prev ? {
                              ...prev,
                              committee: {
                                ...(prev.committee || { groups: [] }),
                                presentedByLabel: e.target.value
                              }
                            } : prev)}
                            placeholder="e.g. Presented By / আয়োজনে / পৃষ্ঠপোষকতায়"
                            className="w-full border border-amber-200 rounded-xl px-3.5 py-2 text-xs bg-white outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            প্রেজেন্টার / ব্যক্তির নাম (বড় হেডিংয়ে শো করবে) *
                          </label>
                          <input
                            type="text"
                            value={tournament.committee?.presentedBy ?? ''}
                            onChange={(e) => setTournament(prev => prev ? {
                              ...prev,
                              committee: {
                                ...(prev.committee || { groups: [] }),
                                presentedBy: e.target.value
                              }
                            } : prev)}
                            placeholder="e.g. ANM Hefaz Shikder"
                            className="w-full border border-amber-200 rounded-xl px-3.5 py-2 text-xs bg-white outline-none focus:ring-2 focus:ring-amber-500 font-bold text-slate-800"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Add Committee Section */}
                  <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                        <Building2 size={15}/> নতুন কমিটি তৈরি করুন
                      </h4>
                      <span className="text-[11px] text-blue-700/80">যেমনঃ Organizing Committee, Stadium Committee</span>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="কমিটির নাম (যেমন: Tournament Organizing Committee, Stadium Committee)"
                        className="flex-1 border border-blue-200 rounded-xl px-3.5 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newGroupName.trim()) {
                            alert('দয়া করে কমিটির নাম লিখুন');
                            return;
                          }
                          const newGrp: CommitteeGroup = {
                            id: 'grp_' + Date.now().toString(),
                            name: newGroupName.trim(),
                            members: []
                          };
                          setTournament(prev => prev ? {
                            ...prev,
                            committee: {
                              ...(prev.committee || {}),
                              groups: [...(prev.committee?.groups || []), newGrp]
                            }
                          } : prev);
                          setNewGroupName('');
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-sm transition"
                      >
                        <Plus size={15} /> Add Committee
                      </button>
                    </div>

                    {/* Quick presets */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-bold text-slate-500">কুইক প্রিসেট:</span>
                      {[
                        'Tournament Organizing Committee',
                        'Stadium & Ground Committee',
                        'Advisory Committee (উপদেষ্টা পরিষদ)',
                        'Umpire & Match Officials',
                        'Disciplinary & Security Committee'
                      ].map(preset => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            const newGrp: CommitteeGroup = {
                              id: 'grp_' + Date.now().toString() + Math.random().toString(36).substr(2, 4),
                              name: preset,
                              members: []
                            };
                            setTournament(prev => prev ? {
                              ...prev,
                              committee: {
                                ...(prev.committee || {}),
                                groups: [...(prev.committee?.groups || []), newGrp]
                              }
                            } : prev);
                          }}
                          className="px-2 py-0.5 bg-white border border-blue-200 rounded-md text-[10px] text-blue-700 hover:bg-blue-100 transition font-medium"
                        >
                          + {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* List of Committees */}
                  <div className="space-y-4">
                    {(!tournament.committee?.groups || tournament.committee.groups.length === 0) ? (
                      <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 text-slate-400 text-xs">
                        কোনো কমিটি যুক্ত করা হয়নি। উপরের ফর্ম থেকে কমিটি তৈরি করুন।
                      </div>
                    ) : (
                      tournament.committee.groups.map(group => (
                        <div key={group.id} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                          {/* Group Header */}
                          <div className="bg-slate-100/80 px-4 py-3 flex items-center justify-between border-b border-slate-200">
                            <div className="flex items-center gap-2">
                              <Building2 size={16} className="text-blue-600" />
                              <span className="font-bold text-sm text-slate-800">{group.name}</span>
                              <span className="text-[10px] font-bold bg-white text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                                {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (addingMemberToGroupId === group.id) {
                                    setAddingMemberToGroupId(null);
                                  } else {
                                    setAddingMemberToGroupId(group.id);
                                    setNewMemberName('');
                                    setNewMemberTitle('');
                                    setNewMemberDescription('');
                                    setNewMemberPhone('');
                                    setNewMemberPhoto('');
                                  }
                                }}
                                className="px-3 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                              >
                                <Plus size={13} /> {addingMemberToGroupId === group.id ? 'Close' : 'Add Member'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`"${group.name}" কমিটিটি মুছে ফেলতে চান?`)) {
                                    setTournament(prev => prev ? {
                                      ...prev,
                                      committee: {
                                        ...(prev.committee || { groups: [] }),
                                        groups: (prev.committee?.groups || []).filter(g => g.id !== group.id)
                                      }
                                    } : prev);
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-red-500 rounded-md transition"
                                title="Delete Committee"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>

                          {/* Member Add Form (when open for this group) */}
                          {addingMemberToGroupId === group.id && (
                            <div className="p-4 bg-emerald-50/40 border-b border-emerald-200 space-y-3">
                              <p className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                                <UserPlus size={14} /> এই গ্রুপে নতুন সদস্য যুক্ত করুন
                              </p>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                <div>
                                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                                    পদবী / Title *
                                  </label>
                                  <input
                                    type="text"
                                    value={newMemberTitle}
                                    onChange={(e) => setNewMemberTitle(e.target.value)}
                                    placeholder="e.g. President / সভাপতি, সাধারণ সম্পাদক"
                                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                                  />
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {['President', 'Secretary', 'Member', 'Umpire', 'Coordinator'].map(tag => (
                                      <button
                                        key={tag}
                                        type="button"
                                        onClick={() => setNewMemberTitle(tag)}
                                        className="text-[9px] px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-100"
                                      >
                                        {tag}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div>
                                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                                    সদস্যের নাম (Full Name) *
                                  </label>
                                  <input
                                    type="text"
                                    value={newMemberName}
                                    onChange={(e) => setNewMemberName(e.target.value)}
                                    placeholder="e.g. মোঃ করিম হোসেন"
                                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                                  />
                                </div>

                                <div>
                                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                                    সংক্ষিপ্ত বিবরণ / পরিচয় (ঐচ্ছিক)
                                  </label>
                                  <input
                                    type="text"
                                    value={newMemberDescription}
                                    onChange={(e) => setNewMemberDescription(e.target.value)}
                                    placeholder="e.g. চেয়ারম্যান, ১নং ইউপি / সমাজসেবক"
                                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                                  />
                                </div>

                                <div>
                                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                                    মোবাইল নম্বর (ঐচ্ছিক)
                                  </label>
                                  <input
                                    type="tel"
                                    value={newMemberPhone}
                                    onChange={(e) => setNewMemberPhone(e.target.value)}
                                    placeholder="017xxxxxxxx"
                                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                                  />
                                </div>
                              </div>

                              {/* Member Image Upload */}
                              <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                                    {newMemberPhoto ? (
                                      <img src={newMemberPhoto} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                      <ImageIcon size={20} className="text-slate-400" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-slate-700">সদস্যের ছবি (ঐচ্ছিক)</p>
                                    <p className="text-[10px] text-slate-400">Cloudinary-তে সরাসরি ছবি আপলোড করুন</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  {newMemberPhoto && (
                                    <button
                                      type="button"
                                      onClick={() => setNewMemberPhoto('')}
                                      className="text-xs text-red-500 hover:underline px-2 py-1"
                                    >
                                      Remove
                                    </button>
                                  )}
                                  <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 cursor-pointer flex items-center gap-1.5 transition">
                                    <Upload size={13} className="text-emerald-600" />
                                    <span>{uploadingMemberPhoto ? 'আপলোড হচ্ছে...' : 'ছবি আপলোড'}</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      disabled={uploadingMemberPhoto}
                                      onChange={async (e) => {
                                        if (e.target.files && e.target.files[0]) {
                                          setUploadingMemberPhoto(true);
                                          try {
                                            const url = await uploadImageToCloudinary(e.target.files[0]);
                                            setNewMemberPhoto(url);
                                          } catch (err) {
                                            alert('ছবি আপলোড ব্যর্থ হয়েছে');
                                          } finally {
                                            setUploadingMemberPhoto(false);
                                          }
                                        }
                                      }}
                                    />
                                  </label>
                                </div>
                              </div>

                              <div className="flex justify-end gap-2 pt-2">
                                <button
                                  type="button"
                                  onClick={() => setAddingMemberToGroupId(null)}
                                  className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!newMemberName.trim() || !newMemberTitle.trim()) {
                                      alert('সদস্যের নাম ও পদবী দেওয়া আবশ্যক');
                                      return;
                                    }
                                    const mem: CommitteeMember = {
                                      id: 'mem_' + Date.now().toString(),
                                      name: newMemberName.trim(),
                                      title: newMemberTitle.trim(),
                                      description: newMemberDescription.trim() || undefined,
                                      phone: newMemberPhone.trim() || undefined,
                                      imageUrl: newMemberPhoto.trim() || undefined
                                    };
                                    setTournament(prev => prev ? {
                                      ...prev,
                                      committee: {
                                        groups: (prev.committee?.groups || []).map(g => g.id === group.id ? {
                                          ...g,
                                          members: [...g.members, mem]
                                        } : g)
                                      }
                                    } : prev);
                                    setNewMemberName('');
                                    setNewMemberTitle('');
                                    setNewMemberDescription('');
                                    setNewMemberPhone('');
                                    setNewMemberPhoto('');
                                    setAddingMemberToGroupId(null);
                                  }}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm"
                                >
                                  Save Member
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Members List */}
                          <div className="p-4">
                            {group.members.length === 0 ? (
                              <p className="text-xs text-slate-400 italic text-center py-2">
                                এই গ্রুপে এখনও কোনো সদস্য নেই। "+ Add Member" বাটনে ক্লিক করে সদস্য যোগ করুন।
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {group.members.map(member => (
                                  <div key={member.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3 group relative">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-300 flex items-center justify-center font-bold text-slate-500 text-sm">
                                        {member.imageUrl ? (
                                          <img src={member.imageUrl} alt={member.name} className="w-full h-full object-cover" />
                                        ) : (
                                          member.name[0]
                                        )}
                                      </div>
                                      <div className="min-w-0">
                                        <span className="inline-block text-[9px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md truncate max-w-full">
                                          {member.title}
                                        </span>
                                        <h5 className="font-bold text-xs text-slate-900 truncate">{member.name}</h5>
                                        {member.description && (
                                          <p className="text-[10px] text-slate-500 truncate">{member.description}</p>
                                        )}
                                        {member.phone && (
                                          <p className="text-[10px] text-slate-400 font-mono truncate">{member.phone}</p>
                                        )}
                                      </div>
                                    </div>
                                      <div className="flex items-center gap-1 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingMemberInfo({
                                              groupId: group.id,
                                              memberId: member.id,
                                              name: member.name,
                                              title: member.title,
                                              description: member.description || '',
                                              phone: member.phone || '',
                                              imageUrl: member.imageUrl || ''
                                            });
                                          }}
                                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                                          title="Edit Member (তথ্য সম্পাদনা)"
                                        >
                                          <Edit2 size={14} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setTournament(prev => prev ? {
                                              ...prev,
                                              committee: {
                                                ...(prev.committee || { groups: [] }),
                                                groups: (prev.committee?.groups || []).map(g => g.id === group.id ? {
                                                  ...g,
                                                  members: g.members.filter(m => m.id !== member.id)
                                                } : g)
                                              }
                                            } : prev);
                                          }}
                                          className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition"
                                          title="Remove Member"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* ---- TAB: SPONSORED ADS ---- */}
                {editSettingsTab === 'ads' && (
                  <div className="space-y-6">
                    {/* Enable/Disable Toggle */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-sm text-slate-800">Live Scoreboard Sponsored Ads Ticker</p>
                        <p className="text-xs text-slate-500">
                          {tournament.sponsoredAds?.enabled !== false 
                            ? '🟢 চালু আছে — ফ্রন্টএন্ডে "Match Center (Live)"-এর ওপর রানিং স্পন্সর ব্যানার শো করবে' 
                            : '🔴 বন্ধ আছে — স্পন্সর ব্যানার সম্পূর্ণ বন্ধ থাকবে'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTournament(prev => prev ? {
                          ...prev,
                          sponsoredAds: {
                            ...(prev.sponsoredAds || { items: [] }),
                            enabled: prev.sponsoredAds?.enabled === false ? true : false
                          }
                        } : prev)}
                        className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                          tournament.sponsoredAds?.enabled !== false ? 'bg-amber-500' : 'bg-slate-300'
                        }`}
                      >
                        <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition duration-200 ${
                          tournament.sponsoredAds?.enabled !== false ? 'translate-x-7' : 'translate-x-0'
                        }`}/>
                      </button>
                    </div>

                    {/* General Configuration: Speed & Repeat Count */}
                    <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-2xl space-y-3">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                        <Settings size={14} /> স্ক্রল স্পিড ও রিপিট সেটিংস (Speed & Repeat Count)
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            রানিং স্ক্রল স্পিড (Duration in Seconds) *
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="5"
                              max="60"
                              value={tournament.sponsoredAds?.speedSeconds !== undefined ? tournament.sponsoredAds.speedSeconds : ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setTournament(prev => prev ? {
                                  ...prev,
                                  sponsoredAds: {
                                    ...(prev.sponsoredAds || { items: [] }),
                                    speedSeconds: val === '' ? ('' as any) : (isNaN(parseInt(val)) ? ('' as any) : parseInt(val))
                                  }
                                } : prev);
                              }}
                              onBlur={(e) => {
                                const val = e.target.value;
                                if (!val || isNaN(parseInt(val)) || parseInt(val) <= 0) {
                                  setTournament(prev => prev ? {
                                    ...prev,
                                    sponsoredAds: {
                                      ...(prev.sponsoredAds || { items: [] }),
                                      speedSeconds: 15
                                    }
                                  } : prev);
                                }
                              }}
                              placeholder="15"
                              className="w-full border border-amber-200 rounded-xl px-3 py-2 text-xs bg-white outline-none focus:ring-2 focus:ring-amber-500 font-bold font-mono"
                            />
                            <span className="text-xs text-slate-500 font-bold shrink-0">সেকেন্ডে শেষ হবে</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">
                            ডান থেকে বামে একবার স্ক্রল করতে কত সেকেন্ড নিবে (যেমনঃ 10, 15, 20 সেকেন্ড)।
                          </p>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            কত বার রান হবে (Repeat Count) *
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              max="1000"
                              value={tournament.sponsoredAds?.repeatCount !== undefined ? tournament.sponsoredAds.repeatCount : ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setTournament(prev => prev ? {
                                  ...prev,
                                  sponsoredAds: {
                                    ...(prev.sponsoredAds || { items: [] }),
                                    repeatCount: val === '' ? ('' as any) : (isNaN(parseInt(val)) ? ('' as any) : parseInt(val))
                                  }
                                } : prev);
                              }}
                              onBlur={(e) => {
                                const val = e.target.value;
                                if (val === '' || isNaN(parseInt(val)) || parseInt(val) < 0) {
                                  setTournament(prev => prev ? {
                                    ...prev,
                                    sponsoredAds: {
                                      ...(prev.sponsoredAds || { items: [] }),
                                      repeatCount: 0
                                    }
                                  } : prev);
                                }
                              }}
                              placeholder="0"
                              className="w-full border border-amber-200 rounded-xl px-3 py-2 text-xs bg-white outline-none focus:ring-2 focus:ring-amber-500 font-bold font-mono"
                            />
                            <span className="text-xs text-slate-500 font-bold shrink-0">বার (0 = আনলিমিটেড)</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">
                            0 লিখলে অনবরত চলতে থাকবে, অথবা নির্দিষ্ট সংখ্যা (যেমন: 5, 10 বার) সেট করতে পারেন।
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Add New Sponsored Ad Form */}
                    <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-2xl space-y-3">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                        <Plus size={15}/> নতুন স্পন্সর বা তথ্য ব্যানার যুক্ত করুন (Add New Ad / Info)
                      </h4>

                      <div className="space-y-3">
                        {/* Badge / Button Label Config */}
                        <div className="bg-white p-3 rounded-xl border border-blue-100 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold text-slate-700 block">
                              বাটন / ব্যাজ লেবেল (Button / Badge Label) *
                            </label>
                            <span className="text-[10px] text-slate-400">অ্যাডের শুরুতে এই বাটন শো করবে</span>
                          </div>
                          
                          <input
                            type="text"
                            value={newAdBadgeText}
                            onChange={(e) => setNewAdBadgeText(e.target.value)}
                            placeholder="e.g. SPONSOR, INFO, NOTICE, TOURNAMENT INFO"
                            className="w-full border border-blue-200 rounded-xl px-3.5 py-2 text-xs bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500 font-bold uppercase tracking-wider text-slate-800"
                          />

                          {/* Quick selection chips */}
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {[
                              { label: '🏆 SPONSOR', val: 'SPONSOR' },
                              { label: '📢 NOTICE', val: 'NOTICE' },
                              { label: 'ℹ️ INFO', val: 'INFO' },
                              { label: '🏏 TOURNAMENT INFO', val: 'TOURNAMENT INFO' },
                              { label: '✨ UPDATE', val: 'UPDATE' },
                              { label: '⚠️ জরুরী ঘোষণা', val: 'জরুরী ঘোষণা' },
                            ].map(preset => (
                              <button
                                key={preset.val}
                                type="button"
                                onClick={() => setNewAdBadgeText(preset.val)}
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition ${
                                  newAdBadgeText === preset.val
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            বিজ্ঞাপনের মূল লেখা (Ad Text / Notice) *
                          </label>
                          <input
                            type="text"
                            value={newAdText}
                            onChange={(e) => setNewAdText(e.target.value)}
                            placeholder="e.g. আজকের খেলার গোল্ড স্পন্সর: প্রাইম সিমেন্ট - সেরা মানের নিশ্চয়তা! কল: ০১৭১১xxxxxx"
                            className="w-full border border-blue-200 rounded-xl px-3.5 py-2 text-xs bg-white outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-slate-700 block mb-1">
                              স্পন্সরের নাম / ট্যাগ (ঐচ্ছিক)
                            </label>
                            <input
                              type="text"
                              value={newAdSponsorName}
                              onChange={(e) => setNewAdSponsorName(e.target.value)}
                              placeholder="e.g. Prime Cement Ltd. / গোল্ড স্পন্সর"
                              className="w-full border border-blue-200 rounded-xl px-3.5 py-2 text-xs bg-white outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-700 block mb-1">
                              ওয়েবসাইট বা ফেসবুক লিংক (ঐচ্ছিক)
                            </label>
                            <input
                              type="text"
                              value={newAdLink}
                              onChange={(e) => setNewAdLink(e.target.value)}
                              placeholder="e.g. https://example.com বা facebook.com/page"
                              className="w-full border border-blue-200 rounded-xl px-3.5 py-2 text-xs bg-white outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        {/* Logo Upload */}
                        <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                              {newAdLogo ? (
                                <img src={newAdLogo} alt="Logo" className="w-full h-full object-contain" />
                              ) : (
                                <ImageIcon size={20} className="text-slate-400" />
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-700">স্পন্সরের লোগো (ঐচ্ছিক)</p>
                              <p className="text-[10px] text-slate-400">রানিং টেক্সটের সাথে লোগো শো করবে</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {newAdLogo && (
                              <button
                                type="button"
                                onClick={() => setNewAdLogo('')}
                                className="text-xs text-red-500 hover:underline px-2 py-1"
                              >
                                Remove
                              </button>
                            )}
                            <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 cursor-pointer flex items-center gap-1.5 transition">
                              <Upload size={13} className="text-blue-600" />
                              <span>{uploadingAdLogo ? 'আপলোড হচ্ছে...' : 'লোগো আপলোড'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploadingAdLogo}
                                onChange={async (e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    setUploadingAdLogo(true);
                                    try {
                                      const url = await uploadImageToCloudinary(e.target.files[0]);
                                      setNewAdLogo(url);
                                    } catch (err) {
                                      alert('লোগো আপলোড ব্যর্থ হয়েছে');
                                    } finally {
                                      setUploadingAdLogo(false);
                                    }
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </div>

                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (!newAdText.trim()) {
                                alert('দয়া করে বিজ্ঞাপনের মূল টেক্সট লিখুন');
                                return;
                              }
                              const newAd: SponsoredAdItem = {
                                id: 'ad_' + Date.now().toString(),
                                badgeText: newAdBadgeText.trim() || 'SPONSOR',
                                text: newAdText.trim(),
                                sponsorName: newAdSponsorName.trim() || undefined,
                                logo: newAdLogo.trim() || undefined,
                                link: newAdLink.trim() || undefined
                              };
                              setTournament(prev => prev ? {
                                ...prev,
                                sponsoredAds: {
                                  ...(prev.sponsoredAds || { items: [] }),
                                  items: [...(prev.sponsoredAds?.items || []), newAd]
                                }
                              } : prev);
                              setNewAdText('');
                              setNewAdSponsorName('');
                              setNewAdLogo('');
                              setNewAdLink('');
                              setNewAdBadgeText('SPONSOR');
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition"
                          >
                            <Plus size={15} /> Add to Serial List
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* List of Sponsored Ads (Serial Order) */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                          তালিকায় থাকা বিজ্ঞাপনসমূহ (Serial Order)
                        </h4>
                        <span className="text-[11px] text-slate-400">
                          {tournament.sponsoredAds?.items?.length || 0} টি বিজ্ঞাপন সিরিয়াল অনুযায়ী একটার পর একটা চলবে
                        </span>
                      </div>

                      {(!tournament.sponsoredAds?.items || tournament.sponsoredAds.items.length === 0) ? (
                        <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 text-slate-400 text-xs">
                          এখনো কোনো স্পন্সর বিজ্ঞাপন যুক্ত করা হয়নি।
                        </div>
                      ) : (
                        tournament.sponsoredAds.items.map((ad, idx) => (
                          <div key={ad.id} className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                                #{idx + 1}
                              </span>
                              {/* Badge Tag */}
                              <span className={`inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-md shrink-0 shadow-2xs ${
                                (ad.badgeText || 'SPONSOR').toLowerCase().includes('notice') || (ad.badgeText || '').toLowerCase().includes('ঘোষণা') || (ad.badgeText || '').toLowerCase().includes('alert')
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : (ad.badgeText || 'SPONSOR').toLowerCase().includes('info') || (ad.badgeText || '').toLowerCase().includes('তথ্য')
                                  ? 'bg-sky-100 text-sky-800 border border-sky-300'
                                  : (ad.badgeText || 'SPONSOR').toLowerCase().includes('update') || (ad.badgeText || '').toLowerCase().includes('আপডেট')
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-amber-100 text-amber-900 border border-amber-300'
                              }`}>
                                {ad.badgeText || 'SPONSOR'}
                              </span>
                              {ad.logo && (
                                <div className="w-10 h-10 rounded-lg bg-slate-100 p-0.5 border border-slate-200 shrink-0 overflow-hidden flex items-center justify-center">
                                  <img src={ad.logo} alt="Logo" className="w-full h-full object-contain" />
                                </div>
                              )}
                              <div className="min-w-0">
                                {ad.sponsorName && (
                                  <span className="inline-block bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-0.5 rounded-md mb-0.5">
                                    {ad.sponsorName}
                                  </span>
                                )}
                                <p className="text-xs font-bold text-slate-800 truncate">{ad.text}</p>
                                {ad.link && (
                                  <p className="text-[10px] text-blue-500 truncate">{ad.link}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {/* Move Up */}
                              {idx > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const items = [...(tournament.sponsoredAds?.items || [])];
                                    const temp = items[idx - 1];
                                    items[idx - 1] = items[idx];
                                    items[idx] = temp;
                                    setTournament(prev => prev ? {
                                      ...prev,
                                      sponsoredAds: {
                                        ...(prev.sponsoredAds || { items: [] }),
                                        items
                                      }
                                    } : prev);
                                  }}
                                  className="p-1 text-slate-400 hover:text-slate-700 rounded font-bold"
                                  title="Move Up"
                                >
                                  ↑
                                </button>
                              )}
                              {/* Move Down */}
                              {idx < (tournament.sponsoredAds?.items?.length || 0) - 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const items = [...(tournament.sponsoredAds?.items || [])];
                                    const temp = items[idx + 1];
                                    items[idx + 1] = items[idx];
                                    items[idx] = temp;
                                    setTournament(prev => prev ? {
                                      ...prev,
                                      sponsoredAds: {
                                        ...(prev.sponsoredAds || { items: [] }),
                                        items
                                      }
                                    } : prev);
                                  }}
                                  className="p-1 text-slate-400 hover:text-slate-700 rounded font-bold"
                                  title="Move Down"
                                >
                                  ↓
                                </button>
                              )}
                              {/* Edit Ad */}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingAdItem({ ...ad });
                                }}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="Edit Ad"
                              >
                                <Edit2 size={14} />
                              </button>
                              {/* Delete Ad */}
                              <button
                                type="button"
                                onClick={() => {
                                  setTournament(prev => prev ? {
                                    ...prev,
                                    sponsoredAds: {
                                      ...(prev.sponsoredAds || { items: [] }),
                                      items: (prev.sponsoredAds?.items || []).filter(item => item.id !== ad.id)
                                    }
                                  } : prev);
                                }}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                title="Delete Ad"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

              </form>

              {/* Edit Ad Modal */}
              {editingAdItem && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[105] p-4 animate-fade-in">
                  <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden animate-fade-in-up">
                    <div className="bg-gradient-to-r from-amber-600 to-slate-900 p-4 text-white flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Edit2 size={16} className="text-yellow-300" />
                        <h4 className="font-bold text-sm">বিজ্ঞাপন সম্পাদনা (Edit Sponsored Ad)</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingAdItem(null)}
                        className="p-1 hover:bg-white/20 rounded-full text-white/80 hover:text-white"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className="p-5 space-y-3.5">
                      {/* Badge / Button Label Config */}
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-slate-700 block">
                            বাটন / ব্যাজ লেবেল (Button / Badge Label) *
                          </label>
                          <span className="text-[10px] text-slate-400">অ্যাডের শুরুতে এই বাটন শো করবে</span>
                        </div>
                        
                        <input
                          type="text"
                          value={editingAdItem.badgeText || ''}
                          onChange={(e) => setEditingAdItem(prev => prev ? {...prev, badgeText: e.target.value} : null)}
                          placeholder="e.g. SPONSOR, INFO, NOTICE, TOURNAMENT INFO"
                          className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs bg-white outline-none focus:ring-2 focus:ring-amber-500 font-bold uppercase tracking-wider text-slate-800"
                        />

                        {/* Quick selection chips */}
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {[
                            { label: '🏆 SPONSOR', val: 'SPONSOR' },
                            { label: '📢 NOTICE', val: 'NOTICE' },
                            { label: 'ℹ️ INFO', val: 'INFO' },
                            { label: '🏏 TOURNAMENT INFO', val: 'TOURNAMENT INFO' },
                            { label: '✨ UPDATE', val: 'UPDATE' },
                            { label: '⚠️ জরুরী ঘোষণা', val: 'জরুরী ঘোষণা' },
                          ].map(preset => (
                            <button
                              key={preset.val}
                              type="button"
                              onClick={() => setEditingAdItem(prev => prev ? {...prev, badgeText: preset.val} : null)}
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition ${
                                (editingAdItem.badgeText || 'SPONSOR') === preset.val
                                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">
                          বিজ্ঞাপনের মূল লেখা (Ad Text / Notice) *
                        </label>
                        <textarea
                          rows={2}
                          value={editingAdItem.text}
                          onChange={(e) => setEditingAdItem(prev => prev ? {...prev, text: e.target.value} : null)}
                          className="w-full border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">
                            স্পন্সরের নাম / ট্যাগ (ঐচ্ছিক)
                          </label>
                          <input
                            type="text"
                            value={editingAdItem.sponsorName || ''}
                            onChange={(e) => setEditingAdItem(prev => prev ? {...prev, sponsorName: e.target.value} : null)}
                            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">
                            লিংক (ঐচ্ছিক)
                          </label>
                          <input
                            type="text"
                            value={editingAdItem.link || ''}
                            onChange={(e) => setEditingAdItem(prev => prev ? {...prev, link: e.target.value} : null)}
                            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>

                      {/* Logo edit */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                            {editingAdItem.logo ? (
                              <img src={editingAdItem.logo} alt="Logo" className="w-full h-full object-contain" />
                            ) : (
                              <ImageIcon size={18} className="text-slate-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-700">স্পন্সরের লোগো</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {editingAdItem.logo && (
                            <button
                              type="button"
                              onClick={() => setEditingAdItem(prev => prev ? {...prev, logo: ''} : null)}
                              className="text-xs text-red-500 hover:underline px-2 py-1"
                            >
                              Remove
                            </button>
                          )}
                          <label className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 cursor-pointer flex items-center gap-1.5 transition">
                            <Upload size={13} className="text-amber-600" />
                            <span>{uploadingEditAdLogo ? 'আপলোড হচ্ছে...' : 'লোগো পরিবর্তন'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingEditAdLogo}
                              onChange={async (e) => {
                                if (e.target.files && e.target.files[0]) {
                                  setUploadingEditAdLogo(true);
                                  try {
                                    const url = await uploadImageToCloudinary(e.target.files[0]);
                                    setEditingAdItem(prev => prev ? {...prev, logo: url} : null);
                                  } catch (err) {
                                    alert('ছবি আপলোড ব্যর্থ হয়েছে');
                                  } finally {
                                    setUploadingEditAdLogo(false);
                                  }
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setEditingAdItem(null)}
                          className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!editingAdItem.text.trim()) {
                              alert('দয়া করে বিজ্ঞাপনের টেক্সট লিখুন');
                              return;
                            }
                            setTournament(prev => prev ? {
                              ...prev,
                              sponsoredAds: {
                                ...(prev.sponsoredAds || { items: [] }),
                                items: (prev.sponsoredAds?.items || []).map(ad => ad.id === editingAdItem.id ? {
                                  ...ad,
                                  badgeText: editingAdItem.badgeText?.trim() || 'SPONSOR',
                                  text: editingAdItem.text.trim(),
                                  sponsorName: editingAdItem.sponsorName?.trim() || undefined,
                                  logo: editingAdItem.logo?.trim() || undefined,
                                  link: editingAdItem.link?.trim() || undefined
                                } : ad)
                              }
                            } : prev);
                            setEditingAdItem(null);
                          }}
                          className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5"
                        >
                          <Check size={14} /> Update Ad
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Edit Committee Member Modal */}
              {editingMemberInfo && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[105] p-4 animate-fade-in">
                  <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden animate-fade-in-up">
                    <div className="bg-gradient-to-r from-emerald-800 to-slate-900 p-4 text-white flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Edit2 size={16} className="text-emerald-400" />
                        <h4 className="font-bold text-sm">সদস্যের তথ্য সম্পাদনা (Edit Member)</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingMemberInfo(null)}
                        className="p-1 hover:bg-white/20 rounded-full text-white/80 hover:text-white"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className="p-5 space-y-3.5 max-h-[75vh] overflow-y-auto">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">
                            পদবী / Title *
                          </label>
                          <input
                            type="text"
                            value={editingMemberInfo.title}
                            onChange={(e) => setEditingMemberInfo(prev => prev ? {...prev, title: e.target.value} : null)}
                            placeholder="e.g. President / সভাপতি"
                            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">
                            সদস্যের নাম (Full Name) *
                          </label>
                          <input
                            type="text"
                            value={editingMemberInfo.name}
                            onChange={(e) => setEditingMemberInfo(prev => prev ? {...prev, name: e.target.value} : null)}
                            placeholder="e.g. মোঃ করিম হোসেন"
                            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">
                          সংক্ষিপ্ত বিবরণ / পরিচয় (ঐচ্ছিক)
                        </label>
                        <input
                          type="text"
                          value={editingMemberInfo.description}
                          onChange={(e) => setEditingMemberInfo(prev => prev ? {...prev, description: e.target.value} : null)}
                          placeholder="e.g. চেয়ারম্যান, ১নং ইউপি / সমাজসেবক"
                          className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">
                          মোবাইল নম্বর (ঐচ্ছিক)
                        </label>
                        <input
                          type="tel"
                          value={editingMemberInfo.phone}
                          onChange={(e) => setEditingMemberInfo(prev => prev ? {...prev, phone: e.target.value} : null)}
                          placeholder="017xxxxxxxx"
                          className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      {/* Member Photo Edit */}
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-white border border-slate-300 overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
                            {editingMemberInfo.imageUrl ? (
                              <img src={editingMemberInfo.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon size={20} className="text-slate-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-700">সদস্যের ছবি</p>
                            <p className="text-[10px] text-slate-400">ছবি পরিবর্তন করতে নতুন ছবি আপলোড করুন</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {editingMemberInfo.imageUrl && (
                            <button
                              type="button"
                              onClick={() => setEditingMemberInfo(prev => prev ? {...prev, imageUrl: ''} : null)}
                              className="text-xs text-red-500 hover:underline px-2 py-1"
                            >
                              Remove
                            </button>
                          )}
                          <label className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 cursor-pointer flex items-center gap-1.5 transition shadow-xs">
                            <Upload size={13} className="text-emerald-600" />
                            <span>{uploadingEditMemberPhoto ? 'আপলোড হচ্ছে...' : 'ছবি পরিবর্তন'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingEditMemberPhoto}
                              onChange={async (e) => {
                                if (e.target.files && e.target.files[0]) {
                                  setUploadingEditMemberPhoto(true);
                                  try {
                                    const url = await uploadImageToCloudinary(e.target.files[0]);
                                    setEditingMemberInfo(prev => prev ? {...prev, imageUrl: url} : null);
                                  } catch (err) {
                                    alert('ছবি আপলোড ব্যর্থ হয়েছে');
                                  } finally {
                                    setUploadingEditMemberPhoto(false);
                                  }
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setEditingMemberInfo(null)}
                          className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!editingMemberInfo.name.trim() || !editingMemberInfo.title.trim()) {
                              alert('সদস্যের নাম ও পদবী দেওয়া আবশ্যক');
                              return;
                            }
                            setTournament(prev => prev ? {
                              ...prev,
                              committee: {
                                ...(prev.committee || { groups: [] }),
                                groups: (prev.committee?.groups || []).map(g => g.id === editingMemberInfo.groupId ? {
                                  ...g,
                                  members: g.members.map(m => m.id === editingMemberInfo.memberId ? {
                                    ...m,
                                    name: editingMemberInfo.name.trim(),
                                    title: editingMemberInfo.title.trim(),
                                    description: editingMemberInfo.description.trim() || undefined,
                                    phone: editingMemberInfo.phone.trim() || undefined,
                                    imageUrl: editingMemberInfo.imageUrl.trim() || undefined
                                  } : m)
                                } : g)
                              }
                            } : prev);
                            setEditingMemberInfo(null);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5"
                        >
                          <Check size={14} /> Update Member
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-100 flex justify-between items-center">
              <button type="button" onClick={() => { setIsEditingTournament(false); refreshData(); }} className="px-5 py-2.5 rounded-xl text-slate-600 font-semibold hover:bg-slate-100 text-sm">
                Cancel
              </button>
              <button
                disabled={isLoading}
                onClick={handleUpdateTournament as any}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-7 py-2.5 rounded-xl font-bold text-sm shadow-md flex items-center gap-2 disabled:opacity-60"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin"/> : <Check size={16}/>}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 border-b border-slate-200">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'teams', label: 'Teams' },
            { id: 'matches', label: 'Matches' },
            { id: 'registrations', label: 'Registrations' },
            { id: 'awards', label: 'Awards' }
          ].map(tab => (
              <button 
                key={tab.id} 
                onClick={() => { setView(tab.id as any); setActiveMatch(null); setSelectedTeamForSquad(null); }} 
                className={`px-4 py-2 rounded-lg font-medium capitalize flex items-center gap-2 transition-colors ${
                  view === tab.id && !activeMatch && !selectedTeamForSquad 
                    ? 'bg-slate-900 text-white shadow-sm' 
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{tab.label}</span>
                {tab.id === 'registrations' && (
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                    pendingRegCount > 0 ? 'bg-amber-500 text-white animate-pulse' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {registrations.length}
                  </span>
                )}
              </button>
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
              
              <div className="flex flex-col lg:flex-row gap-4 mb-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
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
                  <div className="flex-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Player Photo</label>
                      <div className="flex items-center gap-2 mt-1">
                          {newPlayerImage && (
                              <img src={newPlayerImage} alt="Player" className="w-9 h-9 rounded-lg object-cover border shrink-0" />
                          )}
                          <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer text-xs font-bold text-slate-700 transition">
                              <Upload size={14} className="text-emerald-600" />
                              <span>{uploadingPlayerImage ? 'আপলোড হচ্ছে...' : 'ছবি আপলোড'}</span>
                              <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  disabled={uploadingPlayerImage}
                                  onChange={async (e) => {
                                      if (e.target.files && e.target.files[0]) {
                                          setUploadingPlayerImage(true);
                                          try {
                                              const url = await uploadImageToCloudinary(e.target.files[0]);
                                              setNewPlayerImage(url);
                                          } catch (err) {
                                              alert('প্লেয়ার ছবি আপলোড ব্যর্থ হয়েছে');
                                          } finally {
                                              setUploadingPlayerImage(false);
                                          }
                                      }
                                  }}
                              />
                          </label>
                      </div>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up">
                    <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Users size={24}/></div>
                        <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Teams</p><p className="text-3xl font-black text-slate-900">{teams.length}</p></div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Calendar size={24}/></div>
                        <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Matches</p><p className="text-3xl font-black text-slate-900">{matches.length}</p></div>
                    </div>
                    <div 
                      onClick={() => setView('registrations')}
                      className="bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-4 cursor-pointer hover:border-emerald-300 transition-all group"
                    >
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-105 transition"><UserCheck size={24}/></div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registrations</p>
                          <div className="flex items-center gap-2">
                            <p className="text-3xl font-black text-slate-900">{registrations.length}</p>
                            {pendingRegCount > 0 && (
                              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                                {pendingRegCount} pending
                              </span>
                            )}
                          </div>
                        </div>
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
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 block">Team Logo</label>
                                <div className="flex items-center gap-2 mt-1">
                                    {newTeamLogo && (
                                        <img src={newTeamLogo} alt="Team Logo" className="w-10 h-10 rounded-xl object-cover border shrink-0" />
                                    )}
                                    <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl cursor-pointer text-xs font-bold text-slate-700 transition">
                                        <Upload size={14} className="text-emerald-600" />
                                        <span>{uploadingTeamLogo ? 'আপলোড হচ্ছে...' : 'লোগো ফাইল আপলোড'}</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            disabled={uploadingTeamLogo}
                                            onChange={async (e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    setUploadingTeamLogo(true);
                                                    try {
                                                        const url = await uploadImageToCloudinary(e.target.files[0]);
                                                        setNewTeamLogo(url);
                                                    } catch (err) {
                                                        alert('টিম লোগো আপলোড ব্যর্থ হয়েছে');
                                                    } finally {
                                                        setUploadingTeamLogo(false);
                                                    }
                                                }
                                            }}
                                        />
                                    </label>
                                </div>
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
                                                <div className="w-8 h-8 rounded-full bg-white border flex items-center justify-center overflow-hidden shrink-0">
                                                    {t.logo ? <img src={t.logo} className="w-full h-full object-cover" /> : <span className="text-[10px] font-bold text-slate-400 uppercase">{t.name[0]}</span>}
                                                </div>
                                                <span className="font-bold text-slate-800 truncate">{t.name}</span>
                                            </div>
                                            <div className="flex gap-1 shrink-0">
                                                <button onClick={() => setSelectedTeamForSquad(t)} className="text-[10px] font-black border bg-white px-3 py-1.5 rounded-lg text-emerald-600 hover:bg-emerald-600 hover:text-white uppercase transition-all">Squad ({t.players?.length || 0})</button>
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
                     <div className="flex justify-end mb-6">
                        <button onClick={() => { 
                            setEditingMatchId(null); 
                            setSchedData({ teamA: '', teamB: '', date: new Date().toISOString().split('T')[0], time: '10:00', overs: 20, type: 'T20', groupStage: 'Group Stage', stageType: 'group', squadSize: 11, venue: 'Main Ground' }); 
                            setShowScheduler(true); 
                        }} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2">
                            <Plus size={18}/> Schedule Match
                        </button>
                     </div>
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
                                onEdit={(e, match) => { 
                                    setEditingMatchId(match.id); 
                                    const savedMaxWkts = match.maxWickets !== undefined ? match.maxWickets : 10;
                                    const mappedSquadSize = savedMaxWkts === 1 ? 1 : savedMaxWkts + 1;
                                    setSchedData({ 
                                        teamA: match.teamAId, teamB: match.teamBId, date: match.date, time: match.time, 
                                        venue: match.venue || 'Main Ground', overs: match.totalOvers, type: match.type, 
                                        groupStage: match.groupStage, stageType: match.stageType || 'group', squadSize: mappedSquadSize 
                                    }); 
                                    setShowScheduler(true); 
                                }}
                            />
                        ))}
                     </div>
                </div>
            )}

            {/* REGISTRATIONS VIEW */}
            {view === 'registrations' && (
              <div className="space-y-6 animate-fade-in-up">
                
                {/* Stats Summary Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Applicants</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{registrations.length}</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-amber-200/80 shadow-sm bg-amber-50/30">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Pending Review</p>
                    <p className="text-2xl font-black text-amber-600 mt-1">{pendingRegCount}</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-emerald-200/80 shadow-sm bg-emerald-50/30">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Approved Players</p>
                    <p className="text-2xl font-black text-emerald-600 mt-1">{approvedRegCount}</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Collected</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">৳{totalCollectedFee}</p>
                  </div>
                </div>

                {/* Filter and Header */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex gap-2">
                    {[
                      { id: 'all', label: `All (${registrations.length})` },
                      { id: 'pending', label: `Pending (${pendingRegCount})` },
                      { id: 'approved', label: `Approved (${approvedRegCount})` },
                      { id: 'rejected', label: `Rejected (${registrations.filter(r => r.status === 'rejected').length})` }
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => setRegFilter(f.id as any)}
                        className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition ${
                          regFilter === f.id
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <p className="text-xs text-slate-400">
                    Approved players can be assigned directly to teams.
                  </p>
                </div>

                {/* Registrations List */}
                <div className="space-y-4">
                  {filteredRegistrations.map(reg => {
                    const isPending = reg.status === 'pending';
                    const isApproved = reg.status === 'approved';
                    const isRejected = reg.status === 'rejected';

                    return (
                      <div 
                        key={reg.id}
                        className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:border-emerald-300 transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
                      >
                        {/* Player Details */}
                        <div className="flex items-start gap-4 min-w-0">
                          <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                            {reg.imageUrl ? (
                              <img src={reg.imageUrl} alt={reg.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xl font-black text-slate-400 uppercase">{reg.name[0]}</span>
                            )}
                          </div>

                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-extrabold text-slate-900 text-base">{reg.name}</h4>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                                {reg.role}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                                {reg.bloodGroup}
                              </span>
                              {(reg.jerseyNumber || reg.jerseySize) && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 font-mono">
                                  Jersey: {reg.jerseyNumber ? `#${reg.jerseyNumber}` : ''} ({reg.jerseySize || '-'})
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-500">
                              <span className="text-slate-400">Parents:</span> {reg.fatherName} & {reg.motherName}
                            </p>

                            <p className="text-xs text-slate-500 flex items-center gap-2">
                              <span><MapPin size={12} className="inline mr-1 text-slate-400" />{reg.address}</span>
                              <span>•</span>
                              <a 
                                href={`https://wa.me/88${reg.whatsappNumber.replace(/[^0-9]/g, '')}`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-emerald-600 font-bold hover:underline inline-flex items-center gap-1"
                              >
                                <Phone size={12} /> {reg.whatsappNumber}
                              </a>
                            </p>
                          </div>
                        </div>

                        {/* Payment Information */}
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs space-y-1 min-w-[200px] shrink-0">
                          <div className="flex justify-between items-center mb-1">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              reg.paymentMethod === 'bkash' ? 'bg-pink-100 text-pink-700' :
                              reg.paymentMethod === 'nagad' ? 'bg-orange-100 text-orange-700' :
                              reg.paymentMethod === 'rocket' ? 'bg-purple-100 text-purple-700' :
                              'bg-emerald-100 text-emerald-700'
                            }`}>
                              {reg.paymentMethod}
                            </span>
                            <span className="font-black text-slate-800">৳{reg.registrationFee}</span>
                          </div>
                          
                          <div className="flex justify-between text-slate-500">
                            <span>Sender:</span>
                            <span className="font-mono font-bold text-slate-800">{reg.senderNumber || 'N/A'}</span>
                          </div>

                          <div className="flex justify-between text-slate-500">
                            <span>TrxID:</span>
                            <span className="font-mono font-black text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                              {reg.transactionId || 'N/A'}
                            </span>
                          </div>

                          <div className="text-[10px] text-slate-400 pt-1 border-t">
                            {new Date(reg.createdAt).toLocaleDateString()} at {new Date(reg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>

                        {/* Status & Actions */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0 w-full lg:w-auto justify-end">
                          
                          {/* Status Badge */}
                          <div className="mb-2 sm:mb-0">
                            {isPending && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span> Pending Review
                              </span>
                            )}
                            {isApproved && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 size={14} className="text-emerald-600" /> Approved
                              </span>
                            )}
                            {isRejected && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                                <XCircle size={14} className="text-red-600" /> Rejected
                              </span>
                            )}
                          </div>

                          {/* Approval / Rejection Buttons */}
                          {isPending && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleApproveRegistration(reg)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1 shadow-sm transition"
                              >
                                <Check size={14} /> Approve
                              </button>
                              <button
                                onClick={() => handleRejectRegistration(reg)}
                                className="bg-white border border-red-200 text-red-600 hover:bg-red-50 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1 transition"
                              >
                                <X size={14} /> Reject
                              </button>
                            </div>
                          )}

                          {/* Team Assignment for Approved Players */}
                          {isApproved && (
                            <div className="flex flex-wrap items-center gap-2">
                              <select
                                className="border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                                value={teamAssignSelection[reg.id] || reg.assignedTeamId || ''}
                                onChange={(e) => setTeamAssignSelection({ ...teamAssignSelection, [reg.id]: e.target.value })}
                              >
                                <option value="">Select Team...</option>
                                {teams.map(t => (
                                  <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                              </select>

                              <button
                                onClick={() => {
                                  const selectedTeamId = teamAssignSelection[reg.id] || reg.assignedTeamId;
                                  if (!selectedTeamId) {
                                    alert('Please select a team from the dropdown first.');
                                    return;
                                  }
                                  handleAssignPlayer(reg, selectedTeamId);
                                }}
                                className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1 transition shadow-sm"
                              >
                                <UserPlus size={14} />
                                <span>{reg.assignedTeamId ? 'Re-assign' : 'Assign to Team'}</span>
                              </button>

                              {reg.assignedTeamName && (
                                <span className="bg-blue-50 text-blue-700 border border-blue-200 font-bold px-2.5 py-1 rounded-xl text-[11px]">
                                  Team: {reg.assignedTeamName}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Detail, Print/PDF & Delete */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handlePrintRegistration(reg)}
                              className="p-2 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition"
                              title="Print / Download PDF"
                            >
                              <Printer size={16} />
                            </button>
                            <button
                              onClick={() => setSelectedRegForDetail(reg)}
                              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteRegistration(reg.id)}
                              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                              title="Delete Registration"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                        </div>
                      </div>
                    );
                  })}

                  {filteredRegistrations.length === 0 && (
                    <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 text-slate-400">
                      <UserCheck size={36} className="mx-auto mb-2 opacity-40" />
                      <p className="font-bold text-sm">No registrations found.</p>
                      <p className="text-xs mt-1">Player applications will appear here when players register via the public tournament link.</p>
                    </div>
                  )}
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

      {/* Registration Details Modal */}
      {selectedRegForDetail && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100 animate-fade-in-up">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 overflow-hidden shrink-0">
                  {selectedRegForDetail.imageUrl ? (
                    <img src={selectedRegForDetail.imageUrl} alt={selectedRegForDetail.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-2xl text-white/40">
                      {selectedRegForDetail.name[0]}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-black">{selectedRegForDetail.name}</h3>
                  <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold uppercase">
                    {selectedRegForDetail.role}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedRegForDetail(null)} className="p-2 hover:bg-white/10 rounded-full text-slate-400">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Blood Group</p>
                  <p className="font-extrabold text-slate-800">{selectedRegForDetail.bloodGroup}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold">WhatsApp</p>
                  <p className="font-extrabold text-emerald-600">{selectedRegForDetail.whatsappNumber}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Father Name</p>
                  <p className="font-bold text-slate-800">{selectedRegForDetail.fatherName}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Mother Name</p>
                  <p className="font-bold text-slate-800">{selectedRegForDetail.motherName}</p>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-[10px] uppercase font-bold">Jersey Number</p>
                    <p className="font-extrabold text-blue-700 font-mono text-sm">
                      {selectedRegForDetail.jerseyNumber ? `#${selectedRegForDetail.jerseyNumber}` : 'Not provided'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400 text-[10px] uppercase font-bold">Jersey Size</p>
                    <span className="inline-block px-2.5 py-0.5 rounded-lg bg-blue-100 text-blue-800 font-extrabold text-xs">
                      {selectedRegForDetail.jerseySize || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-slate-400 text-[10px] uppercase font-bold">Address</p>
                <p className="font-medium text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">{selectedRegForDetail.address}</p>
              </div>

              <div className="p-3.5 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-1">
                <p className="text-emerald-800 font-bold uppercase text-[10px] tracking-wider">Payment Details</p>
                <div className="flex justify-between">
                  <span className="text-slate-500">Method:</span>
                  <span className="font-black uppercase text-slate-800">{selectedRegForDetail.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Fee Amount:</span>
                  <span className="font-black text-slate-800">৳{selectedRegForDetail.registrationFee}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sender Number:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedRegForDetail.senderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">TrxID:</span>
                  <span className="font-mono font-black text-slate-800">{selectedRegForDetail.transactionId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="font-bold uppercase text-emerald-700">{selectedRegForDetail.status}</span>
                </div>
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => handlePrintRegistration(selectedRegForDetail)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition"
                >
                  <Printer size={16} />
                  <span>Print / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRegForDetail(null)}
                  className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Team Modal */}
      {editingTeam && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
              <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-fade-in-up">
                  <h3 className="text-xl font-black mb-6 flex items-center gap-2"><Edit2 size={20} className="text-emerald-600"/> Edit Team</h3>
                  <form onSubmit={handleUpdateTeam} className="space-y-4">
                      <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Team Name</label>
                          <input className="w-full border rounded-xl px-4 py-3 mt-1" value={editingTeam.name} onChange={e => setEditingTeam({...editingTeam, name: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 block">Team Logo</label>
                          <div className="flex items-center gap-2 mt-1">
                              {editingTeam.logo && (
                                  <img src={editingTeam.logo} alt="Team Logo" className="w-10 h-10 rounded-xl object-cover border shrink-0" />
                              )}
                              <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl cursor-pointer text-xs font-bold text-slate-700 transition">
                                  <Upload size={14} className="text-emerald-600" />
                                  <span>{uploadingEditTeamLogo ? 'আপলোড হচ্ছে...' : 'লোগো ফাইল আপলোড'}</span>
                                  <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      disabled={uploadingEditTeamLogo}
                                      onChange={async (e) => {
                                          if (e.target.files && e.target.files[0]) {
                                              setUploadingEditTeamLogo(true);
                                              try {
                                                  const url = await uploadImageToCloudinary(e.target.files[0]);
                                                  setEditingTeam(prev => prev ? {...prev, logo: url} : prev);
                                              } catch (err) {
                                                  alert('টিম লোগো আপলোড ব্যর্থ হয়েছে');
                                              } finally {
                                                  setUploadingEditTeamLogo(false);
                                              }
                                          }
                                      }}
                                  />
                              </label>
                          </div>
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
              <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-fade-in-up">
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
                          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 block">Player Photo</label>
                          <div className="flex items-center gap-2 mt-1">
                              {editingPlayer.image && (
                                  <img src={editingPlayer.image} alt="Player" className="w-10 h-10 rounded-xl object-cover border shrink-0" />
                              )}
                              <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl cursor-pointer text-xs font-bold text-slate-700 transition">
                                  <Upload size={14} className="text-emerald-600" />
                                  <span>{uploadingEditPlayerImage ? 'আপলোড হচ্ছে...' : 'ছবি ফাইল আপলোড'}</span>
                                  <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      disabled={uploadingEditPlayerImage}
                                      onChange={async (e) => {
                                          if (e.target.files && e.target.files[0]) {
                                              setUploadingEditPlayerImage(true);
                                              try {
                                                  const url = await uploadImageToCloudinary(e.target.files[0]);
                                                  setEditingPlayer(prev => prev ? {...prev, image: url} : prev);
                                              } catch (err) {
                                                  alert('প্লেয়ার ছবি আপলোড ব্যর্থ হয়েছে');
                                              } finally {
                                                  setUploadingEditPlayerImage(false);
                                              }
                                          }
                                      }}
                                  />
                              </label>
                          </div>
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
                      <h3 className="text-2xl font-black text-slate-900 uppercase">{editingMatchId ? 'Edit Match' : 'Match Settings'}</h3>
                      <button onClick={() => { setShowScheduler(false); setEditingMatchId(null); }} className="p-2 text-slate-400"><X size={24}/></button>
                  </div>
                  <form onSubmit={handleSaveMatch} className="space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Match Stage</label>
                              <input placeholder="e.g. Group A" value={schedData.groupStage} onChange={(e) => setSchedData({...schedData, groupStage: e.target.value})} className="w-full border rounded-xl px-4 py-3" required />
                          </div>
                          <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Stage Type</label>
                              <select value={schedData.stageType} onChange={(e) => setSchedData({...schedData, stageType: e.target.value as StageType})} className="w-full border rounded-xl px-4 py-3 bg-white">
                                  <option value="group">Group Stage</option>
                                  <option value="knockout">Knockout</option>
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

                      <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Venue / Ground Name</label>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-3.5 text-slate-400" size={18} />
                            <input placeholder="e.g. Lords Cricket Ground" value={schedData.venue} onChange={(e) => setSchedData({...schedData, venue: e.target.value})} className="w-full border rounded-xl pl-10 pr-4 py-3" required />
                          </div>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div className="col-span-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Overs</label>
                              <input 
                                type="number" 
                                value={schedData.overs !== undefined ? schedData.overs : ''} 
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSchedData({...schedData, overs: val === '' ? ('' as any) : (isNaN(parseInt(val)) ? ('' as any) : parseInt(val))});
                                }} 
                                onBlur={(e) => {
                                  if (!e.target.value || parseInt(e.target.value) <= 0) {
                                    setSchedData({...schedData, overs: 20});
                                  }
                                }}
                                className="w-full border rounded-xl px-4 py-3" 
                              />
                          </div>
                          <div className="col-span-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Squad Size</label>
                              <select value={schedData.squadSize} onChange={(e) => setSchedData({...schedData, squadSize: parseInt(e.target.value)})} className="w-full border rounded-xl px-4 py-3 bg-white">
                                  {[1,2,3,4,5,6,7,8,9,10,11].map(num => <option key={num} value={num}>{num} P</option>)}
                              </select>
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

                      <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 mt-4">
                          {editingMatchId ? 'Update Match' : 'Confirm Schedule'}
                      </button>
                  </form>
              </div>
          </div>
      )}
    </Layout>
  );
};
