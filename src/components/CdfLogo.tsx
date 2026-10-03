import React from 'react';

interface CdfLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export const CdfLogo: React.FC<CdfLogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
}) => {
  const sizeMap = {
    sm: { icon: 'w-7 h-7', text: 'text-base' },
    md: { icon: 'w-9 h-9', text: 'text-xl' },
    lg: { icon: 'w-12 h-12', text: 'text-2xl' },
    xl: { icon: 'w-16 h-16', text: 'text-3xl' },
  };

  const { icon, text } = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <div
        className={`relative ${icon} rounded-xl bg-gradient-to-tr from-slate-950 via-slate-900 to-amber-950 p-0.5 shadow-md shadow-amber-950/20 ring-1 ring-amber-500/30 flex items-center justify-center`}
      >
        {/* Geometric Shield & Golden Monogram */}
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full p-1"
        >
          {/* Hexagonal Shield Background */}
          <polygon
            points="20,4 34,11 34,27 20,36 6,27 6,11"
            fill="url(#goldGradient)"
            opacity="0.15"
          />
          {/* Shield Outline */}
          <polygon
            points="20,4 34,11 34,27 20,36 6,27 6,11"
            stroke="url(#goldGradient)"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          {/* Diamond Central Core */}
          <polygon
            points="20,12 27,20 20,28 13,20"
            fill="url(#goldGradient)"
            opacity="0.9"
          />
          {/* Inner Light Sparkle */}
          <circle cx="20" cy="20" r="2" fill="#ffffff" />
          
          <defs>
            <linearGradient id="goldGradient" x1="6" y1="4" x2="34" y2="36" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F59E0B" />
              <stop offset="0.5" stopColor="#FBBF24" />
              <stop offset="1" stopColor="#D97706" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1">
            <span className={`font-extrabold tracking-tight text-slate-900 dark:text-white ${text}`}>
              CDF
            </span>
            <span className={`font-semibold tracking-tight text-amber-600 dark:text-amber-400 ${text}`}>
              Wallet
            </span>
          </div>
          <span className="text-[10px] tracking-widest uppercase font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Non-Custodial
          </span>
        </div>
      )}
    </div>
  );
};
