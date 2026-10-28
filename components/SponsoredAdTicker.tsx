import React, { useState, useEffect } from 'react';
import { SponsoredAdsConfig, SponsoredAdItem } from '../types';
import { Megaphone, ExternalLink, Sparkles, Info } from 'lucide-react';

interface SponsoredAdTickerProps {
  config?: SponsoredAdsConfig;
}

export const SponsoredAdTicker: React.FC<SponsoredAdTickerProps> = ({ config }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedLoops, setCompletedLoops] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [hasFinished, setHasFinished] = useState(false);

  // If real-time admin updates config (new ads, updated count, etc.), re-sync instantly
  useEffect(() => {
    setHasFinished(false);
    if (currentIndex >= (config?.items?.length || 1)) {
      setCurrentIndex(0);
    }
  }, [config?.items, config?.repeatCount, config?.enabled]);

  // If disabled or no items
  if (!config || config.enabled === false || !config.items || config.items.length === 0) {
    return null;
  }

  const items = config.items;
  const speedSeconds = Number(config.speedSeconds) > 0 ? Number(config.speedSeconds) : 15;
  const maxLoops = Number(config.repeatCount) > 0 ? Number(config.repeatCount) : 0;

  if (hasFinished) {
    return null;
  }

  const currentItem: SponsoredAdItem = items[currentIndex] || items[0];
  const badgeLabel = (currentItem.badgeText && currentItem.badgeText.trim()) || config.defaultBadgeText || 'SPONSOR';

  // Determine badge styling and icon according to badge text (Sponsor vs Info vs Notice)
  const getBadgeStyle = (label: string) => {
    const lower = label.toLowerCase();
    if (lower.includes('notice') || lower.includes('ঘোষণা') || lower.includes('alert') || lower.includes('জরুরী')) {
      return {
        bg: 'bg-gradient-to-r from-rose-500 to-red-600 text-white',
        counterBg: 'bg-black/20 text-white',
        icon: <Megaphone className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-white shrink-0 animate-pulse" />
      };
    }
    if (lower.includes('info') || lower.includes('তথ্য') || lower.includes('ট্যুরনামেন্ট')) {
      return {
        bg: 'bg-gradient-to-r from-sky-400 to-blue-500 text-slate-950',
        counterBg: 'bg-slate-950/20 text-slate-950',
        icon: <Info className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-slate-950 shrink-0" />
      };
    }
    if (lower.includes('update') || lower.includes('আপডেট')) {
      return {
        bg: 'bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950',
        counterBg: 'bg-slate-950/20 text-slate-950',
        icon: <Sparkles className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-slate-950 shrink-0" />
      };
    }
    // Default Sponsor Style
    return {
      bg: 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950',
      counterBg: 'bg-slate-950/20 text-slate-950',
      icon: <Sparkles className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-slate-950 animate-pulse shrink-0" />
    };
  };

  const badgeStyle = getBadgeStyle(badgeLabel);

  const handleAnimationEnd = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= items.length) {
      // Completed one full round of all ads
      const newLoopCount = completedLoops + 1;
      setCompletedLoops(newLoopCount);
      if (maxLoops > 0 && newLoopCount >= maxLoops) {
        setHasFinished(true);
        return;
      }
      setCurrentIndex(0);
    } else {
      setCurrentIndex(nextIndex);
    }
  };

  return (
    <div 
      className="mb-4 sm:mb-6 rounded-xl sm:rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-amber-500/40 text-white shadow-lg overflow-hidden relative flex items-center p-1.5 sm:p-2.5 group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <style>{`
        @keyframes sponsorMarquee {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
      `}</style>

      {/* Left Badge: Configurable Button/Tag (Compact on Mobile to leave max room for running text) */}
      <div className={`z-10 shrink-0 ${badgeStyle.bg} font-black text-[9px] sm:text-xs uppercase px-1.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl shadow-md flex items-center gap-1 sm:gap-1.5 mr-1.5 sm:mr-3 select-none transition-all duration-300`}>
        {badgeStyle.icon}
        <span className="tracking-tight sm:tracking-wider max-w-[80px] sm:max-w-none truncate sm:overflow-visible">
          {badgeLabel}
        </span>
        {items.length > 1 && (
          <span className={`hidden sm:inline-block ${badgeStyle.counterBg} px-1.5 py-0.2 rounded text-[9px] font-mono`}>
            {currentIndex + 1}/{items.length}
          </span>
        )}
      </div>

      {/* Running Marquee Track */}
      <div className="flex-1 overflow-hidden relative h-8 sm:h-9 flex items-center">
        <div
          key={`${currentItem?.id || currentIndex}-${completedLoops}-${currentItem?.text}-${speedSeconds}`}
          onAnimationEnd={handleAnimationEnd}
          style={{
            animation: `sponsorMarquee ${speedSeconds}s linear 1`,
            animationPlayState: isPaused ? 'paused' : 'running',
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            position: 'absolute',
            left: 0,
            right: 0,
            width: 'max-content'
          }}
          className="flex items-center gap-3 sm:gap-4 will-change-transform"
        >
          {/* Logo if available */}
          {currentItem.logo && (
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/10 p-0.5 border border-white/20 overflow-hidden shrink-0 shadow-sm flex items-center justify-center">
              <img src={currentItem.logo} alt="Sponsor" className="w-full h-full object-contain" />
            </div>
          )}

          {/* Sponsor Name badge */}
          {currentItem.sponsorName && (
            <span className="bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 px-2 py-0.5 rounded-lg text-xs font-black uppercase tracking-wider">
              {currentItem.sponsorName}
            </span>
          )}

          {/* Ad Text / Content */}
          <span className="text-xs sm:text-sm font-bold text-white tracking-wide">
            {currentItem.text}
          </span>

          {/* Optional Link */}
          {currentItem.link && (
            <a
              href={currentItem.link.startsWith('http') ? currentItem.link : `https://${currentItem.link}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 hover:text-white bg-white/10 px-2 py-0.5 rounded-md transition border border-white/10 ml-1"
            >
              <span>Visit</span>
              <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
