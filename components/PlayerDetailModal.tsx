import React from 'react';
import { Player, Team, Match } from '../types';
import { calculatePlayerAggregateStats } from '../utils/statsHelper';
import { calculateOvers } from '../services/storageService';
import { X, Trophy, Target, Shield, Zap, Star, User, Award, CircleHelp } from 'lucide-react';

interface Props {
  player: Player;
  team: Team;
  matches: Match[];
  onClose: () => void;
}

export const PlayerDetailModal: React.FC<Props> = ({ player, team, matches = [], onClose }) => {
  const stats = calculatePlayerAggregateStats(player.id, matches);

  const StatBox = ({ label, value, icon: Icon, colorClass, suffix = "" }: any) => (
    <div className="bg-white border border-slate-100 p-4 rounded-3xl shadow-sm hover:shadow-md transition-shadow group">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg ${colorClass?.replace('text-', 'bg-')}/10`}>
            {Icon && <Icon size={14} className={colorClass} />}
        </div>
        <span className="text-[9px] uppercase font-black text-slate-400 tracking-widest">{label}</span>
      </div>
      <div className="text-2xl font-black text-slate-900 tracking-tighter">
          {value}{suffix && <span className="text-[10px] font-bold text-slate-300 ml-1 uppercase">{suffix}</span>}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-[100] p-0 sm:p-4 animate-fade-in">
      <div className="bg-slate-50 sm:rounded-[3rem] shadow-2xl w-full h-full sm:h-auto sm:max-w-2xl overflow-hidden animate-fade-in-up border border-white/20">
        
        <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-slate-900 p-8 sm:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
              <User size={240} className="text-white" />
          </div>
          
          <button onClick={onClose} className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all border border-white/10 backdrop-blur-md">
            <X size={20} />
          </button>
          
          <div className="flex flex-col sm:flex-row items-center gap-8 relative z-10">
            <div className="relative">
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-[2.5rem] bg-white/10 border-4 border-white/20 p-1 backdrop-blur-xl overflow-hidden shadow-2xl">
                  {player.image ? (
                    <img src={player.image} className="w-full h-full object-cover rounded-[2rem]" alt={player.name} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl font-black text-white/20">
                      {player.name[0]}
                    </div>
                  )}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-yellow-900 p-2 rounded-2xl border-4 border-emerald-900 shadow-xl">
                <Star size={18} fill="currentColor" />
              </div>
            </div>
            
            <div className="text-center sm:text-left">
              <p className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.4em] mb-2">Player Profile</p>
              <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tighter mb-4 uppercase leading-none">{player.name}</h2>
              <div className="flex flex-wrap justify-center sm:justify-start gap-3">
                <span className="bg-white/10 px-4 py-1.5 rounded-full text-[10px] font-black text-white uppercase tracking-widest border border-white/10 backdrop-blur-md flex items-center gap-2">
                    <Zap size={12} className="text-yellow-400" /> {player.role}
                </span>
                <span className="bg-emerald-600/30 px-4 py-1.5 rounded-full text-[10px] font-black text-emerald-200 uppercase tracking-widest border border-emerald-500/30 backdrop-blur-md flex items-center gap-2">
                    <Shield size={12} /> {team.name}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 sm:p-12 overflow-y-auto max-h-[60vh] sm:max-h-none">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              
              <div className="space-y-6">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                  <Award size={16} className="text-orange-500" /> Career Batting
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <StatBox label="Matches" value={stats.inningsBat} colorClass="text-slate-400" />
                  <StatBox label="Total Runs" value={stats.runs} icon={Trophy} colorClass="text-orange-500" />
                  <StatBox label="Avg." value={stats.average.toFixed(2)} colorClass="text-emerald-500" />
                  <StatBox label="Strike Rate" value={stats.strikeRate.toFixed(1)} icon={Zap} colorClass="text-yellow-500" />
                  <StatBox label="Highest" value={stats.highest} colorClass="text-blue-500" />
                  <StatBox label="Dismissals" value={stats.dismissals} colorClass="text-red-400" />
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                  <Target size={16} className="text-blue-500" /> Career Bowling
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <StatBox label="Innings" value={stats.inningsBowl} colorClass="text-slate-400" />
                  <StatBox label="Wickets" value={stats.wickets} icon={Trophy} colorClass="text-blue-600" />
                  <StatBox label="Economy" value={stats.economy.toFixed(2)} icon={Zap} colorClass="text-indigo-500" />
                  <StatBox label="Runs Conc." value={stats.runsConceded} colorClass="text-red-500" />
                  <StatBox label="Overs" value={calculateOvers(stats.ballsBowled)} colorClass="text-slate-500" />
                  <StatBox label="Maidens" value={stats.maidens} icon={Star} colorClass="text-purple-500" />
                </div>
              </div>

          </div>
        </div>

        <div className="p-8 bg-white border-t border-slate-100 text-center sm:rounded-b-[3rem]">
           <p className="text-[9px] text-slate-300 font-black uppercase tracking-[0.3em]">Advanced Player Metrics powered by CricManage Pro</p>
        </div>
      </div>
    </div>
  );
};