import React from 'react';
import { Player, Team, Match } from '../types';
import { calculatePlayerAggregateStats } from '../utils/statsHelper';
import { calculateOvers } from '../services/storageService';
import { X, Trophy, Target, Shield, Zap, Star, User, Award } from 'lucide-react';

interface Props {
  player: Player;
  team: Team;
  matches: Match[];
  onClose: () => void;
}

export const PlayerDetailModal: React.FC<Props> = ({ player, team, matches = [], onClose }) => {
  const stats = calculatePlayerAggregateStats(player.id, matches);

  const StatBox = ({ label, value, icon: Icon, colorClass, suffix = "" }: any) => (
    <div className="bg-white border border-slate-100 p-3 sm:p-4 rounded-2xl sm:rounded-3xl shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-center min-h-[80px]">
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`p-1 rounded-md ${colorClass?.replace('text-', 'bg-')}/10 shrink-0`}>
            {Icon && <Icon size={12} className={colorClass} />}
        </div>
        <span className="text-[8px] sm:text-[9px] uppercase font-black text-slate-400 tracking-widest truncate">{label}</span>
      </div>
      <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tighter truncate">
          {value}{suffix && <span className="text-[9px] font-bold text-slate-300 ml-1 uppercase">{suffix}</span>}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-[100] p-0 sm:p-4 animate-fade-in">
      <div className="bg-slate-50 sm:rounded-[3rem] shadow-2xl w-full h-full sm:h-auto sm:max-h-[95vh] sm:max-w-2xl flex flex-col overflow-hidden animate-fade-in-up border border-white/20">
        
        {/* Header Section */}
        <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-slate-900 p-6 sm:p-10 relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
              <User size={200} className="text-white" />
          </div>
          
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 sm:p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl sm:rounded-2xl transition-all border border-white/10 backdrop-blur-md z-20"
          >
            <X size={18} />
          </button>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 relative z-10">
            <div className="relative">
              <div className="w-24 h-24 sm:w-36 sm:h-36 rounded-[1.5rem] sm:rounded-[2.5rem] bg-white/10 border-4 border-white/20 p-0.5 backdrop-blur-xl overflow-hidden shadow-2xl">
                  {player.image ? (
                    <img src={player.image} className="w-full h-full object-cover rounded-[1.2rem] sm:rounded-[2rem]" alt={player.name} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl sm:text-6xl font-black text-white/20">
                      {player.name[0]}
                    </div>
                  )}
              </div>
              <div className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 bg-yellow-400 text-yellow-900 p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border-2 sm:border-4 border-emerald-900 shadow-xl">
                <Star size={14} className="sm:w-[18px] sm:h-[18px]" fill="currentColor" />
              </div>
            </div>
            
            <div className="text-center sm:text-left min-w-0 flex-1">
              <p className="text-emerald-400 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] mb-1">Player Profile</p>
              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tighter mb-3 uppercase leading-tight truncate">{player.name}</h2>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 sm:gap-3">
                <span className="bg-white/10 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-[8px] sm:text-[10px] font-black text-white uppercase tracking-widest border border-white/10 backdrop-blur-md flex items-center gap-1.5">
                    <Zap size={10} className="text-yellow-400 sm:w-3 sm:h-3" /> {player.role}
                </span>
                <span className="bg-emerald-600/30 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-[8px] sm:text-[10px] font-black text-emerald-200 uppercase tracking-widest border border-emerald-500/30 backdrop-blur-md flex items-center gap-1.5 truncate max-w-[150px]">
                    <Shield size={10} className="sm:w-3 sm:h-3" /> {team.name}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section with Scroll */}
        <div className="p-5 sm:p-10 overflow-y-auto custom-scrollbar flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10">
              
              {/* Batting Stats */}
              <div className="space-y-4 sm:space-y-6">
                <h3 className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 px-1">
                  <Award size={14} className="text-orange-500 sm:w-4 sm:h-4" /> Career Batting
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <StatBox label="Innings" value={stats.inningsBat} colorClass="text-slate-400" />
                  <StatBox label="Total Runs" value={stats.runs} icon={Trophy} colorClass="text-orange-500" />
                  <StatBox label="Average" value={stats.average.toFixed(2)} colorClass="text-emerald-500" />
                  <StatBox label="Strike Rate" value={stats.strikeRate.toFixed(1)} icon={Zap} colorClass="text-yellow-500" />
                  <StatBox label="Highest" value={stats.highest} colorClass="text-blue-500" />
                  <StatBox label="Dismissals" value={stats.dismissals} colorClass="text-red-400" />
                </div>
              </div>

              {/* Bowling Stats */}
              <div className="space-y-4 sm:space-y-6">
                <h3 className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 px-1">
                  <Target size={14} className="text-blue-500 sm:w-4 sm:h-4" /> Career Bowling
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <StatBox label="Innings" value={stats.inningsBowl} colorClass="text-slate-400" />
                  <StatBox label="Wickets" value={stats.wickets} icon={Trophy} colorClass="text-blue-600" />
                  <StatBox label="Economy" value={stats.economy.toFixed(2)} icon={Zap} colorClass="text-indigo-500" />
                  <StatBox label="Average" value={stats.bowlingAverage.toFixed(2)} colorClass="text-emerald-500" />
                  <StatBox label="Runs Conc." value={stats.runsConceded} colorClass="text-red-500" />
                  <StatBox label="Overs" value={calculateOvers(stats.ballsBowled)} colorClass="text-slate-500" />
                </div>
              </div>

          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest text-center">Total Matches Part of XI: {stats.matchesPlayed}</span>
            <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Profile Verified</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 bg-white border-t border-slate-100 text-center shrink-0">
           <p className="text-[8px] sm:text-[9px] text-slate-300 font-black uppercase tracking-[0.2em] sm:tracking-[0.3em]">Advanced Player Metrics powered by CricManage Pro</p>
        </div>
      </div>
    </div>
  );
};