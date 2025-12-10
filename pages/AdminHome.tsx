import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTournaments, saveTournament } from '../services/storageService';
import { Tournament } from '../types';
import { Layout } from '../components/Layout';
import { Plus, ChevronRight, LogIn } from 'lucide-react';

export const AdminHome: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTourneyName, setNewTourneyName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Simulating Auth check
    const auth = localStorage.getItem('cric_auth');
    if (auth) {
        setIsLoggedIn(true);
        setTournaments(getTournaments());
    }
  }, []);

  const handleLogin = () => {
      // Simulation of Google Login
      localStorage.setItem('cric_auth', 'true');
      setIsLoggedIn(true);
      setTournaments(getTournaments());
  };

  const handleCreate = (e: React.FormEvent) => {
      e.preventDefault();
      const newT: Tournament = {
          id: Date.now().toString(),
          name: newTourneyName,
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
          adminId: 'admin_1'
      };
      saveTournament(newT);
      setTournaments(getTournaments());
      setShowCreate(false);
      setNewTourneyName('');
  };

  if (!isLoggedIn) {
      return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
              <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                  <h1 className="text-3xl font-bold text-slate-900 mb-2">CricManage Pro</h1>
                  <p className="text-slate-500 mb-8">Admin Portal Access</p>
                  
                  <button 
                    onClick={handleLogin}
                    className="w-full bg-white border border-slate-300 text-slate-700 py-3 rounded-lg hover:bg-slate-50 font-medium flex items-center justify-center gap-3 transition-colors"
                  >
                      <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
                      Sign in with Google
                  </button>
                  <div className="mt-6 text-xs text-slate-400">
                      Note: This is a demo. Clicking simply logs you in.
                  </div>
              </div>
          </div>
      );
  }

  return (
    <Layout>
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Your Tournaments</h1>
            <button 
                onClick={() => setShowCreate(!showCreate)}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 flex items-center gap-2"
            >
                <Plus size={20} /> New Tournament
            </button>
        </div>

        {showCreate && (
            <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 mb-8 animate-fade-in-down">
                <h3 className="font-bold mb-4">Create Tournament</h3>
                <form onSubmit={handleCreate} className="flex gap-4">
                    <input 
                        type="text" 
                        required
                        value={newTourneyName}
                        onChange={(e) => setNewTourneyName(e.target.value)}
                        placeholder="Tournament Name (e.g. Summer Cup 2024)"
                        className="flex-1 border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <button type="submit" className="bg-slate-900 text-white px-6 py-2 rounded-lg hover:bg-slate-800">
                        Create
                    </button>
                </form>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map(t => (
                <div 
                    key={t.id} 
                    onClick={() => navigate(`/admin/tournament/${t.id}`)}
                    className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer group"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                            <span className="font-bold text-xl">{t.name[0]}</span>
                        </div>
                        <ChevronRight className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">{t.name}</h3>
                    <p className="text-sm text-slate-500">Created: {new Date(t.startDate).toLocaleDateString()}</p>
                </div>
            ))}
            
            {tournaments.length === 0 && !showCreate && (
                <div className="col-span-full text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
                    <p className="text-slate-400">No tournaments found. Create your first one!</p>
                </div>
            )}
        </div>
    </Layout>
  );
};