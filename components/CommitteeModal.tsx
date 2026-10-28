import React, { useState } from 'react';
import { Tournament, CommitteeGroup } from '../types';
import { X, Users, Phone, Building2, ShieldCheck, Award, MapPin } from 'lucide-react';

interface CommitteeModalProps {
  tournament: Tournament;
  isOpen: boolean;
  onClose: () => void;
}

export const CommitteeModal: React.FC<CommitteeModalProps> = ({
  tournament,
  isOpen,
  onClose
}) => {
  const groups: CommitteeGroup[] = tournament.committee?.groups || [];
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');

  if (!isOpen) return null;

  const filteredGroups = selectedGroupFilter === 'all' 
    ? groups 
    : groups.filter(g => g.id === selectedGroupFilter);

  const totalMembers = groups.reduce((acc, g) => acc + (g.members?.length || 0), 0);

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[100] p-2.5 sm:p-6 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl sm:rounded-[2.5rem] shadow-2xl w-full max-w-4xl border border-white/20 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Slim Top Header with Close Button */}
        <div className="bg-slate-900 px-4 sm:px-6 py-3 sm:py-4 text-white flex items-center justify-between shrink-0 border-b border-white/10 z-10">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center overflow-hidden shrink-0">
              {tournament.logo ? (
                <img src={tournament.logo} alt={tournament.name} className="w-full h-full object-cover" />
              ) : (
                <Building2 size={20} className="text-emerald-400" />
              )}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black uppercase tracking-tight text-white flex items-center gap-2">
                <span>About Committee</span>
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {totalMembers}
                </span>
              </h3>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 sm:p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white/80 hover:text-white transition-colors shrink-0"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content Body (Hero Showcase scrolls together so committee list has full space on mobile) */}
        <div className="p-3 sm:p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50 space-y-4 sm:space-y-6">
          
          {/* Tournament & Presented By Hero Showcase */}
          <div className="p-4 sm:p-6 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border border-emerald-800/40 rounded-2xl sm:rounded-3xl text-center space-y-2 text-white shadow-md">
            <h2 className="text-xs sm:text-sm md:text-base font-black uppercase tracking-wider text-emerald-300">
              {tournament.committee?.tagline || tournament.name}
            </h2>

            {tournament.committee?.presentedBy && (
              <div className="py-1">
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-yellow-300">
                  {tournament.committee.presentedByLabel || 'Presented By'}
                </p>
                <h1 className="text-xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-white mt-0.5 drop-shadow-sm">
                  {tournament.committee.presentedBy}
                </h1>
              </div>
            )}

            {tournament.venue && (
              <p className="text-[11px] sm:text-xs text-emerald-200/80 flex items-center justify-center gap-1 pt-0.5">
                <MapPin size={12} className="text-emerald-400 shrink-0" />
                <span>{tournament.venue}</span>
              </p>
            )}
          </div>

          {/* Group Filter Pills if multiple groups */}
          {groups.length > 1 && (
            <div className="flex overflow-x-auto gap-1.5 sm:gap-2 pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedGroupFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                  selectedGroupFilter === 'all'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                All Committees ({groups.length})
              </button>
              {groups.map(g => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGroupFilter(g.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                    selectedGroupFilter === g.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {g.name} ({g.members?.length || 0})
                </button>
              ))}
            </div>
          )}
          {groups.length === 0 || totalMembers === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                <Users size={32} />
              </div>
              <h4 className="text-lg font-bold text-slate-800 mb-1">কমিটির তথ্য প্রকাশ করা হচ্ছে</h4>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                টুর্নামেন্ট পরিচালনা কমিটির সদস্যদের তালিকা শীঘ্রই এখানে বিস্তারিতভাবে প্রকাশ করা হবে।
              </p>
            </div>
          ) : (
            filteredGroups.map(group => (
              <div key={group.id} className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-sm">
                
                {/* Group Title */}
                <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100 flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                      <Building2 size={18} />
                    </div>
                    <div>
                      <h4 className="text-base sm:text-xl font-black text-slate-900 tracking-tight">
                        {group.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                        {group.members.length} {group.members.length === 1 ? 'Designated Person' : 'Designated Persons'}
                      </p>
                    </div>
                  </div>
                  <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold border border-slate-200">
                    Official Committee
                  </span>
                </div>

                {/* Members Grid */}
                {group.members.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">
                    এই গ্রুপে কোনো সদস্যের নাম পাওয়া যায়নি।
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.members.map(member => {
                      const isHighRanking = 
                        member.title.toLowerCase().includes('president') || 
                        member.title.toLowerCase().includes('সভাপতি') ||
                        member.title.toLowerCase().includes('chairman') ||
                        member.title.toLowerCase().includes('secretary') ||
                        member.title.toLowerCase().includes('সম্পাদক');

                      return (
                        <div 
                          key={member.id} 
                          className={`rounded-2xl p-4 transition-all hover:shadow-md flex flex-col justify-between border ${
                            isHighRanking 
                              ? 'bg-gradient-to-br from-emerald-50/60 via-white to-white border-emerald-200/80 shadow-xs' 
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div>
                            {/* Member Photo & Title Badge */}
                            <div className="flex items-center gap-3.5 mb-3">
                              <div className="w-14 h-14 rounded-2xl bg-slate-100 border-2 border-white shadow-md overflow-hidden shrink-0 flex items-center justify-center text-slate-500 font-black text-lg">
                                {member.imageUrl ? (
                                  <img 
                                    src={member.imageUrl} 
                                    alt={member.name} 
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="uppercase">{member.name ? member.name[0] : '?'}</span>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className={`inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg truncate max-w-full ${
                                  isHighRanking 
                                    ? 'bg-emerald-600 text-white shadow-xs' 
                                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                                }`}>
                                  {member.title}
                                </span>
                                <h5 className="font-extrabold text-sm sm:text-base text-slate-900 truncate mt-1 leading-tight">
                                  {member.name}
                                </h5>
                                {member.description && (
                                  <p className="text-xs text-slate-600 font-medium line-clamp-2 mt-0.5 leading-snug">
                                    {member.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Member Contact Phone (if available) */}
                          {member.phone && (
                            <div className="pt-2 border-t border-slate-100/80 mt-1 flex items-center justify-between">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Contact</span>
                              <a 
                                href={`tel:${member.phone}`}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition font-mono"
                              >
                                <Phone size={11} className="text-emerald-600" />
                                {member.phone}
                              </a>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <ShieldCheck size={16} className="text-emerald-600" />
            <span className="font-bold text-slate-600">{tournament.name}</span>
            <span className="hidden sm:inline">• Committee</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
