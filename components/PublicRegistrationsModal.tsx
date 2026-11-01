import React, { useState, useMemo } from 'react';
import { PlayerRegistration, Tournament } from '../types';
import { printRegistrationSlip } from '../utils/printHelper';
import { 
  X, 
  Search, 
  Download, 
  Printer, 
  Users, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Filter, 
  ShieldCheck, 
  Phone, 
  MapPin, 
  Calendar,
  Sparkles,
  Shirt
} from 'lucide-react';

interface PublicRegistrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament;
  registrations: PlayerRegistration[];
  initialFilter?: 'all' | 'pending' | 'approved';
}

export const PublicRegistrationsModal: React.FC<PublicRegistrationsModalProps> = ({
  isOpen,
  onClose,
  tournament,
  registrations,
  initialFilter = 'all'
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>(initialFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReg, setSelectedReg] = useState<PlayerRegistration | null>(null);

  // Sync initialFilter when opened
  React.useEffect(() => {
    if (isOpen) {
      setFilter(initialFilter);
      setSearchQuery('');
      setSelectedReg(null);
    }
  }, [isOpen, initialFilter]);

  const counts = useMemo(() => {
    const all = registrations.length;
    const pending = registrations.filter(r => r.status === 'pending').length;
    const approved = registrations.filter(r => r.status === 'approved').length;
    return { all, pending, approved };
  }, [registrations]);

  const filteredList = useMemo(() => {
    return registrations.filter(reg => {
      if (filter === 'pending' && reg.status !== 'pending') return false;
      if (filter === 'approved' && reg.status !== 'approved') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = reg.name?.toLowerCase().includes(q);
        const matchRole = reg.role?.toLowerCase().includes(q);
        const matchTeam = reg.assignedTeamName?.toLowerCase().includes(q);
        const matchJersey = reg.jerseyNumber?.toString().includes(q);
        const matchPhone = reg.whatsappNumber?.includes(q);
        const matchTrx = reg.transactionId?.toLowerCase().includes(q);
        return matchName || matchRole || matchTeam || matchJersey || matchPhone || matchTrx;
      }
      return true;
    });
  }, [registrations, filter, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[100] p-2.5 sm:p-6 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl sm:rounded-[2.5rem] shadow-2xl w-full max-w-5xl border border-white/20 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 p-4 sm:p-6 text-white shrink-0 border-b border-white/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
              {tournament.logo ? (
                <img src={tournament.logo} alt={tournament.name} className="w-full h-full object-cover" />
              ) : (
                <Users size={22} className="text-emerald-400" />
              )}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck size={13} /> Registered Players Directory
              </span>
              <h3 className="text-base sm:text-xl font-black text-white truncate">
                {tournament.name}
              </h3>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white/80 hover:text-white transition-colors shrink-0"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-3 sm:p-5 bg-slate-100/80 border-b border-slate-200 shrink-0 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            
            {/* Tabs / Filter Buttons */}
            <div className="grid grid-cols-3 gap-1.5 sm:flex sm:items-center sm:gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  filter === 'all'
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300/80'
                }`}
              >
                <Users size={14} className={filter === 'all' ? 'text-yellow-400' : 'text-slate-500'} />
                <span>All</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${filter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {counts.all}
                </span>
              </button>

              <button
                onClick={() => setFilter('approved')}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  filter === 'approved'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-300/80'
                }`}
              >
                <CheckCircle2 size={14} className={filter === 'approved' ? 'text-white' : 'text-emerald-600'} />
                <span>Approved</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${filter === 'approved' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                  {counts.approved}
                </span>
              </button>

              <button
                onClick={() => setFilter('pending')}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  filter === 'pending'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                    : 'bg-white text-amber-700 hover:bg-amber-50 border border-amber-300/80'
                }`}
              >
                <Clock size={14} className={filter === 'pending' ? 'text-white' : 'text-amber-600'} />
                <span>Pending</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${filter === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`}>
                  {counts.pending}
                </span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 sm:max-w-xs">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, role, team, jersey, phone..."
                className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3.5 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content List */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 bg-slate-50 space-y-3">
          {filteredList.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6">
              <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Users size={28} />
              </div>
              <h4 className="text-base font-bold text-slate-700 mb-1">কোনো রেজিস্ট্রেশন পাওয়া যায়নি</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchQuery 
                  ? `"${searchQuery}" এর সাথে মিলে এমন কোনো খেলোয়াড়ের তথ্য পাওয়া যায়নি।` 
                  : filter === 'approved' 
                  ? 'এখনো কোনো খেলোয়াড় অ্যাপ্রুভ করা হয়নি।' 
                  : filter === 'pending'
                  ? 'কোনো পেন্ডিং রেজিস্ট্রেশন নেই।'
                  : 'এখনো কোনো খেলোয়াড় রেজিস্ট্রেশন করেনি।'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {filteredList.map((reg, idx) => {
                const isApproved = reg.status === 'approved';
                const isPending = reg.status === 'pending';
                const isRejected = reg.status === 'rejected';

                return (
                  <div
                    key={reg.id}
                    className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between gap-3 group relative"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Photo Thumbnail */}
                      <div className="w-14 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center shadow-inner">
                        {reg.imageUrl ? (
                          <img src={reg.imageUrl} alt={reg.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl font-black text-slate-400 uppercase">{reg.name[0]}</span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className="font-extrabold text-sm sm:text-base text-slate-900 truncate">
                            {reg.name}
                          </h4>
                          
                          {/* Status Pill */}
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase shrink-0 ${
                            isApproved 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                              : isPending 
                              ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}>
                            {isApproved ? <CheckCircle2 size={11} /> : isPending ? <Clock size={11} /> : <XCircle size={11} />}
                            <span>{reg.status}</span>
                          </span>
                        </div>

                        {/* Badges / Roles */}
                        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                            {reg.role}
                          </span>
                          {reg.bloodGroup && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-50 text-rose-600 border border-rose-200">
                              {reg.bloodGroup}
                            </span>
                          )}
                          {(reg.jerseyNumber || reg.jerseySize) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                              <Shirt size={10} />
                              <span>{reg.jerseyNumber ? `#${reg.jerseyNumber}` : ''} {reg.jerseySize ? `(${reg.jerseySize})` : ''}</span>
                            </span>
                          )}
                        </div>

                        {/* Assigned Team */}
                        {reg.assignedTeamName ? (
                          <p className="text-[11px] font-bold text-emerald-700 truncate flex items-center gap-1">
                            <span className="text-slate-400 font-normal">Team:</span>
                            <span className="bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80">{reg.assignedTeamName}</span>
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">
                            Team: Not Assigned Yet
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Card Footer: Metadata and Download/Print Button */}
                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="text-[10px] text-slate-400 font-medium">
                        Reg: #{reg.id.slice(-6)} • {new Date(reg.createdAt).toLocaleDateString()}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedReg(reg)}
                          className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-bold transition"
                        >
                          View Details
                        </button>

                        <button
                          type="button"
                          onClick={() => printRegistrationSlip(reg, tournament)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95"
                          title="Download PDF or Print Registration Form"
                        >
                          <Download size={13} />
                          <span>PDF / Slip</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Bottom Summary */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="font-bold text-slate-700">
            Showing {filteredList.length} of {registrations.length} Players
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            Close
          </button>
        </div>
      </div>

      {/* Single Player Detail Sub-Modal */}
      {selectedReg && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[110] p-3 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl relative space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 border overflow-hidden flex items-center justify-center shrink-0">
                  {selectedReg.imageUrl ? (
                    <img src={selectedReg.imageUrl} alt={selectedReg.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-black text-slate-400">{selectedReg.name[0]}</span>
                  )}
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900">{selectedReg.name}</h3>
                  <p className="text-xs font-bold text-emerald-600">{selectedReg.role}</p>
                  <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    selectedReg.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {selectedReg.status}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedReg(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Father's Name:</span>
                <span className="font-bold text-slate-800">{selectedReg.fatherName || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Mother's Name:</span>
                <span className="font-bold text-slate-800">{selectedReg.motherName || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Blood Group:</span>
                <span className="font-bold text-rose-600">{selectedReg.bloodGroup || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Jersey Number:</span>
                <span className="font-bold text-blue-700">{selectedReg.jerseyNumber ? `#${selectedReg.jerseyNumber}` : '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Jersey Size:</span>
                <span className="font-bold text-blue-700">{selectedReg.jerseySize || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Assigned Team:</span>
                <span className="font-bold text-emerald-700">{selectedReg.assignedTeamName || 'Not Assigned Yet'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Address:</span>
                <span className="font-bold text-slate-800 text-right">{selectedReg.address || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Fee & Method:</span>
                <span className="font-bold text-slate-800">৳{selectedReg.registrationFee} ({selectedReg.paymentMethod?.toUpperCase()})</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-medium">TrxID:</span>
                <span className="font-mono font-bold text-slate-800">{selectedReg.transactionId || '-'}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedReg(null)}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => printRegistrationSlip(selectedReg, tournament)}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Download size={14} />
                <span>Print / Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
