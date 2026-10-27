import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTournamentsByAdmin, saveTournament, deleteTournament } from '../services/storageService';
import { auth, googleProvider, signInWithPopup, onAuthStateChanged, User, signOut } from '../services/firebase';
import { Tournament } from '../types';
import { Layout } from '../components/Layout';
import { Plus, ChevronRight, LogOut, Loader2, User as UserIcon, AlertTriangle, Settings, Trash2, MapPin, DollarSign, FileText, Smartphone, Banknote, ShieldCheck, Upload, Image as ImageIcon } from 'lucide-react';
import { uploadImageToCloudinary } from '../services/cloudinaryService';

export const AdminHome: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Basic info
  const [newTourneyName, setNewTourneyName] = useState('');
  const [newTourneyVenue, setNewTourneyVenue] = useState('');
  const [newTourneyFee, setNewTourneyFee] = useState('500');
  const [newTourneyLogo, setNewTourneyLogo] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  // Registration and rules
  const [newTourneyRegOpen, setNewTourneyRegOpen] = useState(true);
  const [newTourneyRegStart, setNewTourneyRegStart] = useState('');
  const [newTourneyRegEnd, setNewTourneyRegEnd] = useState('');
  const [newTourneyRules, setNewTourneyRules] = useState(
`১. টুর্নামেন্ট পরিচালনা কমিটির যেকোনো সিদ্ধান্ত চূড়ান্ত বলে গণ্য হবে।
২. নির্ধারিত রেজিস্ট্রেশন ফি সফলভাবে পরিশোধ করার পরই আবেদন চূড়ান্ত বিবেচনা করা হবে।
৩. সকল খেলোয়াড়কে টুর্নামেন্টের সার্বিক নিয়মশৃঙ্খলা ও আচরণবিধি মেনে চলতে হবে।
৪. আম্পায়ারের সিদ্ধান্তই চূড়ান্ত। কোনো রূপ অসদাচরণ গ্রহণযোগ্য নয়।`
  );

  // Payment gateways
  const [newBkashNumber, setNewBkashNumber] = useState('');
  const [newBkashType, setNewBkashType] = useState<'Personal' | 'Merchant' | 'Agent'>('Personal');
  const [newNagadNumber, setNewNagadNumber] = useState('');
  const [newNagadType, setNewNagadType] = useState<'Personal' | 'Merchant'>('Personal');
  const [newRocketNumber, setNewRocketNumber] = useState('');
  const [newRocketType, setNewRocketType] = useState<'Personal' | 'Merchant'>('Personal');
  const [newCashCollectorName, setNewCashCollectorName] = useState('');
  const [newCashCollectorPhone, setNewCashCollectorPhone] = useState('');
  const [newPaymentInstructions, setNewPaymentInstructions] = useState('');
  
  // Form tab
  const [createTab, setCreateTab] = useState<'basic' | 'rules' | 'payment'>('basic');
  
  // Auth Error State
  const [authError, setAuthError] = useState<{message: string, type?: string} | null>(null);

  const navigate = useNavigate();

  // Listen for Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser: User | null) => {
        setUser(currentUser);
        if (currentUser) {
            loadTournaments(currentUser.uid);
        } else {
            setIsLoading(false);
            setTournaments([]);
        }
    });
    return () => unsubscribe();
  }, []);

  const loadTournaments = async (uid: string) => {
      setIsLoading(true);
      try {
          const data = await getTournamentsByAdmin(uid);
          setTournaments(data);
      } catch (error) {
          console.error("Error loading tournaments:", error);
      }
      setIsLoading(false);
  };

  const handleLogin = async () => {
      setAuthError(null);
      try {
          await signInWithPopup(auth, googleProvider);
      } catch (error: any) {
          console.error("Login Failed", error);
          if (error.code === 'auth/configuration-not-found') {
             setAuthError({
                 type: 'config',
                 message: "Google Sign-In is disabled in Firebase Console."
             });
          } else if (error.code === 'auth/unauthorized-domain') {
             setAuthError({
                 type: 'domain',
                 message: "Domain not authorized."
             });
          } else if (error.code === 'auth/popup-closed-by-user') {
             setAuthError({ message: "Login cancelled." });
          } else {
             setAuthError({ message: error.message || "Login failed." });
          }
      }
  };
  
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadingLogo(true);
      try {
        const url = await uploadImageToCloudinary(file);
        setNewTourneyLogo(url);
      } catch (err) {
        console.error('Failed to upload logo:', err);
        alert('ছবি আপলোড ব্যর্থ হয়েছে। দয়া করে আবার চেষ্টা করুন।');
      } finally {
        setUploadingLogo(false);
      }
    }
  };

  const handleLogout = async () => {
      await signOut(auth);
  };

  const handleToggleTournamentReg = async (e: React.MouseEvent, targetTournament: Tournament) => {
    e.stopPropagation();
    const updated: Tournament = {
      ...targetTournament,
      isRegistrationOpen: targetTournament.isRegistrationOpen === false ? true : false
    };
    // Update local state immediately for snappy UI
    setTournaments(prev => prev.map(t => t.id === targetTournament.id ? updated : t));
    try {
      await saveTournament(updated);
    } catch (err) {
      console.error('Failed to toggle registration:', err);
      if (user) await loadTournaments(user.uid);
    }
  };

  const handleToggleTournamentCommittee = async (e: React.MouseEvent, targetTournament: Tournament) => {
    e.stopPropagation();
    const updated: Tournament = {
      ...targetTournament,
      isCommitteeVisible: targetTournament.isCommitteeVisible ? false : true
    };
    setTournaments(prev => prev.map(t => t.id === targetTournament.id ? updated : t));
    try {
      await saveTournament(updated);
    } catch (err) {
      console.error('Failed to toggle committee visibility:', err);
      if (user) await loadTournaments(user.uid);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;

      setIsLoading(true);
      const parsedFee = parseFloat(newTourneyFee);
      const newT: Tournament = {
          id: Date.now().toString(),
          name: newTourneyName.trim(),
          logo: newTourneyLogo.trim() || undefined,
          venue: newTourneyVenue.trim() || undefined,
          registrationFee: isNaN(parsedFee) ? 0 : parsedFee,
          isRegistrationOpen: newTourneyRegOpen,
          registrationStartDate: newTourneyRegStart || undefined,
          registrationEndDate: newTourneyRegEnd || undefined,
          rules: newTourneyRules.trim() || undefined,
          isCommitteeVisible: false,
          committee: { groups: [] },
          paymentInfo: {
            bkashNumber: newBkashNumber.trim() || undefined,
            bkashType: newBkashType,
            nagadNumber: newNagadNumber.trim() || undefined,
            nagadType: newNagadType,
            rocketNumber: newRocketNumber.trim() || undefined,
            rocketType: newRocketType,
            cashCollectorName: newCashCollectorName.trim() || undefined,
            cashCollectorPhone: newCashCollectorPhone.trim() || undefined,
            instructions: newPaymentInstructions.trim() || undefined
          },
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
          adminId: user.uid
      };
      await saveTournament(newT);
      await loadTournaments(user.uid);
      setShowCreate(false);
      setNewTourneyName('');
      setNewTourneyVenue('');
      setNewTourneyLogo('');
      setNewTourneyFee('500');
      setNewTourneyRegStart('');
      setNewTourneyRegEnd('');
      setNewBkashNumber('');
      setNewNagadNumber('');
      setNewRocketNumber('');
      setNewCashCollectorName('');
      setNewCashCollectorPhone('');
      setNewPaymentInstructions('');
      setIsLoading(false);
  };

  const handleDeleteTournament = async (tid: string) => {
      setIsLoading(true);
      try {
          await deleteTournament(tid);
          if (user) await loadTournaments(user.uid);
      } catch (error) {
          console.error("Error deleting tournament:", error);
          alert("Failed to delete tournament.");
      }
      setIsLoading(false);
  };

  if (isLoading && !user) {
       return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="animate-spin text-emerald-600" size={40}/></div>;
  }

  // LOGIN SCREEN
  if (!user) {
      return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
              <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
                  <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">CricManage Pro</h1>
                    <p className="text-slate-500">Admin Portal Access</p>
                  </div>
                  
                  {authError && (
                      <div className="bg-red-50 text-red-600 text-sm p-4 rounded-lg mb-6 border border-red-200">
                          <div className="flex gap-2 items-start mb-2">
                              <AlertTriangle size={18} className="shrink-0 mt-0.5"/> 
                              <p className="font-bold">Connection Failed</p>
                          </div>
                          
                          {authError.type === 'config' ? (
                              <div className="ml-6 text-xs text-slate-700 space-y-2">
                                  <p>Firebase Console-এ Google Sign-In চালু করা নেই।</p>
                                  <ol className="list-decimal pl-4 space-y-1">
                                      <li>Go to <a href="https://console.firebase.google.com" target="_blank" className="underline text-blue-600 font-bold">Firebase Console</a></li>
                                      <li>Select project: <b>localtournamentmanagment</b></li>
                                      <li>Go to <b>Authentication</b> {'>'} <b>Sign-in method</b></li>
                                      <li>Click <b>Google</b> and turn <b>Enable</b> switch ON.</li>
                                      <li>Click <b>Save</b>.</li>
                                  </ol>
                              </div>
                          ) : authError.type === 'domain' ? (
                              <div className="ml-6 text-xs text-slate-700 space-y-2">
                                  <p>Netlify বা আপনার কাস্টম ডোমেইনটি Firebase এ অ্যাড করা নেই।</p>
                                  <ol className="list-decimal pl-4 space-y-1">
                                      <li>Go to <a href="https://console.firebase.google.com" target="_blank" className="underline text-blue-600 font-bold">Firebase Console</a></li>
                                      <li>Select <b>Authentication</b> {'>'} <b>Settings</b> {'>'} <b>Authorized domains</b></li>
                                      <li>Click <b>Add domain</b>.</li>
                                      <li>Paste your site domain (e.g. <code>myapp.netlify.app</code>).</li>
                                  </ol>
                              </div>
                          ) : (
                              <p className="ml-6">{authError.message}</p>
                          )}
                      </div>
                  )}

                  <button 
                      onClick={handleLogin}
                      className="w-full bg-white border border-slate-300 text-slate-700 py-3 rounded-lg hover:bg-slate-50 font-medium flex items-center justify-center gap-3 transition-colors shadow-sm mb-4"
                  >
                      <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
                      Sign in with Google
                  </button>
                  
                  <div className="text-center text-xs text-slate-400 mt-4">
                      Create and manage your local cricket tournaments.
                  </div>
              </div>
          </div>
      );
  }

  // DASHBOARD
  return (
    <Layout>
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Your Tournaments</h1>
                <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                    <UserIcon size={14}/> {user.displayName || user.email}
                </p>
            </div>
            <div className="flex gap-3">
                 <button 
                    onClick={handleLogout}
                    className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 flex items-center gap-2"
                >
                    <LogOut size={18} /> Logout
                </button>
                <button 
                    onClick={() => setShowCreate(!showCreate)}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 flex items-center gap-2 shadow-sm"
                >
                    <Plus size={20} /> New Tournament
                </button>
            </div>
        </div>

        {showCreate && (
            <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200 mb-8 animate-fade-in-down">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3 mb-5">
                    <div>
                        <h3 className="font-black text-xl text-slate-800">Create New Tournament</h3>
                        <p className="text-xs text-slate-500">Configure tournament details, registration rules, and payment gateways.</p>
                    </div>

                    {/* Step Tabs */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto text-xs font-bold">
                        <button
                            type="button"
                            onClick={() => setCreateTab('basic')}
                            className={`px-3 py-1.5 rounded-lg transition-all ${
                                createTab === 'basic' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            1. Basic Info
                        </button>
                        <button
                            type="button"
                            onClick={() => setCreateTab('rules')}
                            className={`px-3 py-1.5 rounded-lg transition-all ${
                                createTab === 'rules' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            2. Rules & ToS
                        </button>
                        <button
                            type="button"
                            onClick={() => setCreateTab('payment')}
                            className={`px-3 py-1.5 rounded-lg transition-all ${
                                createTab === 'payment' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            3. Payment Gateways
                        </button>
                    </div>
                </div>

                <form onSubmit={handleCreate} className="space-y-5">
                    {/* TAB 1: BASIC INFO */}
                    {createTab === 'basic' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="sm:col-span-1">
                                    <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Tournament Name *</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={newTourneyName}
                                        onChange={(e) => setNewTourneyName(e.target.value)}
                                        placeholder="e.g. Summer Premier League 2025"
                                        className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                                    />
                                </div>
                                <div className="sm:col-span-1">
                                    <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Registration Fee (৳)</label>
                                    <input 
                                        type="number" 
                                        min="0"
                                        value={newTourneyFee}
                                        onChange={(e) => setNewTourneyFee(e.target.value)}
                                        placeholder="e.g. 500"
                                        className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-semibold"
                                    />
                                </div>
                                <div className="sm:col-span-1">
                                    <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Default Venue</label>
                                    <input 
                                        type="text" 
                                        value={newTourneyVenue}
                                        onChange={(e) => setNewTourneyVenue(e.target.value)}
                                        placeholder="e.g. Badar Khali High School Ground"
                                        className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                                    />
                                </div>
                            </div>

                            {/* Tournament Logo Upload */}
                            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-white border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shrink-0 shadow-sm relative">
                                    {newTourneyLogo ? (
                                        <img src={newTourneyLogo} alt="Logo Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <ImageIcon size={24} className="text-slate-400" />
                                    )}
                                    {uploadingLogo && (
                                        <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-white">
                                            <Loader2 size={16} className="animate-spin text-emerald-400" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 text-center sm:text-left">
                                    <label className="text-xs font-bold text-slate-700 block mb-1">Tournament Logo (Optional)</label>
                                    <p className="text-[11px] text-slate-400 mb-2">গ্যালারি বা ডিভাইস থেকে টুর্নামেন্টের লোগো বা ব্যানার ছবি আপলোড করুন।</p>
                                    <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer shadow-sm transition">
                                        <Upload size={14} className="text-emerald-600" />
                                        <span>{uploadingLogo ? 'আপলোড হচ্ছে...' : 'লোগো ছবি পছন্দ করুন'}</span>
                                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploadingLogo} />
                                    </label>
                                </div>
                            </div>

                            {/* Registration Toggle */}
                            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold text-sm text-slate-800">Player Registration Status</h4>
                                    <p className="text-xs text-slate-500">
                                        অন থাকলে ফ্রন্টএন্ডে রেজিস্ট্রেশন বাটন দৃশ্যমান হবে। অফ করলে কোনো জায়গায় রেজিস্ট্রেশন বাটন দেখা যাবে না।
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setNewTourneyRegOpen(!newTourneyRegOpen)}
                                    className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                        newTourneyRegOpen ? 'bg-emerald-600' : 'bg-slate-300'
                                    }`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                            newTourneyRegOpen ? 'translate-x-7' : 'translate-x-0'
                                        }`}
                                    />
                                </button>
                            </div>

                            {/* Registration Countdown Timer Dates */}
                            <div className="bg-amber-50/60 border border-amber-200/80 p-4 rounded-xl space-y-3">
                                <div>
                                    <h4 className="font-bold text-xs uppercase tracking-wider text-amber-900">Registration Timer / Deadline (ঐচ্ছিক)</h4>
                                    <p className="text-[11px] text-amber-800/80">শুরু এবং শেষ তারিখ নির্ধারণ করলে ফ্রন্টএন্ডে লাইভ কাউন্টডাউন টাইমার শো করবে।</p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-600 block mb-1">রেজিস্ট্রেশন শুরুর তারিখ ও সময়</label>
                                        <input
                                            type="datetime-local"
                                            value={newTourneyRegStart}
                                            onChange={(e) => setNewTourneyRegStart(e.target.value)}
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white outline-none focus:ring-2 focus:ring-amber-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-600 block mb-1">রেজিস্ট্রেশন শেষ হওয়ার তারিখ ও সময় (Deadline)</label>
                                        <input
                                            type="datetime-local"
                                            value={newTourneyRegEnd}
                                            onChange={(e) => setNewTourneyRegEnd(e.target.value)}
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white outline-none focus:ring-2 focus:ring-amber-500"
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => setCreateTab('rules')}
                                    className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-xl text-xs font-bold"
                                >
                                    Next: Set Rules & Terms →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: RULES & TOS */}
                    {createTab === 'rules' && (
                        <div className="space-y-4">
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-bold text-slate-700 uppercase">
                                        টুর্নামেন্টের নিয়মাবলী ও শর্তসমূহ (Rules & Terms)
                                    </label>
                                    <span className="text-[11px] text-slate-400">প্রতি লাইনে একটি করে নিয়ম লিখুন</span>
                                </div>
                                <textarea
                                    rows={6}
                                    value={newTourneyRules}
                                    onChange={(e) => setNewTourneyRules(e.target.value)}
                                    placeholder="১. টুর্নামেন্টের নিয়মাবলী লিখুন..."
                                    className="w-full border border-slate-300 rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none leading-relaxed"
                                />
                                <p className="text-[11px] text-slate-400 mt-1">
                                    খেলোয়াড়রা যখন রেজিস্ট্রেশন বাটনে ক্লিক করবে, তখন প্রথম পপআপে এই শর্তগুলো প্রদর্শিত হবে।
                                </p>
                            </div>

                            <div className="flex justify-between">
                                <button
                                    type="button"
                                    onClick={() => setCreateTab('basic')}
                                    className="text-slate-600 hover:bg-slate-100 px-4 py-2 rounded-xl text-xs font-bold"
                                >
                                    ← Back
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCreateTab('payment')}
                                    className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-xl text-xs font-bold"
                                >
                                    Next: Payment Gateways →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: PAYMENT GATEWAYS */}
                    {createTab === 'payment' && (
                        <div className="space-y-4">
                            <p className="text-xs text-slate-500">
                                যেসব মেথডের নম্বর বা তথ্য পূরণ করবেন, ফ্রন্টএন্ড রেজিস্ট্রেশনে শুধুমাত্র সেই অপশনগুলো প্লেয়ারদের দেখানো হবে।
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* BKASH */}
                                <div className="bg-pink-50/50 border border-pink-200 p-4 rounded-2xl space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-xs text-pink-700 uppercase tracking-wider flex items-center gap-1.5">
                                            <Smartphone size={14} /> bKash Gateway
                                        </span>
                                        <select
                                            value={newBkashType}
                                            onChange={(e) => setNewBkashType(e.target.value as any)}
                                            className="text-xs border border-pink-200 rounded-lg px-2 py-1 bg-white font-bold text-pink-700 outline-none"
                                        >
                                            <option value="Personal">Personal</option>
                                            <option value="Merchant">Merchant</option>
                                            <option value="Agent">Agent</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-500 block mb-1">bKash Mobile Number</label>
                                        <input
                                            type="tel"
                                            value={newBkashNumber}
                                            onChange={(e) => setNewBkashNumber(e.target.value)}
                                            placeholder="017xxxxxxxx"
                                            className="w-full border border-pink-200 rounded-xl px-3 py-2 text-sm bg-white font-mono outline-none focus:ring-2 focus:ring-pink-400"
                                        />
                                    </div>
                                </div>

                                {/* NAGAD */}
                                <div className="bg-orange-50/50 border border-orange-200 p-4 rounded-2xl space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-xs text-orange-700 uppercase tracking-wider flex items-center gap-1.5">
                                            <Smartphone size={14} /> Nagad Gateway
                                        </span>
                                        <select
                                            value={newNagadType}
                                            onChange={(e) => setNewNagadType(e.target.value as any)}
                                            className="text-xs border border-orange-200 rounded-lg px-2 py-1 bg-white font-bold text-orange-700 outline-none"
                                        >
                                            <option value="Personal">Personal</option>
                                            <option value="Merchant">Merchant</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-500 block mb-1">Nagad Mobile Number</label>
                                        <input
                                            type="tel"
                                            value={newNagadNumber}
                                            onChange={(e) => setNewNagadNumber(e.target.value)}
                                            placeholder="018xxxxxxxx"
                                            className="w-full border border-orange-200 rounded-xl px-3 py-2 text-sm bg-white font-mono outline-none focus:ring-2 focus:ring-orange-400"
                                        />
                                    </div>
                                </div>

                                {/* ROCKET */}
                                <div className="bg-purple-50/50 border border-purple-200 p-4 rounded-2xl space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-xs text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
                                            <Smartphone size={14} /> Rocket Gateway (Optional)
                                        </span>
                                        <select
                                            value={newRocketType}
                                            onChange={(e) => setNewRocketType(e.target.value as any)}
                                            className="text-xs border border-purple-200 rounded-lg px-2 py-1 bg-white font-bold text-purple-700 outline-none"
                                        >
                                            <option value="Personal">Personal</option>
                                            <option value="Merchant">Merchant</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-500 block mb-1">Rocket Mobile Number</label>
                                        <input
                                            type="tel"
                                            value={newRocketNumber}
                                            onChange={(e) => setNewRocketNumber(e.target.value)}
                                            placeholder="019xxxxxxxx"
                                            className="w-full border border-purple-200 rounded-xl px-3 py-2 text-sm bg-white font-mono outline-none focus:ring-2 focus:ring-purple-400"
                                        />
                                    </div>
                                </div>

                                {/* CASH COLLECTOR */}
                                <div className="bg-emerald-50/50 border border-emerald-200 p-4 rounded-2xl space-y-3">
                                    <span className="font-bold text-xs text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                                        <Banknote size={14} /> Cash On Hand Setup
                                    </span>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[11px] font-bold text-slate-500 block mb-1">টাকা জমার দায়িত্বপ্রাপ্ত ব্যক্তি</label>
                                            <input
                                                type="text"
                                                value={newCashCollectorName}
                                                onChange={(e) => setNewCashCollectorName(e.target.value)}
                                                placeholder="e.g. মোঃ করিম (কমিটি)"
                                                className="w-full border border-emerald-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-400"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-bold text-slate-500 block mb-1">যোগাযোগের মোবাইল নম্বর</label>
                                            <input
                                                type="tel"
                                                value={newCashCollectorPhone}
                                                onChange={(e) => setNewCashCollectorPhone(e.target.value)}
                                                placeholder="017xxxxxxxx"
                                                className="w-full border border-emerald-200 rounded-xl px-3 py-2 text-sm bg-white font-mono outline-none focus:ring-2 focus:ring-emerald-400"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Extra Instructions */}
                            <div>
                                <label className="text-xs font-bold text-slate-600 block mb-1">অতিরিক্ত পেমেন্ট নির্দেশনা (ঐচ্ছিক)</label>
                                <input
                                    type="text"
                                    value={newPaymentInstructions}
                                    onChange={(e) => setNewPaymentInstructions(e.target.value)}
                                    placeholder="e.g. টাকা পাঠানোর সময় রেফারেন্সে প্লেয়ারের নাম দিন"
                                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            <div className="flex justify-between pt-2">
                                <button
                                    type="button"
                                    onClick={() => setCreateTab('rules')}
                                    className="text-slate-600 hover:bg-slate-100 px-4 py-2 rounded-xl text-xs font-bold"
                                >
                                    ← Back
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Form actions */}
                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                        <button 
                            type="button" 
                            onClick={() => setShowCreate(false)} 
                            className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium text-sm"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={isLoading} 
                            className="bg-emerald-600 text-white px-7 py-2.5 rounded-xl hover:bg-emerald-700 disabled:opacity-50 font-bold text-sm shadow-md"
                        >
                            {isLoading ? 'Creating...' : 'Create Tournament'}
                        </button>
                    </div>
                </form>
            </div>
        )}

        {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-600" size={32}/></div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tournaments.map(t => (
                    <div 
                        key={t.id} 
                        onClick={() => navigate(`/admin/tournament/${t.id}`)}
                        className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                             <img src="https://www.svgrepo.com/show/30580/cricket.svg" className="w-16 h-16" alt="Icon" />
                        </div>

                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 shadow-inner overflow-hidden">
                                {t.logo ? <img src={t.logo} className="w-full h-full object-cover" alt="logo"/> : <span className="font-bold text-xl uppercase">{t.name[0]}</span>}
                            </div>
                            <div className="flex gap-1">
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if(window.confirm(`Are you sure you want to delete "${t.name}"? This action cannot be undone.`)) {
                                            handleDeleteTournament(t.id);
                                        }
                                    }}
                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                    title="Delete Tournament"
                                >
                                    <Trash2 size={18} />
                                </button>
                                <ChevronRight className="text-slate-300 group-hover:text-emerald-500 transition-colors self-center" />
                            </div>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1 relative z-10 truncate pr-8">{t.name}</h3>
                        {t.venue && <p className="text-xs text-slate-400 mb-2 flex items-center gap-1"><MapPin size={10}/> {t.venue}</p>}
                        
                        <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-slate-500 relative z-10">
                            <button
                                type="button"
                                onClick={(e) => handleToggleTournamentReg(e, t)}
                                title="Click to toggle registration for this tournament"
                                className={`font-bold px-2.5 py-0.5 rounded-full border text-[10px] transition-all hover:scale-105 active:scale-95 ${
                                    t.isRegistrationOpen !== false 
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200' 
                                        : 'bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200'
                                }`}
                            >
                                {t.isRegistrationOpen !== false ? '● Reg: Open' : '○ Reg: Closed'}
                            </button>
                            <button
                                type="button"
                                onClick={(e) => handleToggleTournamentCommittee(e, t)}
                                title="Click to toggle committee visibility for this tournament"
                                className={`font-bold px-2.5 py-0.5 rounded-full border text-[10px] transition-all hover:scale-105 active:scale-95 ${
                                    t.isCommitteeVisible 
                                        ? 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200' 
                                        : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                                }`}
                            >
                                {t.isCommitteeVisible ? '🏛️ Committee: ON' : '🏛️ Committee: OFF'}
                            </button>
                            {t.registrationFee !== undefined && (
                                <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-200/60">
                                    Fee: ৳{t.registrationFee}
                                </span>
                            )}
                            <span className="text-slate-400">Created: {new Date(t.startDate).toLocaleDateString()}</span>
                        </div>
                    </div>
                ))}
                
                {tournaments.length === 0 && !showCreate && (
                    <div className="col-span-full text-center py-20 bg-white rounded-xl border-2 border-dashed border-slate-300">
                        <p className="text-slate-400 mb-2">You haven't created any tournaments yet.</p>
                        <button onClick={() => setShowCreate(true)} className="text-emerald-600 font-bold hover:underline">Create your first one</button>
                    </div>
                )}
            </div>
        )}
    </Layout>
  );
};
