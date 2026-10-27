import React, { useState } from 'react';
import { Tournament, PlayerRegistration, PaymentMethod } from '../types';
import { savePlayerRegistration } from '../services/storageService';
import { uploadImageToCloudinary } from '../services/cloudinaryService';
import { 
  X, 
  Upload, 
  CheckCircle2, 
  Loader2, 
  CreditCard, 
  Smartphone, 
  Banknote, 
  User, 
  Phone, 
  MapPin, 
  Heart, 
  ShieldAlert, 
  ArrowRight,
  ArrowLeft,
  Camera,
  Copy,
  Check,
  FileText,
  AlertCircle,
  HelpCircle,
  CheckSquare,
  Square
} from 'lucide-react';

interface PlayerRegistrationModalProps {
  tournament: Tournament;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const JERSEY_SIZES = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

export const PlayerRegistrationModal: React.FC<PlayerRegistrationModalProps> = ({
  tournament,
  isOpen,
  onClose,
  onSuccess
}) => {
  // Steps: 1: Rules & ToS -> 2: Form Details -> 3: Payment -> 4: Success
  const [step, setStep] = useState<'rules' | 'form' | 'payment' | 'success'>('rules');

  // Rules agreement state
  const [agreedToRules, setAgreedToRules] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [role, setRole] = useState<'Batsman' | 'Bowler' | 'All-Rounder' | 'WicketKeeper' | ''>('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [jerseySize, setJerseySize] = useState('');
  const [address, setAddress] = useState('');
  
  // Image states
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bkash');
  const [senderNumber, setSenderNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  
  // Submitting states
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);

      setUploadingImage(true);
      setUploadProgress(10);
      try {
        const uploadedUrl = await uploadImageToCloudinary(file, (pct) => {
          setUploadProgress(pct);
        });
        setImageUrl(uploadedUrl);
      } catch (err: any) {
        console.error("Cloudinary upload error:", err);
        setImageUrl(previewUrl);
      } finally {
        setUploadingImage(false);
      }
    }
  };

