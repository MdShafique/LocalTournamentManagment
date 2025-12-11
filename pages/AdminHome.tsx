
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTournamentsByAdmin, saveTournament } from '../services/storageService';
import { auth, googleProvider, signInWithPopup, onAuthStateChanged, User, signOut } from '../services/firebase';
import { Tournament } from '../types';
import { Layout } from '../components/Layout';
import { Plus, ChevronRight, LogOut, Loader2, User as UserIcon, AlertTriangle } from 'lucide-react';

export const AdminHome: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [newTourneyName, setNewTourneyName] = useState('');
  
  // Auth Error State
  const [authError, setAuthError] = useState('');

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
      setAuthError('');
      try {
          await signInWithPopup(auth, googleProvider);
      } catch (error: any) {
          console.error("Login Failed", error);
          if (error.code === 'auth/popup-closed-by-user') {
             setAuthError("Login cancelled by user.");
          } else {
             setAuthError(error.message || "Login failed. Please check your internet connection.");
          }
      }
  };
  
  const handleLogout = async () => {
      await signOut(auth);
  };

  const handleCreate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;

      setIsLoading(true);
      const newT: Tournament = {
          id: Date.now().toString(),
          name: newTourneyName,
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
          adminId: user.uid
      };
      await saveTournament(newT);
      await loadTournaments(user.uid);
      setShowCreate(false);
      setNewTourneyName('');
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
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Badar Khali Premier League</h1>
                    <p className="text-slate-500">Admin Portal Access</p>
                  </div>
                  
                  {authError && (
                      <div className="bg-red-50 text-red-600 text-sm p-3 rounded mb-4 text-left border border-red-200 flex gap-2">
                          <AlertTriangle size={16} className="shrink-0 mt-0.5"/> 
                          <div>
                              <p className="font-bold">Connection Failed</p>
                              <p>{authError}</p>
                          </div>
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
                      Create and manage your local tournaments easily.
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
            <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 mb-8 animate-fade-in-down">
                <h3 className="font-bold mb-4">Create New Tournament</h3>
                <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-4">
                    <input 
                        type="text" 
                        required
                        value={newTourneyName}
                        onChange={(e) => setNewTourneyName(e.target.value)}
                        placeholder="Tournament Name (e.g. Summer Cup 2024)"
                        className="flex-1 border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <button type="submit" disabled={isLoading} className="bg-slate-900 text-white px-6 py-2 rounded-lg hover:bg-slate-800 disabled:opacity-50">
                        {isLoading ? 'Creating...' : 'Create'}
                    </button>
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
                            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 shadow-inner">
                                <span className="font-bold text-xl uppercase">{t.name[0]}</span>
                            </div>
                            <ChevronRight className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1 relative z-10">{t.name}</h3>
                        <p className="text-sm text-slate-500 relative z-10">Started: {new Date(t.startDate).toLocaleDateString()}</p>
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
