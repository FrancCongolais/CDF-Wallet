import React from 'react';
import { Header } from '../components/Header';
import { DemoModeBanner } from '../components/DemoModeBanner';
import { DesktopNav } from '../components/DesktopNav';
import { BottomNav } from '../components/BottomNav';

interface MainLayoutProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  currentRoute,
  onNavigate,
  children,
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased selection:bg-amber-500/20">
      {/* 1. Explicit Demo / Real Status Notification */}
      <DemoModeBanner />

      {/* 2. Top Header Bar */}
      <Header currentRoute={currentRoute} onNavigate={onNavigate} />

      {/* 3. Desktop Sub-Nav for Tablets & Desktops */}
      <DesktopNav currentRoute={currentRoute} onNavigate={onNavigate} />

      {/* 4. Main Scrollable View Area */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-5 md:py-8 pb-24 md:pb-12">
        {children}
      </main>

      {/* 5. Mobile Bottom Navigation */}
      <BottomNav currentRoute={currentRoute} onNavigate={onNavigate} />
    </div>
  );
};
