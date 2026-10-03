/**
 * Storage non-sensible pour les préférences de l'application CDF Wallet
 * ATTENTION : Ne jamais utiliser ce module pour stocker des clés privées ou des seed phrases !
 */

import { UserSettings, WalletAccount, Transaction, TransactionStatus, AppNotification, UserProfile, KycData, MerchantQr } from '../types';
import { MONTHLY_LIMITS } from '../config/tokens';

const memoryStorage = new Map<string, string>();

const safeStorage = {
  getItem(key: string): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        // Ignore
      }
    }
    return memoryStorage.get(key) ?? null;
  },
  setItem(key: string, value: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // Ignore
      }
    }
    memoryStorage.set(key, value);
  },
  removeItem(key: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Ignore
      }
    }
    memoryStorage.delete(key);
  },
};

const STORAGE_KEYS = {
  SETTINGS: 'cdf_wallet_user_settings_v1',
  SELECTED_NETWORK: 'cdf_wallet_network_v1',
  ONBOARDING_COMPLETED: 'cdf_wallet_onboarding_done_v1',
  DEMO_MODE: 'cdf_wallet_demo_mode_v1',
  ACCOUNTS_LIST: 'cdf_wallet_accounts_meta_v1',
  SELECTED_ACCOUNT_ADDR: 'cdf_wallet_selected_addr_v1',
  REAL_TRANSACTIONS: 'cdf_wallet_real_txs_v1',
};

export const ALLOWED_LANGUAGES = ['fr', 'en'] as const;
export const ALLOWED_THEMES = ['light', 'dark', 'system'] as const;
export const ALLOWED_CURRENCIES = ['USD', 'CDF', 'EUR'] as const;
export const ALLOWED_AUTO_LOCK_TIMERS = [0, 1, 5, 15, 30] as const;

export const DEFAULT_USER_SETTINGS: UserSettings = {
  currency: 'USD',
  language: 'fr',
  theme: 'dark',
  notificationsEnabled: true,
  hideBalances: false,
  security: {
    autoLockTimerMinutes: 5,
    biometricsEnabled: false,
    requirePinForTransfers: true,
    analyticsEnabled: false,
  },
  customRpcEndpoints: {},
};