  const handleProceedToForm = () => {
    setErrorMessage('');
    if (!agreedToRules) {
      setErrorMessage('শর্তাবলী মেনে নিয়ে টিকচিহ্ন প্রদান করুন।');
      return;
    }
    setStep('form');
  };

  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('Please enter player name.');
      return;
    }
    if (!fatherName.trim() || !motherName.trim()) {
      setErrorMessage('Please enter Father and Mother names.');
      return;
    }
    if (!whatsappNumber.trim()) {
      setErrorMessage('Please enter WhatsApp number.');
      return;
    }
    if (!bloodGroup) {
      setErrorMessage('Please select Blood Group (রক্তের গ্রুপ নির্বাচন করুন)।');
      return;
    }
    if (!role) {
      setErrorMessage('Please select Player Role (খেলোয়াড়ের রোল নির্বাচন করুন)।');
      return;
    }
    if (!jerseySize) {
      setErrorMessage('Please select Jersey Size (জার্সি সাইজ নির্বাচন করুন)।');
      return;
    }
    if (!address.trim()) {
      setErrorMessage('Please enter address.');
      return;
    }

    // Auto-select first available payment method if current is not configured
    setStep('payment');
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (paymentMethod !== 'cash') {
      if (!senderNumber.trim()) {
        setErrorMessage('টাকা পাঠানোর সেন্ডার নম্বর লিখুন।');
        return;
      }
      if (!transactionId.trim()) {
        setErrorMessage('Transaction ID (TrxID) লিখুন।');
        return;
      }
    } else {
      if (!senderNumber.trim()) {
        setErrorMessage('আপনার যোগাযোগের ফোন নম্বর দিন।');
        return;
      }
    }

    setSubmitting(true);
    try {
      const registrationData: PlayerRegistration = {
        id: 'reg_' + Date.now().toString() + Math.random().toString().slice(2, 6),
        tournamentId: tournament.id,
        name: name.trim(),
        fatherName: fatherName.trim(),
        motherName: motherName.trim(),
        whatsappNumber: whatsappNumber.trim(),
        role: role as PlayerRegistration['role'],
        bloodGroup,
        jerseyNumber: jerseyNumber.trim() || undefined,
        jerseySize: jerseySize || undefined,
        address: address.trim(),
        imageUrl: imageUrl || imagePreview || '',
        registrationFee: tournament.registrationFee || 0,
        paymentMethod,
        senderNumber: senderNumber.trim(),
        transactionId: paymentMethod === 'cash' ? (transactionId.trim() || 'CASH_PAYMENT') : transactionId.trim(),
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await savePlayerRegistration(registrationData);
      setStep('success');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error("Registration submit error:", err);
      setErrorMessage(err.message || 'Failed to submit registration. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setStep('rules');
    setAgreedToRules(false);
    setName('');
    setFatherName('');
    setMotherName('');
    setWhatsappNumber('');
    setRole('');
    setBloodGroup('');
    setJerseyNumber('');
    setJerseySize('');
    setAddress('');
    setImageFile(null);
    setImagePreview('');
    setImageUrl('');
    setSenderNumber('');
    setTransactionId('');
    setErrorMessage('');
    onClose();
  };

  // Determine enabled payment methods
  const paymentInfo = tournament.paymentInfo || {};
  const hasBkash = !!paymentInfo.bkashNumber || paymentInfo.enabledMethods?.includes('bkash');
  const hasNagad = !!paymentInfo.nagadNumber || paymentInfo.enabledMethods?.includes('nagad');
  const hasRocket = !!paymentInfo.rocketNumber || paymentInfo.enabledMethods?.includes('rocket');
  const hasCash = !!paymentInfo.cashCollectorPhone || !!paymentInfo.cashCollectorName || paymentInfo.enabledMethods?.includes('cash');

  // Fallback: If admin hasn't configured anything, allow default methods
  const isAnyConfigured = hasBkash || hasNagad || hasRocket || hasCash;
  const showBkash = !isAnyConfigured || hasBkash;
  const showNagad = !isAnyConfigured || hasNagad;
  const showRocket = hasRocket;
  const showCash = !isAnyConfigured || hasCash;

  // Rules text parsing
  const defaultRules = [
    "১. টুর্নামেন্ট পরিচালনা কমিটির যেকোনো সিদ্ধান্ত চূড়ান্ত ও বাধ্যতামূলক বলে গণ্য হবে।",
    "২. নির্ধারিত রেজিস্ট্রেশন ফি সফলভাবে পরিশোধ করার পরই আবেদন চূড়ান্তভাবে বিবেচনা করা হবে।",
    "৩. সকল খেলোয়াড়কে টুর্নামেন্টের সার্বিক নিয়মশৃঙ্খলা ও স্পোর্টসম্যানশিপ বজায় রাখতে হবে।",
    "৪. মাঠে আম্পায়ারের দেওয়া সিদ্ধান্তই চূড়ান্ত। কোনো রূপ অসদাচরণ গ্রহণযোগ্য নয়।",
    "৫. আবেদন ফর্মে ভুল বা অসত্য তথ্য প্রদান করলে রেজিস্ট্রেশন সরাসরি বাতিল করা হতে পারে।"
  ];

  const rulesList = tournament.rules?.trim() 
    ? tournament.rules.split('\n').filter(line => line.trim().length > 0)
    : defaultRules;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100 my-8">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-emerald-950 p-6 text-white relative">
          <button 
            onClick={handleResetAndClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X size={20} />
          </button>
          
          <div className="pr-10">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300 bg-emerald-900/80 px-2.5 py-1 rounded-full">
              Player Registration
            </span>
            <h2 className="text-xl sm:text-2xl font-black mt-2 tracking-tight">
              {tournament.name}
            </h2>
            <p className="text-xs text-emerald-200 mt-1">
              Registration Fee: <span className="font-bold text-yellow-300">৳{tournament.registrationFee ?? 0}</span>
            </p>
          </div>

          {/* Stepper indicator */}
          <div className="flex items-center gap-1.5 sm:gap-2 mt-4 text-[11px] sm:text-xs font-bold overflow-x-auto no-scrollbar">
            <div className={`flex items-center gap-1 px-3 py-1 rounded-full whitespace-nowrap ${step === 'rules' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-white/20 text-emerald-200'}`}>
              <span>1</span> শর্তাবলী (ToS)
            </div>
            <div className={`flex items-center gap-1 px-3 py-1 rounded-full whitespace-nowrap ${step === 'form' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-white/20 text-emerald-200'}`}>
              <span>2</span> তথ্য ফরম
            </div>
            <div className={`flex items-center gap-1 px-3 py-1 rounded-full whitespace-nowrap ${step === 'payment' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-white/20 text-emerald-200'}`}>
              <span>3</span> পেমেন্ট
            </div>
            <div className={`flex items-center gap-1 px-3 py-1 rounded-full whitespace-nowrap ${step === 'success' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-white/20 text-emerald-200'}`}>
              <span>4</span> সম্পন্ন
            </div>
          </div>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="p-4 mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ================= STEP 1: RULES / TOS ================= */}
        {step === 'rules' && (
          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center gap-2 text-emerald-800 border-b pb-3">
              <FileText size={20} className="text-emerald-600" />
              <h3 className="font-black text-sm uppercase tracking-wider text-slate-800">
                টুর্নামেন্টের নিয়মাবলী ও শর্তসমূহ (Rules & ToS)
              </h3>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                রেজিস্ট্রেশন করার পূর্বে নিচের শর্তগুলো মনোযোগ দিয়ে পড়ুন:
              </p>
              
              <div className="space-y-2.5 text-xs sm:text-sm text-slate-700 leading-relaxed">
                {rulesList.map((rule, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="flex-1">{rule}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Agreement Checkbox */}
            <div 
              onClick={() => setAgreedToRules(!agreedToRules)}
              className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3 ${
                agreedToRules 
                  ? 'border-emerald-500 bg-emerald-50/60 text-emerald-900' 
                  : 'border-slate-200 hover:border-slate-300 text-slate-600'
              }`}
            >
              <div className="shrink-0">
                {agreedToRules ? (
                  <CheckSquare size={22} className="text-emerald-600" />
                ) : (
                  <Square size={22} className="text-slate-400" />
                )}
              </div>
              <span className="text-xs sm:text-sm font-bold select-none">
                আমি টুর্নামেন্টের সমস্ত নিয়ম ও শর্তাবলী পড়েছি এবং এতে পূর্ণ সম্মতি জানাচ্ছি।
              </span>
            </div>

            <div className="pt-2 border-t flex justify-end gap-2">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-5 py-2.5 rounded-xl text-slate-600 font-semibold hover:bg-slate-100 text-sm"
              >
                বাতিল করুন
              </button>
              <button
                type="button"
                onClick={handleProceedToForm}
                disabled={!agreedToRules}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md flex items-center gap-2 transition-all"
              >
                <span>সম্মত ও পরবর্তী ধাপ</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2: FORM INPUTS ================= */}
        {step === 'form' && (
          <form onSubmit={handleProceedToPayment} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Image Upload with Cloudinary Preview */}
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
              <div className="relative w-24 h-24 rounded-2xl bg-white border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shrink-0 shadow-sm group">
                {imagePreview ? (
                  <img src={imagePreview} alt="Player Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <Camera size={26} />
                    <span className="text-[9px] mt-1 font-bold">Photo</span>
                  </div>
                )}
                {uploadingImage && (
                  <div className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center text-white text-[10px]">
                    <Loader2 size={18} className="animate-spin mb-1 text-emerald-400" />
                    <span>{uploadProgress}%</span>
                  </div>
                )}
              </div>

              <div className="flex-1 text-center sm:text-left">
                <label className="text-xs font-bold text-slate-700 block mb-1">Player Photo</label>
                <p className="text-[11px] text-slate-400 mb-2">Upload a clear photo for your player profile badge.</p>
                <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer shadow-sm transition">
                  <Upload size={14} className="text-emerald-600" />
                  <span>Choose Photo</span>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Player Name <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Full Name (e.g. Shakib Al Hasan)"
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            {/* Father & Mother Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Father Name <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  required
                  value={fatherName}
                  onChange={e => setFatherName(e.target.value)}
                  placeholder="Father's Full Name"
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Mother Name <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  required
                  value={motherName}
                  onChange={e => setMotherName(e.target.value)}
                  placeholder="Mother's Full Name"
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            {/* WhatsApp Number & Blood Group */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  WhatsApp Number <span className="text-red-500">*</span>
                </label>
                <input 
                  type="tel" 
                  required
                  value={whatsappNumber}
                  onChange={e => setWhatsappNumber(e.target.value)}
                  placeholder="017xxxxxxxx"
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Blood Group <span className="text-red-500">*</span>
                </label>
                <select 
                  required
                  value={bloodGroup}
                  onChange={e => setBloodGroup(e.target.value)}
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white font-semibold ${
                    !bloodGroup ? 'text-slate-400 border-slate-300' : 'text-slate-800 border-slate-300'
                  }`}
                >
                  <option value="" disabled>-- Select Blood Group --</option>
                  {BLOOD_GROUPS.map(bg => (
                    <option key={bg} value={bg} className="text-slate-800">{bg}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                Player Role <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'Batsman', label: 'Batsman' },
                  { id: 'Bowler', label: 'Bowler' },
                  { id: 'WicketKeeper', label: 'Wicket Keeper' },
                  { id: 'All-Rounder', label: 'Allrounder' }
                ].map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id as any)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                      role === r.id 
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Jersey Number & Jersey Size */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Jersey Number (জার্সি নম্বর)
                </label>
                <input 
                  type="text" 
                  value={jerseyNumber}
                  onChange={e => setJerseyNumber(e.target.value)}
                  placeholder="e.g. 7, 10, 18, 75"
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Jersey Size (জার্সি সাইজ) <span className="text-red-500">*</span>
                </label>
                <select 
                  required
                  value={jerseySize}
                  onChange={e => setJerseySize(e.target.value)}
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white font-semibold ${
                    !jerseySize ? 'text-slate-400 border-slate-300' : 'text-slate-800 border-slate-300'
                  }`}
                >
                  <option value="" disabled>-- Select Jersey Size --</option>
                  {JERSEY_SIZES.map(sz => (
                    <option key={sz} value={sz} className="text-slate-800">{sz}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Address <span className="text-red-500">*</span>
              </label>
              <textarea 
                required
                rows={2}
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Village/Road, Thana, District"
                className="w-full border border-slate-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
              />
            </div>

            <div className="pt-3 border-t flex justify-between gap-2">
              <button
                type="button"
                onClick={() => setStep('rules')}
                className="px-5 py-2.5 rounded-xl text-slate-600 font-semibold hover:bg-slate-100 text-sm flex items-center gap-1.5"
              >
                <ArrowLeft size={16} />
                <span>শর্তাবলীতে ফিরুন</span>
              </button>
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md flex items-center gap-2"
              >
                <span>পরবর্তী: পেমেন্ট</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        )}

        {/* ================= STEP 3: PAYMENT ================= */}
        {step === 'payment' && (
          <form onSubmit={handleFinalSubmit} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Amount Box */}
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-800 font-medium">Tournament Registration Fee</p>
                <p className="text-2xl font-black text-emerald-700">৳{tournament.registrationFee ?? 0}</p>
              </div>
              <div className="bg-emerald-600 text-white p-2.5 rounded-xl">
                <Banknote size={24} />
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Select Payment Method <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {showBkash && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('bkash')}
                    className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                      paymentMethod === 'bkash'
                        ? 'border-pink-500 bg-pink-50/80 text-pink-700 ring-2 ring-pink-500 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-black text-xs">
                      bK
                    </div>
                    <span className="font-bold text-xs">bKash</span>
                  </button>
                )}

                {showNagad && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('nagad')}
                    className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                      paymentMethod === 'nagad'
                        ? 'border-orange-500 bg-orange-50/80 text-orange-700 ring-2 ring-orange-500 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-black text-xs">
                      N
                    </div>
                    <span className="font-bold text-xs">Nagad</span>
                  </button>
                )}

                {showRocket && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('rocket')}
                    className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                      paymentMethod === 'rocket'
                        ? 'border-purple-500 bg-purple-50/80 text-purple-700 ring-2 ring-purple-500 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-black text-xs">
                      R
                    </div>
                    <span className="font-bold text-xs">Rocket</span>
                  </button>
                )}

                {showCash && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                      paymentMethod === 'cash'
                        ? 'border-emerald-500 bg-emerald-50/80 text-emerald-700 ring-2 ring-emerald-500 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-black text-xs">
                      ৳
                    </div>
                    <span className="font-bold text-xs">Cash</span>
                  </button>
                )}
              </div>
            </div>

            {/* DYNAMIC PAYMENT INSTRUCTIONS BOX */}
            <div className="space-y-3">
              {/* BKASH */}
              {paymentMethod === 'bkash' && (
                <div className="bg-pink-50/70 border border-pink-200 p-4 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-pink-700 uppercase tracking-wider">
                      bKash Number ({paymentInfo.bkashType || 'Personal'})
                    </span>
                    {paymentInfo.bkashNumber && (
                      <button
                        type="button"
                        onClick={() => handleCopy(paymentInfo.bkashNumber!, 'bkash')}
                        className="text-xs font-bold text-pink-600 hover:text-pink-800 flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-pink-200 shadow-xs"
                      >
                        {copiedKey === 'bkash' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        <span>{copiedKey === 'bkash' ? 'Copied!' : 'Copy'}</span>
                      </button>
                    )}
                  </div>
                  <div className="text-lg font-black text-pink-900 font-mono tracking-wider">
                    {paymentInfo.bkashNumber || 'নম্বর অ্যাডমিন কর্তৃক সেট করা হয়নি'}
                  </div>
                  <p className="text-xs text-pink-900/80 leading-relaxed">
                    বিকাশের মাধ্যমে টুর্নামেন্ট ফি <b>৳{tournament.registrationFee ?? 0}</b> Send Money করুন। টাকা সফলভাবে পাঠানোর পর যে নম্বর থেকে পাঠিয়েছেন এবং ফিরতি মেসেজের <b>TrxID</b> নিচে লিখুন।
                  </p>
                </div>
              )}

              {/* NAGAD */}
              {paymentMethod === 'nagad' && (
                <div className="bg-orange-50/70 border border-orange-200 p-4 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-orange-700 uppercase tracking-wider">
                      Nagad Number ({paymentInfo.nagadType || 'Personal'})
                    </span>
                    {paymentInfo.nagadNumber && (
                      <button
                        type="button"
                        onClick={() => handleCopy(paymentInfo.nagadNumber!, 'nagad')}
                        className="text-xs font-bold text-orange-600 hover:text-orange-800 flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-orange-200 shadow-xs"
                      >
                        {copiedKey === 'nagad' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        <span>{copiedKey === 'nagad' ? 'Copied!' : 'Copy'}</span>
                      </button>
                    )}
                  </div>
                  <div className="text-lg font-black text-orange-900 font-mono tracking-wider">
                    {paymentInfo.nagadNumber || 'নম্বর অ্যাডমিন কর্তৃক সেট করা হয়নি'}
                  </div>
                  <p className="text-xs text-orange-900/80 leading-relaxed">
                    নগদ একাউন্ট থেকে <b>৳{tournament.registrationFee ?? 0}</b> Send Money করুন। টাকা পাঠানো সম্পন্ন হলে সেন্ডার নম্বর ও মেসেজে প্রাপ্ত <b>TrxID</b> প্রদান করুন।
                  </p>
                </div>
              )}

              {/* ROCKET */}
              {paymentMethod === 'rocket' && (
                <div className="bg-purple-50/70 border border-purple-200 p-4 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">
                      Rocket Number ({paymentInfo.rocketType || 'Personal'})
                    </span>
                    {paymentInfo.rocketNumber && (
                      <button
                        type="button"
                        onClick={() => handleCopy(paymentInfo.rocketNumber!, 'rocket')}
                        className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-purple-200 shadow-xs"
                      >
                        {copiedKey === 'rocket' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        <span>{copiedKey === 'rocket' ? 'Copied!' : 'Copy'}</span>
                      </button>
                    )}
                  </div>
                  <div className="text-lg font-black text-purple-900 font-mono tracking-wider">
                    {paymentInfo.rocketNumber || 'নম্বর অ্যাডমিন কর্তৃক সেট করা হয়নি'}
                  </div>
                  <p className="text-xs text-purple-900/80 leading-relaxed">
                    রকেট একাউন্ট থেকে <b>৳{tournament.registrationFee ?? 0}</b> Send Money করুন। টাকা পাঠানো শেষে সেন্ডার নম্বর ও <b>TrxID</b> দিন।
                  </p>
                </div>
              )}

              {/* CASH - ALWAYS STANDARD FORMAT WITH COLLECTOR INFO */}
              {paymentMethod === 'cash' && (
                <div className="bg-emerald-50/80 border border-emerald-200 p-4 rounded-2xl space-y-3">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                    সরাসরি ক্যাশ পেমেন্ট তথ্য (Cash on Hand)
                  </span>
                  
                  <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-xs space-y-2 text-xs sm:text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">টাকা জমার দায়িত্বপ্রাপ্ত ব্যক্তি:</span>
                      <span className="font-bold text-slate-800">
                        {paymentInfo.cashCollectorName || 'টুর্নামেন্ট পরিচালনা কমিটি'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <span className="text-slate-500">যোগাযোগের মোবাইল নম্বর:</span>
                      <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                        <span>{paymentInfo.cashCollectorPhone || 'কমিটির সাথে যোগাযোগ করুন'}</span>
                        {paymentInfo.cashCollectorPhone && (
                          <button
                            type="button"
                            onClick={() => handleCopy(paymentInfo.cashCollectorPhone!, 'cashPhone')}
                            className="text-[10px] text-slate-500 hover:text-slate-800 p-1 bg-slate-100 rounded"
                            title="Copy Phone"
                          >
                            {copiedKey === 'cashPhone' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-emerald-900/80 leading-relaxed">
                    রেজিস্ট্রেশন ফি <b>৳{tournament.registrationFee ?? 0}</b> সরাসরি উপরোক্ত দায়িত্বপ্রাপ্ত ব্যক্তির কাছে জমা দিন। নিচে আপনার যোগাযোগের মোবাইল নম্বর দিয়ে কনফার্ম করুন। অ্যাডমিন টাকা বুঝে পেয়ে আপনার রেজিস্ট্রেশন অনুমোদন করবেন।
                  </p>
                </div>
              )}

              {/* Extra instructions from Admin if set */}
              {paymentInfo.instructions && (
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs text-slate-600 flex items-start gap-2">
                  <HelpCircle size={15} className="text-slate-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{paymentInfo.instructions}</span>
                </div>
              )}
            </div>

            {/* Inputs based on Payment Method */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  {paymentMethod === 'cash' ? 'আপনার যোগাযোগের ফোন নম্বর' : 'যে নম্বর থেকে টাকা পাঠিয়েছেন (Sender Number)'} <span className="text-red-500">*</span>
                </label>
                <input 
                  type="tel"
                  required
                  value={senderNumber}
                  onChange={e => setSenderNumber(e.target.value)}
                  placeholder={paymentMethod === 'cash' ? '017xxxxxxxx' : '01xxxxxxxxx (Sender Number)'}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {paymentMethod !== 'cash' ? (
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Transaction ID (TrxID) <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text"
                    required
                    value={transactionId}
                    onChange={e => setTransactionId(e.target.value)}
                    placeholder="e.g. 9J82KLMN10"
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-mono uppercase focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">টাকা পাঠানোর পর বিকাশ/নগদ/রকেটের ফিরতি এসএমএস থেকে TrxID কপি করে দিন।</p>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    ক্যাশ জমা সংক্রান্ত নোট বা রেফারেন্স (ঐচ্ছিক)
                  </label>
                  <input 
                    type="text"
                    value={transactionId}
                    onChange={e => setTransactionId(e.target.value)}
                    placeholder="e.g. জমা নিয়েছি অমুকের কাছে / মাঠের সাইডে ক্যাশ দেওয়া হয়েছে"
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              )}
            </div>

            <div className="pt-3 border-t flex justify-between gap-2">
              <button
                type="button"
                onClick={() => setStep('form')}
                className="px-5 py-2.5 rounded-xl text-slate-600 font-semibold hover:bg-slate-100 text-sm flex items-center gap-1.5"
              >
                <ArrowLeft size={16} />
                <span>ফর্মে ফিরুন</span>
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md flex items-center gap-2 disabled:opacity-50 transition-all"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>জমা হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <span>সাবমিট রেজিস্ট্রেশন</span>
                    <CheckCircle2 size={16} />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ================= STEP 4: SUCCESS ================= */}
        {step === 'success' && (
          <div className="p-8 text-center space-y-5 animate-fade-in">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 size={36} />
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900">
                রেজিস্ট্রেশন সফলভাবে জমা হয়েছে!
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                ধন্যবাদ <b>{name}</b>, আপনার আবেদনটি গ্রহণ করা হয়েছে। টুর্নামেন্ট কমিটি পেমেন্ট ও তথ্য যাচাই করে খুব শীঘ্রই অনুমোদন করবেন।
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-xs space-y-2 max-w-sm mx-auto">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Player:</span>
                <span className="font-bold text-slate-800">{name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Role:</span>
                <span className="font-bold text-slate-800">{role}</span>
              </div>
              {jerseyNumber && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Jersey:</span>
                  <span className="font-bold text-slate-800">#{jerseyNumber} ({jerseySize})</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Fee Amount:</span>
                <span className="font-bold text-emerald-600">৳{tournament.registrationFee ?? 0}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Payment:</span>
                <span className="font-bold uppercase text-slate-800">{paymentMethod}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Contact / Sender:</span>
                <span className="font-bold text-slate-800">{senderNumber}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetAndClose}
              className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-md"
            >
              ঠিক আছে
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
