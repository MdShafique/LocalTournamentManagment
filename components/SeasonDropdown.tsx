import React, { useState, useRef, useEffect } from 'react';
import { SeasonConfig, SeasonItem } from '../types';
import { Calendar, ChevronDown, ExternalLink, Sparkles, Trophy } from 'lucide-react';

interface SeasonDropdownProps {
  config?: SeasonConfig;
  currentTournamentId?: string;
}

export const SeasonDropdown: React.FC<SeasonDropdownProps> = ({ config, currentTournamentId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // If disabled or no season items, do not render
  if (!config || config.enabled === false || !config.items || config.items.length === 0) {
    return null;
  }

  const items = config.items;
  const buttonLabel = config.buttonLabel?.trim() || 'Season';

  const handleSelectSeason = (item: SeasonItem) => {
    setIsOpen(false);
    if (!item.link) return;

    let targetUrl = item.link.trim();
    // If user provided just tournament id (e.g. "1741234567")
    if (!targetUrl.startsWith('http') && !targetUrl.startsWith('/') && !targetUrl.startsWith('#')) {
      targetUrl = `/#/view/${targetUrl}`;
    }

    if (targetUrl.startsWith('http')) {
      window.open(targetUrl, '_blank');
    } else {
      window.location.href = targetUrl;
      // In SPA hash router, if same window hash changes, force scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative inline-block text-left shrink-0" ref={dropdownRef}>
      {/* Season Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="bg-emerald-950/80 hover:bg-emerald-800 text-emerald-200 hover:text-white font-extrabold px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm flex items-center gap-1 sm:gap-1.5 shadow transition-all active:scale-95 border border-emerald-700/60 shrink-0"
        title="Browse Tournament Seasons"
      >
        <Calendar size={14} className="shrink-0 text-emerald-300" />
        <span className="truncate max-w-[65px] xs:max-w-none">{buttonLabel}</span>
        <ChevronDown 
          size={13} 
          className={`shrink-0 transition-transform duration-200 text-emerald-300 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 sm:w-64 bg-slate-900 border border-emerald-500/30 rounded-2xl shadow-2xl z-[80] overflow-hidden animate-fade-in-up py-1.5 backdrop-blur-md">
          {/* Dropdown Header */}
          <div className="px-3.5 py-2 border-b border-white/10 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
              <Trophy size={11} /> Tournament Seasons
            </span>
            <span className="text-[9px] font-mono text-slate-400 bg-white/10 px-1.5 py-0.5 rounded">
              {items.length} {items.length === 1 ? 'Season' : 'Seasons'}
            </span>
          </div>

          {/* List of Seasons */}
          <div className="max-h-60 overflow-y-auto custom-scrollbar p-1 space-y-1">
            {items.map((item) => {
              const isMatch = item.isCurrent || (currentTournamentId && item.link.includes(currentTournamentId));

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectSeason(item)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between gap-2 group ${
                    isMatch
                      ? 'bg-emerald-600/30 text-emerald-200 border border-emerald-500/40'
                      : 'text-white/90 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 group-hover:scale-125 transition"></span>
                    <span className="truncate">{item.title}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.year && (
                      <span className="text-[10px] font-mono text-slate-400 bg-black/30 px-1.5 py-0.5 rounded">
                        {item.year}
                      </span>
                    )}
                    {isMatch && (
                      <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 px-1.5 py-0.5 rounded">
                        Current
                      </span>
                    )}
                    <ExternalLink size={12} className="text-slate-400 group-hover:text-emerald-300 transition" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