export const AppStorage = {
  getSettings(): UserSettings {
    try {
      const data = safeStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!data) return DEFAULT_USER_SETTINGS;
      const parsed = JSON.parse(data);
      return {
        ...DEFAULT_USER_SETTINGS,
        ...parsed,
        currency: ALLOWED_CURRENCIES.includes(parsed.currency) ? parsed.currency : DEFAULT_USER_SETTINGS.currency,
        language: ALLOWED_LANGUAGES.includes(parsed.language) ? parsed.language : DEFAULT_USER_SETTINGS.language,
        theme: ALLOWED_THEMES.includes(parsed.theme) ? parsed.theme : DEFAULT_USER_SETTINGS.theme,
        security: {
          ...DEFAULT_USER_SETTINGS.security,
          ...(parsed.security || {}),
          autoLockTimerMinutes: ALLOWED_AUTO_LOCK_TIMERS.includes(parsed.security?.autoLockTimerMinutes)
            ? parsed.security.autoLockTimerMinutes
            : DEFAULT_USER_SETTINGS.security.autoLockTimerMinutes,
        },
      };
    } catch {
      return DEFAULT_USER_SETTINGS;
    }
  },

  saveSettings(settings: UserSettings): void {
    try {
      const sanitizedSettings: UserSettings = {
        ...settings,
        currency: ALLOWED_CURRENCIES.includes(settings.currency as any)
          ? settings.currency
          : DEFAULT_USER_SETTINGS.currency,
        language: ALLOWED_LANGUAGES.includes(settings.language as any)
          ? settings.language
          : DEFAULT_USER_SETTINGS.language,
        theme: ALLOWED_THEMES.includes(settings.theme as any)
          ? settings.theme
          : DEFAULT_USER_SETTINGS.theme,
        security: {
          ...DEFAULT_USER_SETTINGS.security,
          ...(settings.security || {}),
          autoLockTimerMinutes: ALLOWED_AUTO_LOCK_TIMERS.includes(settings.security?.autoLockTimerMinutes as any)
            ? settings.security.autoLockTimerMinutes
            : DEFAULT_USER_SETTINGS.security.autoLockTimerMinutes,
        },
      };
      safeStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(sanitizedSettings));
    } catch (e) {
      console.warn('Erreur de sauvegarde des paramètres dans le stockage local', e);
    }
  },

  hasCompletedOnboarding(): boolean {
    try {
      return safeStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED) === 'true';
    } catch {
      return false;
    }
  },

  setOnboardingCompleted(completed: boolean): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, completed ? 'true' : 'false');
    } catch {
      // Ignore
    }
  },

  isDemoModeActive(): boolean {
    try {
      const val = safeStorage.getItem(STORAGE_KEYS.DEMO_MODE);
      if (val !== null) {
        return val === 'true';
      }
      const envDemo = typeof process !== 'undefined' && process.env?.VITE_DEMO_MODE
        ? process.env.VITE_DEMO_MODE
        : typeof import.meta !== 'undefined' && (import.meta as any).env
        ? ((import.meta as any).env.VITE_DEMO_MODE ?? (import.meta as any).env.VITE_ENABLE_DEMO_MODE)
        : undefined;
      if (envDemo !== undefined) {
        return envDemo === 'true';
      }
      return true; // Par défaut en mode démo
    } catch {
      return true;
    }
  },

  setDemoMode(active: boolean): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.DEMO_MODE, active ? 'true' : 'false');
    } catch {
      // Ignore
    }
  },

  getAccounts(): WalletAccount[] {
    try {
      const data = safeStorage.getItem(STORAGE_KEYS.ACCOUNTS_LIST);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveAccounts(accounts: WalletAccount[]): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.ACCOUNTS_LIST, JSON.stringify(accounts));
    } catch (e) {
      console.warn('Erreur sauvegarde des métadonnées de comptes', e);
    }
  },

  getSelectedAccountAddress(): string | null {
    try {
      return safeStorage.getItem(STORAGE_KEYS.SELECTED_ACCOUNT_ADDR);
    } catch {
      return null;
    }
  },

  setSelectedAccountAddress(address: string | null): void {
    try {
      if (address) {
        safeStorage.setItem(STORAGE_KEYS.SELECTED_ACCOUNT_ADDR, address);
      } else {
        safeStorage.removeItem(STORAGE_KEYS.SELECTED_ACCOUNT_ADDR);
      }
    } catch {
      // Ignore
    }
  },

  getRealTransactions(accountAddress?: string): Transaction[] {
    try {
      const data = safeStorage.getItem(STORAGE_KEYS.REAL_TRANSACTIONS);
      if (!data) return [];
      const all: Transaction[] = JSON.parse(data);
      if (!accountAddress) return all;
      return all.filter(
        (tx) =>
          tx.fromAddress.toLowerCase() === accountAddress.toLowerCase() ||
          tx.toAddress.toLowerCase() === accountAddress.toLowerCase()
      );
    } catch {
      return [];
    }
  },

  saveRealTransaction(tx: Transaction): void {
    try {
      const existing = this.getRealTransactions();
      const filtered = existing.filter((item) => item.id !== tx.id && (!tx.hash || item.hash !== tx.hash));
      const updated = [tx, ...filtered];
      safeStorage.setItem(STORAGE_KEYS.REAL_TRANSACTIONS, JSON.stringify(updated.slice(0, 100)));
    } catch (e) {
      console.warn('Erreur de sauvegarde de transaction réelle locale', e);
    }
  },

  updateRealTransactionStatus(hash: string, status: TransactionStatus): void {
    try {
      const existing = this.getRealTransactions();
      const updated = existing.map((tx) => (tx.hash === hash ? { ...tx, status } : tx));
      safeStorage.setItem(STORAGE_KEYS.REAL_TRANSACTIONS, JSON.stringify(updated));
    } catch (e) {
      console.warn('Erreur mise à jour statut transaction', e);
    }
  },

  // =========================================================================
  // CACHE LOCAL SÉCURISÉ DES NOTIFICATIONS (NON-SENSIBLE & ASSOCIÉ À L'UTILISATEUR)
  // =========================================================================
  getNotifications(userId: string): AppNotification[] {
    if (!userId) return [];
    try {
      const key = `cdf_wallet_notifications_user_${userId.toLowerCase()}`;
      const data = safeStorage.getItem(key);
      if (!data) return [];
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((n) => n.user_id && n.user_id.toLowerCase() === userId.toLowerCase());
    } catch {
      return [];
    }
  },

  saveNotifications(userId: string, notifications: AppNotification[]): void {
    if (!userId) return;
    try {
      const key = `cdf_wallet_notifications_user_${userId.toLowerCase()}`;
      const sanitized = notifications
        .filter((n) => n.user_id && n.user_id.toLowerCase() === userId.toLowerCase())
        .slice(0, 100);
      safeStorage.setItem(key, JSON.stringify(sanitized));
    } catch (e) {
      console.warn('Erreur sauvegarde des notifications locales', e);
    }
  },

  clearNotifications(userId: string): void {
    if (!userId) return;
    try {
      const key = `cdf_wallet_notifications_user_${userId.toLowerCase()}`;
      safeStorage.removeItem(key);
    } catch {
      // Ignore
    }
  },

  clearAllNotificationCaches(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith('cdf_wallet_notifications_user_')) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => safeStorage.removeItem(k));
      }
    } catch {
      // Ignore
    }
  },

  // =========================================================================
  // PROFIL UTILISATEUR & ÉTAT D'ACTIVATION (Formulaire 12 étapes)
  // =========================================================================
  getUserProfile(): UserProfile | null {
    try {
      const data = safeStorage.getItem('cdf_wallet_user_profile_v1');
      if (!data) return null;
      return JSON.parse(data);
    } catch {
      return null;
    }
  },

  saveUserProfile(profile: UserProfile): void {
    try {
      safeStorage.setItem('cdf_wallet_user_profile_v1', JSON.stringify(profile));
    } catch (e) {
      console.warn('Erreur sauvegarde profil utilisateur', e);
    }
  },

  // =========================================================================
  // VÉRIFICATION D'IDENTITÉ (KYC)
  // =========================================================================
  getKycData(): KycData {
    try {
      const data = safeStorage.getItem('cdf_wallet_kyc_data_v1');
      if (!data) {
        return {
          documentType: 'id_card',
          status: 'none',
        };
      }
      return JSON.parse(data);
    } catch {
      return {
        documentType: 'id_card',
        status: 'none',
      };
    }
  },

  saveKycData(kyc: KycData): void {
    try {
      safeStorage.setItem('cdf_wallet_kyc_data_v1', JSON.stringify(kyc));
    } catch (e) {
      console.warn('Erreur sauvegarde KYC', e);
    }
  },

  // =========================================================================
  // SUIVI DU PLAFOND MENSUEL SORTANT (500 $ sans KYC / 200 000 $ avec KYC)
  // Réinitialisation automatique le 1er de chaque mois
  // =========================================================================
  getMonthlySpentInfo(address?: string): {
    spentUsd: number;
    limitUsd: number;
    remainingUsd: number;
    isVerified: boolean;
    monthKey: string;
  } {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const storageKey = `cdf_wallet_monthly_spent_${monthKey}_${(address || 'global').toLowerCase()}`;

    let spentUsd = 0;
    try {
      const raw = safeStorage.getItem(storageKey);
      if (raw) {
        const val = parseFloat(raw);
        if (!isNaN(val) && val >= 0) spentUsd = val;
      }
    } catch {
      spentUsd = 0;
    }

    const kyc = this.getKycData();
    const isVerified = kyc.status === 'verified';
    const limitUsd = isVerified ? MONTHLY_LIMITS.verifiedUsd : MONTHLY_LIMITS.unverifiedUsd;
    const remainingUsd = Math.max(0, limitUsd - spentUsd);

    return {
      spentUsd,
      limitUsd,
      remainingUsd,
      isVerified,
      monthKey,
    };
  },

  recordMonthlySpent(amountUsd: number, address?: string): void {
    if (isNaN(amountUsd) || amountUsd <= 0) return;
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const storageKey = `cdf_wallet_monthly_spent_${monthKey}_${(address || 'global').toLowerCase()}`;

    try {
      let current = 0;
      const raw = safeStorage.getItem(storageKey);
      if (raw) {
        const val = parseFloat(raw);
        if (!isNaN(val) && val >= 0) current = val;
      }
      safeStorage.setItem(storageKey, (current + amountUsd).toString());
    } catch (e) {
      console.warn('Erreur enregistrement volume mensuel', e);
    }
  },

  // =========================================================================
  // MES QR (TARIFS COMMERÇANTS & TRANSPORTS)
  // =========================================================================
  getMerchantQrs(): MerchantQr[] {
    try {
      const data = safeStorage.getItem('cdf_wallet_merchant_qrs_v1');
      if (!data) {
        // Pré-remplir avec un exemple par défaut pour le transport
        const defaultQrs: MerchantQr[] = [
          {
            id: 'qr-sample-transport-1',
            title: 'Course Taxi-Bus Centre-Ville',
            category: 'transport',
            amountUsd: 1.5,
            merchantAddress: '0x0E9dBe33a4fb33Fc9e6595A154538D721965401b',
            notes: 'Paiement direct en CDF ou BNB',
            createdAt: Date.now() - 86400000,
          },
          {
            id: 'qr-sample-commerce-2',
            title: 'Menu Déjeuner Express',
            category: 'commerce',
            amountUsd: 5.0,
            merchantAddress: '0x0E9dBe33a4fb33Fc9e6595A154538D721965401b',
            notes: 'Restaurant / Snack',
            createdAt: Date.now() - 43200000,
          },
        ];
        return defaultQrs;
      }
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveMerchantQr(qr: MerchantQr): void {
    try {
      const list = this.getMerchantQrs().filter((q) => q.id !== qr.id);
      const updated = [qr, ...list];
      safeStorage.setItem('cdf_wallet_merchant_qrs_v1', JSON.stringify(updated.slice(0, 50)));
    } catch (e) {
      console.warn('Erreur sauvegarde QR commerçant', e);
    }
  },

  deleteMerchantQr(id: string): void {
    try {
      const list = this.getMerchantQrs().filter((q) => q.id !== id);
      safeStorage.setItem('cdf_wallet_merchant_qrs_v1', JSON.stringify(list));
    } catch (e) {
      console.warn('Erreur suppression QR commerçant', e);
    }
  },
};

