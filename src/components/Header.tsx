import React from 'react';
import { CdfLogo } from './CdfLogo';
import { NetworkBadge } from './NetworkBadge';
import { useTheme } from '../hooks/useTheme';
import { useWallet } from '../wallet';
import { useNotifications } from '../notifications';
import { getTranslations } from '../config/i18n';
import { QrCode, Sun, Moon, Settings, ShieldCheck, Bell } from 'lucide-react';

interface HeaderProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentRoute, onNavigate }) => {
  const { theme, toggleTheme } = useTheme();
  const { settings } = useWallet();
  const { unreadNotificationsCount } = useNotifications();
  const t = getTranslations(settings?.language).header;

  return (
    <header className="sticky top-0 z-30 w-full bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        {/* Logo CDF Wallet */}
        <div
          onClick={() => onNavigate('/')}
          className="cursor-pointer"
        >
          <CdfLogo size="md" />
        </div>

        {/* Action controls on right */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Network Selector (BSC Mainnet / Testnet) */}
          <NetworkBadge />

          {/* Quick Scan QR button */}
          <button
            id="header-qr-scan-btn"
            type="button"
            onClick={() => onNavigate('/scan')}
            title={t.scanQr}
            className={`p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
              currentRoute === '/scan' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : ''
            }`}
          >
            <QrCode className="w-4 h-4" />
          </button>

          {/* Security shortcut */}
          <button
            id="header-security-btn"
            type="button"
            onClick={() => onNavigate('/security')}
            title={t.securityAudit}
            className={`p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer hidden sm:flex ${
              currentRoute === '/security' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : ''
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
          </button>

          {/* Theme switcher */}
          <button
            id="header-theme-toggle-btn"
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? t.themeLight : t.themeDark}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* Notifications shortcut button with unread counter */}
          <button
            id="header-notifications-btn"
            type="button"
            onClick={() => onNavigate('/notifications')}
            title={t.notifications}
            className={`relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
              currentRoute === '/notifications' ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400' : ''
            }`}
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span
                id="header-unread-badge"
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm"
              >
                {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Settings shortcut button */}
          <button
            id="header-settings-btn"
            type="button"
            onClick={() => onNavigate('/settings')}
            title={t.settings}
            className={`p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
              currentRoute === '/settings' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : ''
            }`}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
