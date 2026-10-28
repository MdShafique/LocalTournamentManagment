import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Trophy, Home, User, ExternalLink } from 'lucide-react';

export const Layout: React.FC<{ 
  children: React.ReactNode; 
  title?: string;
  logo?: string;
  rightAction?: React.ReactNode;
}> = ({ children, title, logo, rightAction }) => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const isViewer = location.pathname.startsWith('/view/');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-emerald-900 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 relative">
            
            {/* Left: Tournament Logo / Brand */}
            <div className="flex items-center gap-2 z-10 shrink-0">
              <Link to="/" className="flex items-center gap-2.5 group">
                {logo ? (
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 p-0.5 border border-emerald-400 overflow-hidden shrink-0 shadow-sm flex items-center justify-center">
                    <img src={logo} alt="Tournament Logo" className="w-full h-full object-cover rounded-full" />
                  </div>
                ) : (
                  <Trophy className="h-6 w-6 sm:h-7 sm:w-7 text-yellow-400" />
                )}
                {title && (
                  <span className="font-bold text-sm sm:text-base tracking-tight text-white group-hover:text-emerald-200 transition truncate max-w-[150px] sm:max-w-md hidden sm:block">
                    {title}
                  </span>
                )}
              </Link>
            </div>
            
            {/* Right: Actions */}
            <div className="flex items-center gap-2 sm:gap-4 z-10 shrink-0">
               {rightAction}

               {/* Only show Admin Login if NOT on a viewer page and NOT already an admin page */}
               {!isAdmin && !isViewer && (
                   <Link to="/admin" className="text-emerald-100 hover:text-white px-2 py-2 rounded-md text-xs sm:text-sm font-medium flex items-center gap-1">
                     <User size={16} /> <span className="hidden sm:inline">Admin Login</span>
                   </Link>
               )}
               {isAdmin && (
                   <div className="flex items-center gap-2 sm:gap-4">
                        <Link to="/" className="text-emerald-200 hover:text-white text-xs sm:text-sm flex items-center gap-1">
                            <ExternalLink size={14}/> <span className="hidden sm:inline">View Site</span>
                        </Link>
                        <div className="bg-emerald-800 px-2 py-1 sm:px-3 rounded-full text-[10px] sm:text-xs font-semibold text-emerald-200 border border-emerald-700">
                            Admin
                        </div>
                   </div>
               )}
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>

      <footer className="bg-slate-900 text-slate-400 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs sm:text-sm">© {new Date().getFullYear()} BKPL Cricket Tournament</p>
        </div>
      </footer>
    </div>
  );
};
