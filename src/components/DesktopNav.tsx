import React from 'react';
import { useWallet } from '../wallet';
import { useNotifications } from '../notifications';
import { getTranslations } from '../config/i18n';
import {
  Home,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  QrCode,
  History,
  Compass,
  ShieldCheck,
  Settings,
  Bell,
  Info,
  Sparkles,
} from 'lucide-react';

interface DesktopNavProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
}

export const DesktopNav: React.FC<DesktopNavProps> = ({ currentRoute, onNavigate }) => {
  const { settings } = useWallet();
  const { unreadNotificationsCount } = useNotifications();
  const t = getTranslations(settings?.language).nav;

  const routes = [
    { route: '/', label: t.home, icon: Home },
    { route: '/wallet', label: t.wallet, icon: Wallet },
    { route: '/my-qr', label: 'Mes QR', icon: QrCode },
    { route: '/send', label: t.send, icon: ArrowUpRight },
    { route: '/receive', label: t.receive, icon: ArrowDownLeft },
    { route: '/swap', label: t.swap, icon: RefreshCw },
    { route: '/scan', label: t.scan, icon: QrCode },
    { route: '/activity', label: t.activity, icon: History },
    { route: '/notifications', label: t.notifications, icon: Bell, badge: unreadNotificationsCount },
    { route: '/dapps', label: t.dapps, icon: Compass },
    { route: '/security', label: t.security, icon: ShieldCheck },
    { route: '/settings', label: t.settings, icon: Settings },
    { route: '/about', label: t.about, icon: Info },
    { route: '/onboarding', label: t.onboarding, icon: Sparkles },
  ];

  return (
    <div className="hidden md:flex items-center gap-1 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 px-4 py-1.5 overflow-x-auto scrollbar-none">
      <div className="max-w-5xl mx-auto w-full flex items-center gap-1">
        {routes.map((item) => {
          const Icon = item.icon;
          const isActive = currentRoute === item.route;
          return (
            <button
              key={item.route}
              type="button"
              id={`nav-item-${item.route.replace('/', '') || 'home'}`}
              onClick={() => onNavigate(item.route)}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
              {typeof item.badge === 'number' && item.badge > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

