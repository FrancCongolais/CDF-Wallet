/**
 * Barre de navigation mobile — CDF Wallet
 * 
 * Spécification Section 3.5 :
 * Navigation principale : Portefeuille, Mes QR, Swap, Historique, Réglages.
 */

import React from 'react';
import { useWallet } from '../wallet';
import { getTranslations } from '../config/i18n';
import { Wallet, QrCode, RefreshCw, History, Settings } from 'lucide-react';

interface BottomNavProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentRoute, onNavigate }) => {
  const { settings } = useWallet();
  const t = getTranslations(settings?.language).nav;

  const navItems = [
    { route: '/', label: 'Portefeuille', icon: Wallet, id: 'nav-wallet' },
    { route: '/my-qr', label: 'Mes QR', icon: QrCode, id: 'nav-my-qr' },
    { route: '/swap', label: 'Swap', icon: RefreshCw, id: 'nav-swap' },
    { route: '/activity', label: 'Historique', icon: History, id: 'nav-activity' },
    { route: '/settings', label: 'Réglages', icon: Settings, id: 'nav-settings' },
  ];

  return (
    <nav
      id="mobile-bottom-navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800/80 py-1.5 px-2 safe-area-pb"
    >
      <div className="grid grid-cols-5 gap-1 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentRoute === item.route || (item.route === '/' && currentRoute === '/wallet');
          return (
            <button
              key={item.route}
              id={item.id}
              type="button"
              onClick={() => onNavigate(item.route)}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'text-amber-600 dark:text-amber-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-500" />
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight truncate max-w-full">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
