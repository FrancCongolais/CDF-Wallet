import React, { useState } from 'react';
import { useWallet } from '../wallet';
import { useTheme, ThemeMode } from '../hooks/useTheme';
import { supabaseService } from '../services/supabase';
import { getTranslations } from '../config/i18n';
import { CDF_CONTRACT_ADDRESS } from '../config/tokens';
import {
  Settings,
  Shield,
  Moon,
  Sun,
  Monitor,
  Eye,
  EyeOff,
  Bell,
  BellOff,
  Clock,
  Lock,
  Unlock,
  Check,
  Cloud,
  ChevronRight,
  Info,
  Trash2,
  ExternalLink,
  Smartphone,
  Sparkles,
} from 'lucide-react';

interface SettingsPageProps {
  onNavigate?: (route: string) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onNavigate }) => {
  const {
    settings,
    updateSettings,
    isUnlocked,
    isPasswordSet,
    lockWallet,
    selectedAccount,
    activeNetwork,
  } = useWallet();

  const { theme, setTheme } = useTheme();

  const [notificationMsg, setNotificationMsg] = useState<{ text: string; type: 'success' | 'info' | 'warning' } | null>(null);
  const [isSyncingSupabase, setIsSyncingSupabase] = useState<boolean>(false);
  const [supabaseSyncStatus, setSupabaseSyncStatus] = useState<string | null>(null);

  const triggerNotice = (text: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setNotificationMsg({ text, type });
    setTimeout(() => {
      setNotificationMsg(null);
    }, 3000);
  };

  // 1. Changement de langue
  const handleLanguageChange = async (lang: 'fr' | 'en') => {
    updateSettings({ language: lang });
    triggerNotice(lang === 'fr' ? 'Langue définie sur Français' : 'Language set to English');
    await syncToSupabase({ language: lang });
  };

  // 2. Changement de thème (Clair / Sombre / Système)
  const handleThemeChange = async (newTheme: ThemeMode) => {
    setTheme(newTheme);
    updateSettings({ theme: newTheme });
    const label = newTheme === 'light' ? 'Mode Clair' : newTheme === 'dark' ? 'Mode Sombre' : 'Mode Système (Automatique)';
    triggerNotice(`Thème appliqué : ${label}`);
    await syncToSupabase({ theme: newTheme });
  };

  // 3. Changement de devise d'affichage (USD / CDF / EUR)
  const handleCurrencyChange = async (curr: 'USD' | 'EUR' | 'CDF') => {
    updateSettings({ currency: curr });
    triggerNotice(`Devise d'affichage modifiée : ${curr}`);
    await syncToSupabase({ currency: curr });
  };

  // 4. Notifications (activées / désactivées)
  const handleToggleNotifications = async () => {
    const nextState = !settings.notificationsEnabled;
    updateSettings({ notificationsEnabled: nextState });
    triggerNotice(nextState ? 'Notifications activées' : 'Notifications désactivées');
    await syncToSupabase({ notificationsEnabled: nextState });
  };

  // 5. Mode Confidentialité (Masquer / Afficher les soldes)
  const handleToggleHideBalances = async () => {
    const nextState = !settings.hideBalances;
    updateSettings({ hideBalances: nextState });
    triggerNotice(
      nextState
        ? 'Mode Confidentialité activé (soldes masqués par défaut)'
        : 'Mode Confidentialité désactivé (soldes visibles)'
    );
    await syncToSupabase({ hideBalances: nextState });
  };

  // 6. Verrouillage automatique (jamais, 1 min, 5 min, 15 min, 30 min)
  const handleAutoLockTimerChange = async (minutes: number) => {
    updateSettings({
      security: {
        ...settings.security,
        autoLockTimerMinutes: minutes,
      },
    });
    const label = minutes === 0 ? 'Désactivé (Jamais)' : `${minutes} minute${minutes > 1 ? 's' : ''}`;
    triggerNotice(`Délai de verrouillage automatique : ${label}`);
    await syncToSupabase({
      security: {
        ...settings.security,
        autoLockTimerMinutes: minutes,
      },
    });
  };

  // 7. Verrouillage manuel immédiat
  const handleLockNow = () => {
    if (!isPasswordSet) {
      triggerNotice('Aucun mot de passe configuré. Rendez-vous dans la page Sécurité.', 'warning');
      return;
    }
    if (!isUnlocked) {
      triggerNotice('Le portefeuille est déjà verrouillé.', 'info');
      return;
    }
    lockWallet();
    triggerNotice('Portefeuille verrouillé avec succès. Mémoire locale purgée.', 'success');
  };

  // Synchronisation sécurisée non-sensible vers Supabase (table user_settings)
  const syncToSupabase = async (partialChange?: Record<string, unknown>) => {
    const mergedSettings = {
      ...settings,
      ...partialChange,
    };
    try {
      const address = selectedAccount?.address || 'local-user';
      const result = await supabaseService.syncUserSettings(address, mergedSettings as any);
      setSupabaseSyncStatus(result.message);
    } catch {
      setSupabaseSyncStatus('Synchronisation locale (cloud hors ligne)');
    }
  };

  const handleManualCloudSync = async () => {
    setIsSyncingSupabase(true);
    setSupabaseSyncStatus('Synchronisation des préférences non-sensibles en cours...');
    try {
      const address = selectedAccount?.address || 'local-user';
      const result = await supabaseService.syncUserSettings(address, settings);
      setSupabaseSyncStatus(result.message);
      triggerNotice(result.message, result.success ? 'success' : 'warning');
    } catch (err) {
      setSupabaseSyncStatus('Erreur de synchronisation');
      triggerNotice('Échec de la synchronisation Supabase', 'warning');
    } finally {
      setIsSyncingSupabase(false);
    }
  };

  const handleResetCache = () => {
    if (confirm('Réinitialiser les caches locaux de démonstration et recharger la page ? Vos clés chiffrées restent protégées.')) {
      localStorage.removeItem('cdf_wallet_demo_transactions');
      localStorage.removeItem('cdf_wallet_balance_cache_v1');
      window.location.reload();
    }
  };

  const t = getTranslations(settings?.language).settings;

  const autoLockOptions = [
    { label: t.autoLockNever, value: 0 },
    { label: t.autoLock1m, value: 1 },
    { label: t.autoLock5m, value: 5 },
    { label: t.autoLock15m, value: 15 },
    { label: t.autoLock30m, value: 30 },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* En-tête de la page */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center ring-1 ring-amber-500/20">
              <Settings className="w-5 h-5" />
            </div>
            <span>{t.title}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t.subtitle}
          </p>
        </div>

        {/* Bouton Verrouiller le Portefeuille Maintenant */}
        <button
          type="button"
          id="btn-settings-lock-now"
          onClick={handleLockNow}
          disabled={!isPasswordSet || !isUnlocked}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
            !isPasswordSet
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed'
              : !isUnlocked
              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 cursor-default'
              : 'bg-rose-500 hover:bg-rose-600 text-white border border-rose-600 active:scale-98'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>{!isUnlocked && isPasswordSet ? t.alreadyLocked : t.lockNow}</span>
        </button>
      </div>

      {/* Notification toast */}
      {notificationMsg && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center gap-2.5 transition-all shadow-sm ${
            notificationMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
              : notificationMsg.type === 'warning'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
              : 'bg-sky-500/10 border-sky-500/30 text-sky-800 dark:text-sky-300'
          }`}
        >
          <Check className="w-4 h-4 shrink-0 text-emerald-500" />
          <span>{notificationMsg.text}</span>
        </div>
      )}

      {/* SECTION 1 : AFFICHAGE & RÉGIONALISATION */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {t.displaySection}
          </h2>
        </div>

        {/* Langue (Français / English) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              {t.languageTitle}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {t.languageDesc}
            </div>
          </div>

          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shrink-0">
            <button
              type="button"
              id="btn-lang-fr"
              onClick={() => handleLanguageChange('fr')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                settings.language === 'fr'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Français
            </button>
            <button
              type="button"
              id="btn-lang-en"
              onClick={() => handleLanguageChange('en')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                settings.language === 'en'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              English
            </button>
          </div>
        </div>

        {/* Thème (Clair / Sombre / Système) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              {t.themeTitle}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {t.themeDesc}
            </div>
          </div>

          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shrink-0">
            <button
              type="button"
              id="btn-theme-light"
              onClick={() => handleThemeChange('light')}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                theme === 'light'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>{t.themeLight}</span>
            </button>
            <button
              type="button"
              id="btn-theme-dark"
              onClick={() => handleThemeChange('dark')}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                theme === 'dark'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>{t.themeDark}</span>
            </button>
            <button
              type="button"
              id="btn-theme-system"
              onClick={() => handleThemeChange('system')}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                theme === 'system'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>{t.themeSystem}</span>
            </button>
          </div>
        </div>

        {/* Devise d'affichage (USD / CDF / EUR) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              {t.currencyTitle}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {t.currencyDesc}
            </div>
          </div>

          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shrink-0">
            {(['USD', 'CDF', 'EUR'] as const).map((currency) => (
              <button
                key={currency}
                type="button"
                id={`btn-curr-${currency.toLowerCase()}`}
                onClick={() => handleCurrencyChange(currency)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  settings.currency === currency
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {currency}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 2 : CONFIDENTIALITÉ & NOTIFICATIONS */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <Eye className="w-4 h-4 text-emerald-500" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {t.privacySection}
          </h2>
        </div>

        {/* Mode Confidentialité (Masquer / Afficher les soldes) */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {t.privacyTitle}
              </span>
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  settings.hideBalances
                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {settings.hideBalances ? t.privacyActive : t.privacyInactive}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {t.privacyDesc}
            </p>
          </div>

          <button
            type="button"
            id="btn-toggle-privacy-mode"
            onClick={handleToggleHideBalances}
            className={`w-14 h-8 rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer shrink-0 ${
              settings.hideBalances ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-700'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-200 flex items-center justify-center text-slate-800 ${
                settings.hideBalances ? 'translate-x-6' : 'translate-x-0'
              }`}
            >
              {settings.hideBalances ? (
                <EyeOff className="w-3.5 h-3.5 text-amber-600" />
              ) : (
                <Eye className="w-3.5 h-3.5 text-slate-400" />
              )}
            </div>
          </button>
        </div>

        {/* Notifications (Activées / Désactivées) */}
        <div className="flex items-start justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {t.notificationsTitle}
              </span>
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  settings.notificationsEnabled
                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {settings.notificationsEnabled ? t.notificationsActive : t.notificationsInactive}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {t.notificationsDesc}
            </p>
          </div>

          <button
            type="button"
            id="btn-toggle-notifications"
            onClick={handleToggleNotifications}
            className={`w-14 h-8 rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer shrink-0 ${
              settings.notificationsEnabled ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-200 flex items-center justify-center text-slate-800 ${
                settings.notificationsEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            >
              {settings.notificationsEnabled ? (
                <Bell className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <BellOff className="w-3.5 h-3.5 text-slate-400" />
              )}
            </div>
          </button>
        </div>
      </div>

      {/* SECTION 3 : VERROUILLAGE AUTOMATIQUE */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <Clock className="w-4 h-4 text-sky-500" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {t.autoLockTitle}
          </h2>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {t.autoLockDesc}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
          {autoLockOptions.map((opt) => {
            const isSelected = settings.security?.autoLockTimerMinutes === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                id={`btn-autolock-${opt.value}`}
                onClick={() => handleAutoLockTimerChange(opt.value)}
                className={`p-3 rounded-2xl text-center border font-bold text-xs transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs ring-1 ring-amber-400'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-500/50'
                }`}
              >
                <div className="font-extrabold">{opt.label}</div>
                <div className="text-[10px] font-normal opacity-80 mt-0.5">
                  {opt.value === 0 ? (settings.language === 'en' ? 'Disabled' : 'Désactivé') : (settings.language === 'en' ? 'Inactivity' : 'Inactivité')}
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-900 dark:text-sky-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-sky-500 shrink-0" />
            <span>
              {settings.language === 'en' ? (
                <>Recommendation: <strong>5 minutes</strong> provides optimal balance between ease-of-use and security.</>
              ) : (
                <>Recommandation : <strong>5 minutes</strong> garantit un équilibre optimal entre confort et sécurité.</>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 4 : SYNCHRONISATION SUPABASE (user_settings) */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-emerald-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t.cloudSyncSection}
            </h2>
          </div>
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            {supabaseService.isConnected() ? 'Supabase Connecté' : 'Stockage Local'}
          </span>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          {t.cloudSyncDesc}
        </p>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Garantie Non-Custodiale :</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              Zéro clé privée · Zéro seed phrase · Zéro mot de passe
            </span>
          </div>
          {supabaseSyncStatus && (
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
              <span className="text-slate-400">Dernier statut :</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">{supabaseSyncStatus}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            id="btn-sync-supabase-now"
            onClick={handleManualCloudSync}
            disabled={isSyncingSupabase}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors shadow-2xs cursor-pointer"
          >
            <Cloud className={`w-3.5 h-3.5 ${isSyncingSupabase ? 'animate-spin text-amber-500' : 'text-emerald-500'}`} />
            <span>{isSyncingSupabase ? t.cloudSyncing : t.cloudSyncBtn}</span>
          </button>
        </div>
      </div>

      {/* SECTION 5 : ACCÈS RAPIDES (SÉCURITÉ & À PROPOS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Accès vers /security */}
        <div
          id="card-access-security"
          onClick={() => onNavigate?.('/security')}
          className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500/40 shadow-sm transition-all cursor-pointer group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center ring-1 ring-amber-500/20 group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5" />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 transition-colors" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors">
              {t.securityShortcutTitle}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t.securityShortcutDesc}
            </p>
          </div>
          <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <span>{t.openSecurity}</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>

        {/* Accès vers /about */}
        <div
          id="card-access-about"
          onClick={() => onNavigate?.('/about')}
          className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500/40 shadow-sm transition-all cursor-pointer group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center ring-1 ring-slate-200 dark:ring-slate-700 group-hover:scale-105 transition-transform">
              <Info className="w-5 h-5 text-amber-500" />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 transition-colors" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors">
              {t.aboutShortcutTitle}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t.aboutShortcutDesc}
            </p>
          </div>
          <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 group-hover:text-amber-500 flex items-center gap-1">
            <span>{t.openAbout}</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* SECTION 6 : GESTION DES CACHES LOCAUX */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-sm font-bold text-slate-900 dark:text-white">
            Cache et Données Locales
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Purge les données de simulation locales temporaires sans affecter vos comptes chiffrés.
          </div>
        </div>

        <button
          type="button"
          id="btn-clear-demo-cache"
          onClick={handleResetCache}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition-colors cursor-pointer shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Vider les caches locaux</span>
        </button>
      </div>
    </div>
  );
};
