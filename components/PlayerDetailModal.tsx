
import React from 'react';
import { Player, Team, Match } from '../types';
import { calculatePlayerAggregateStats } from '../utils/statsHelper';
import { X, Trophy, Target, Shield, Zap, User, Star } from 'lucide-react';

interface Props {
  player: Player;
  team: Team;
  matches: Match[];
  onClose: () => void;
}

export const PlayerDetailModal: React.FC<Props> = ({ player, team, matches, onClose }) => {
  const stats = calculatePlayerAggregateStats(player.id, matches);

  const StatBox = ({ label, value, icon: Icon, colorClass }: any) => (
    <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon size={14} className={colorClass} />}
        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{label}</span>
      </div>
      <div className="text-xl font-mono font-bold text-slate-800">{value}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
        {/* Header/Profile */}
        <div className="bg-emerald-900 p-6 relative">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-emerald-800/50 hover:bg-emerald-800 text-white rounded-full transition">
            <X size={20} />
          </button>
          
          <div className="flex items-center gap-5">
            <div className="relative">
              {player.image ? (
                <img src={player.image} className="w-24 h-24 rounded-2xl object-cover border-4 border-emerald-800 shadow-lg" />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-emerald-800 flex items-center justify-center text-4xl font-bold text-emerald-100 border-4 border-emerald-700 shadow-lg">
                  {player.name[0]}
                </div>
              )}
              <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-yellow-900 p-1.5 rounded-lg border-2 border-emerald-900 shadow-sm">
                <Star size={14} fill="currentColor" />
              </div>
            </div>
            
            <div className="text-white">
              <h2 className="text-2xl font-bold mb-1">{player.name}</h2>
              <div className="flex flex-wrap gap-2">
                <span className="bg-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-emerald-700">{player.role}</span>
                <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-white/10">{team.name}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {/* Batting Stats */}
          <section className="mb-8">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Zap size={14} className="text-orange-500" /> Batting Performance
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatBox label="Innings" value={stats.inningsBat} icon={Target} colorClass="text-slate-400" />
              <StatBox label="Total Runs" value={stats.runs} icon={Trophy} colorClass="text-yellow-500" />
              <StatBox label="Average" value={stats.average.toFixed(1)} />
              <StatBox label="Strike Rate" value={stats.strikeRate.toFixed(1)} />
              <StatBox label="Highest" value={stats.highest} />
              <StatBox label="Dismissals" value={stats.dismissals} />
            </div>
          </section>

          {/* Bowling Stats */}
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Shield size={14} className="text-blue-500" /> Bowling Performance
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatBox label="Innings" value={stats.inningsBowl} />
              <StatBox label="Wickets" value={stats.wickets} icon={Trophy} colorClass="text-emerald-500" />
              <StatBox label="Economy" value={stats.economy.toFixed(2)} />
              <StatBox label="Runs Conc." value={stats.runsConceded} />
              <StatBox label="Balls" value={stats.ballsBowled} />
            </div>
          </section>
        </div>

        <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
           <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Cricket Management</p>
        </div>
      </div>
    </div>
  );
};
