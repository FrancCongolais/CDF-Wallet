/**
 * CDF Wallet — Application Principale
 * 
 * Portefeuille crypto non-custodial moderne, sobre et modulaire pour :
 * - BNB Smart Chain
 * - BNB
 * - CDF — Franc Congolais (Contrat : 0x18e173fdeb700568a08d1d7049309ae322d27777)
 * - USDT
 */

import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './hooks/useTheme';
import { WalletProvider } from './wallet';
import { NotificationProvider } from './notifications';
import { MainLayout } from './layouts/MainLayout';

// Pages
import { HomePage } from './pages/HomePage';
import { WalletPage } from './pages/WalletPage';
import { SendPage } from './pages/SendPage';
import { ReceivePage } from './pages/ReceivePage';
import { ScanPage } from './pages/ScanPage';
import { ActivityPage } from './pages/ActivityPage';
import { SwapPage } from './pages/SwapPage';
import { DappsPage } from './pages/DappsPage';
import { SettingsPage } from './pages/SettingsPage';
import { SecurityPage } from './pages/SecurityPage';
import { AboutPage } from './pages/AboutPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { MerchantQrPage } from './pages/MerchantQrPage';

// Test runner modal
import { TestRunnerModal } from './components/TestRunnerModal';
import { CheckCircle2, ShieldCheck } from 'lucide-react';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashRoute = window.location.hash.replace('#', '');
      if (hashRoute.startsWith('/')) return hashRoute;
    }
    return '/';
  });

  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  useEffect(() => {
    const handleHashChange = () => {
      const hashRoute = window.location.hash.replace('#', '');
      if (hashRoute.startsWith('/')) {
        setCurrentRoute(hashRoute);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavigate = (route: string) => {
    setCurrentRoute(route);
    if (typeof window !== 'undefined') {
      window.location.hash = route;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const renderPage = () => {
    switch (currentRoute) {
      case '/':
        return <HomePage onNavigate={handleNavigate} />;
      case '/wallet':
        return <WalletPage onNavigate={handleNavigate} />;
      case '/send':
        return <SendPage onNavigate={handleNavigate} />;
      case '/receive':
        return <ReceivePage onNavigate={handleNavigate} />;
      case '/scan':
        return <ScanPage onNavigate={handleNavigate} />;
      case '/activity':
        return <ActivityPage />;
      case '/my-qr':
        return <MerchantQrPage onNavigate={handleNavigate} />;
      case '/swap':
        return <SwapPage />;
      case '/dapps':
        return <DappsPage />;
      case '/settings':
        return <SettingsPage onNavigate={handleNavigate} />;
      case '/security':
        return <SecurityPage onNavigate={handleNavigate} />;
      case '/about':
        return <AboutPage />;
      case '/notifications':
        return <NotificationsPage onNavigate={handleNavigate} />;
      case '/onboarding':
        return <OnboardingPage onNavigate={handleNavigate} />;
      default:
        return <HomePage onNavigate={handleNavigate} />;
    }
  };

  return (
    <ThemeProvider>
      <WalletProvider>
        <NotificationProvider>
          <MainLayout currentRoute={currentRoute} onNavigate={handleNavigate}>
            {renderPage()}

            {/* Bouton d'accès rapide aux Tests d'Intégrité (Étape 1) */}
            <div className="fixed bottom-20 md:bottom-6 right-4 z-40">
              <button
                id="open-integrity-tests-btn"
                type="button"
                onClick={() => setIsTestModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900/90 dark:bg-slate-800/90 hover:bg-slate-900 dark:hover:bg-slate-800 text-white border border-slate-700/80 shadow-lg text-xs font-semibold backdrop-blur-md transition-all cursor-pointer hover:scale-105"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Tests & Intégrité (7/7)</span>
                <span className="sm:hidden">Tests</span>
              </button>
            </div>

            <TestRunnerModal
              isOpen={isTestModalOpen}
              onClose={() => setIsTestModalOpen(false)}
            />
          </MainLayout>
        </NotificationProvider>
      </WalletProvider>
    </ThemeProvider>
  );
}
