import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Trophy, Home, User, ExternalLink } from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode; title?: string }> = ({ children, title }) => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const isViewer = location.pathname.startsWith('/view/');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-emerald-900 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 relative">
            
            {/* Left: Logo */}
            <div className="flex items-center gap-3 z-10">
              <Link to="/" className="flex items-center gap-2">
                <Trophy className="h-8 w-8 text-yellow-400" />
                <span className="font-bold text-xl tracking-tight hidden sm:block">Badar Khali Premier League</span>
              </Link>
            </div>

            {/* Center: Tournament Title (for Viewer) */}
            {title && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="font-bold text-lg text-emerald-100 truncate max-w-[200px] sm:max-w-md">{title}</span>
                </div>
            )}
            
            {/* Right: Actions */}
            <div className="flex items-center gap-4 z-10">
               {/* Only show Admin Login if NOT on a viewer page and NOT already an admin page */}
               {!isAdmin && !isViewer && (
                   <Link to="/admin" className="text-emerald-100 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1">
                     <User size={16} /> Admin Login
                   </Link>
               )}
               {isAdmin && (
                   <div className="flex items-center gap-4">
                        <Link to="/" className="text-emerald-200 hover:text-white text-sm flex items-center gap-1">
                            <ExternalLink size={14}/> View Site
                        </Link>
                        <div className="bg-emerald-800 px-3 py-1 rounded-full text-xs font-semibold text-emerald-200">
                            Admin Mode
                        </div>
                   </div>
               )}
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="bg-slate-900 text-slate-400 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm">© {new Date().getFullYear()} Badar Khali Premier League.</p>
        </div>
      </footer>
    </div>
  );
};