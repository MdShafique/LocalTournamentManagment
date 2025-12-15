import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AdminHome } from './pages/AdminHome';
import { TournamentAdmin } from './pages/TournamentAdmin';
import { PublicView } from './pages/PublicView';

const Landing: React.FC = () => (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <h1 className="text-5xl font-bold mb-4 text-center text-emerald-400">BKPL Cricket Tournament 2025/26</h1>
        <p className="text-xl text-slate-400 mb-8 max-w-lg text-center">The ultimate local cricket tournament management system.</p>
        <div className="flex gap-4">
            <a href="#/admin" className="bg-emerald-600 px-6 py-3 rounded-lg font-bold hover:bg-emerald-500 transition">Admin Login</a>
        </div>
        <div className="mt-12 text-sm text-slate-600">
             To view a tournament, use the specific shared link (e.g. /view/:id)
        </div>
    </div>
);

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/admin" element={<AdminHome />} />
        <Route path="/admin/tournament/:id" element={<TournamentAdmin />} />
        <Route path="/view/:id" element={<PublicView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;